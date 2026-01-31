import { ProcessorResponse, HighlightOptions, SourceType, WritingStyle, FaqItem, ReadingLevel } from '../types';
import { GoogleGenAI } from "@google/genai";
import * as ReadabilityMod from '@mozilla/readability';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// --- Global Declaration for Puter ---
declare const puter: any;

// --- Robust Import Handling ---
const Readability = (ReadabilityMod as any).Readability || (ReadabilityMod as any).default || ReadabilityMod;

// --- PDF.js Configuration ---
let pdfModule: any = pdfjsLib;
if (!pdfModule.GlobalWorkerOptions && pdfModule.default) {
  pdfModule = pdfModule.default;
}
if (pdfModule.GlobalWorkerOptions) {
  pdfModule.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const STYLE_INSTRUCTIONS: Record<WritingStyle, string> = {
    normal: "Writing Style: Direct, narrative, and journalistic (Medium.com quality). No meta-introductions.",
    learning: "Writing Style: Didactic but direct. Explain like a mentor.",
    concise: "Writing Style: Extremely factual and to the point. Short sentences.",
    explanatory: "Writing Style: Deep dive narrative. Use metaphors for context.",
    formal: "Writing Style: Business-like and objective."
};

const LEVEL_INSTRUCTIONS: Record<ReadingLevel, string> = {
    beginner: "Target Audience: Beginner. Use simple vocabulary (A2/B1), short sentences, and explain every concept clearly.",
    intermediate: "Target Audience: Intermediate. Use standard professional vocabulary. Assume basic knowledge but explain nuances.",
    expert: "Target Audience: Expert. Use technical jargon where appropriate. Focus on high-level synthesis and complex details."
};

// --- HELPER: CLEAN MARKDOWN ARTIFACTS ---
function cleanMarkdownArtifacts(html: string): string {
    return html
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/## (.*?)(<br>|<\/p>|\n)/g, '<h2>$1</h2>')
        .replace(/__ (.*?)\n/g, '<h2>$1</h2>')
        .replace(/__(.*?)__/g, '<i>$1</i>')
        .replace(/^- (.*?)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '<p></p>')
        .replace(/\[Image \d+\]/gi, '')
        .replace(/\[Photo \d+\]/gi, '')
        .replace(/\[Score \d+\]/gi, ''); 
}

// --- System Instruction (The Brain) ---
// Note: This instruction is strictly for Article Generation, not the Chatbot.
const getSmartReadingInstruction = (style: WritingStyle, level: ReadingLevel, targetLanguage: string, sourceName?: string) => `
You are an expert editor. Your task is to extract the CORE content from the provided source text and rewrite it into a clean HTML article.

**CRITICAL RULES:**
1. **LANGUAGE:** You MUST write the output article in **${targetLanguage}**, regardless of the source language. Translate if necessary.
2. **STRICT CONTENT EXTRACTION - COOKIE WALL BYPASS:**
   - Websites often hide content behind cookie banners or "consent" text in the main extraction.
   - **MANDATORY CHECK:** Look at the 'RAW VISUALS' / 'RAW HTML' section of the prompt. The real article text is often there, even if 'SOURCE CONTEXT' is just "Accept Cookies".
   - **IGNORE** legal text, privacy policies, and "click to continue".
   - **EXTRACT** the actual news story, blog post, or report.
   - Only output "Content Unavailable" if the 'RAW VISUALS' section ALSO contains no content (e.g., 403 Forbidden).
3. **HIGHLIGHTING (ARCERING):** You MUST identify the 3-5 most significant facts or key sentences in the text. Wrap these sentences in double equals signs like this: ==This is a key fact that should be highlighted.==
4. **GLOSSARY TERMS (MANDATORY & EXTENSIVE):** 
   - Identify **15-25 specific Entities** to ensure the reader understands the context without needing Google.
   - **TARGET CATEGORIES:**
     - **Geography:** Specific cities (e.g., Carthage, Rome), Regions (Gaul, Iberia), Rivers (Rhône, Ebro), Mountains (Pyrenees, Alps).
     - **Key Figures:** Generals (Hannibal, Scipio), Rulers (Hamilcar Barca), Historians (Polybius).
     - **Events:** Wars (First/Second Punic War), Battles (Cannae), Treaties.
     - **Technical Terms:** Military formations, political systems (Republic, Senate).
   - **DO NOT** target common words.
   - Wrap the **first occurrence** of each term in: \`<span class="explain-term" data-def="Short, simple definition in ${targetLanguage}">Term</span>\`.
5. **HTML ONLY:** Output pure HTML. No Markdown. Use <h2>, <p>, <ul>, <li>, <b>, <blockquote>, <span class="explain-term">.

**MEDIA HANDLING:**
- Use the provided <iframe> tags if they contain charts or data.
- Use the provided <img> tags if they are relevant photos.
- Format: \`<figure><img src="..." alt="..."><figcaption>...</figcaption></figure>\`

**STRUCTURE:**
1. \`<citation>...</citation>\` (Source name/URL)
2. \`<h1>Title</h1>\` (Translate title to ${targetLanguage})
3. \`<figure>...</figure>\` (Hero Image)
4. Body Text (With ==highlights== and <span class="explain-term">terms</span>).
5. \`<faq_section>\` (REQUIRED: Generate 3-5 frequently asked questions and answers based on the article content. Format: <faq_item><question>...</question><answer>...</answer></faq_item>).

**STYLE:** ${STYLE_INSTRUCTIONS[style]}
**COMPLEXITY:** ${LEVEL_INSTRUCTIONS[level]}
`;

// --- APP KNOWLEDGE BASE (For the AI Chatbot only) ---
const APP_KNOWLEDGE_BASE = `
### ABOUT MEDIUMCLONE
... (Same as before) ...
`;

// --- Helper: Fetch URL Content ---
async function fetchRawUrlHtml(url: string): Promise<string> {
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.text();
  } catch (e) {
    console.error("URL Fetch Error", e);
    throw new Error("Could not load URL. The website might be blocking access.");
  }
}

// --- Helper: Extract Rich Media ---
function extractRichMedia(html: string, baseUrlStr: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let mediaLog = "";

    const isJunkImage = (src: string, alt: string, className: string, width: number | null) => {
        const lowerSrc = src.toLowerCase();
        const lowerAlt = alt.toLowerCase();
        const lowerClass = className.toLowerCase();
        const junkKeywords = ['logo', 'icon', 'banner', 'button', 'profile', 'avatar', 'adserver', 'doubleclick', 'tracker', 'pixel', 'footer', 'header', 'social', 'spacer', 'transparent'];
        if (junkKeywords.some(k => lowerSrc.includes(k) || lowerClass.includes(k) || lowerAlt.includes(k))) return true;
        if (width && width < 200) return true; 
        return false;
    };

    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
        let src = ogImage.getAttribute('content');
        if (src) {
             if (!src.startsWith('http')) src = new URL(src, baseUrlStr).href;
             mediaLog += `[HERO IMAGE CANDIDATE]: <img src="${src}" alt="Main Article Image" />\n\n`;
        }
    }

    const iframes = doc.querySelectorAll('iframe');
    iframes.forEach((iframe, i) => {
        let src = iframe.getAttribute('src');
        if (src) {
            if (!src.startsWith('http')) src = new URL(src, baseUrlStr).href;
            if (!src.includes('googlesyndication') && !src.includes('doubleclick')) {
                mediaLog += `[LIVE DATA/EMBED ${i + 1}]: <iframe src="${src}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>\n\n`;
            }
        }
    });

    const videos = doc.querySelectorAll('video');
    videos.forEach((video, i) => {
        let src = video.getAttribute('src') || video.querySelector('source')?.getAttribute('src');
        if (src) {
             if (!src.startsWith('http')) src = new URL(src, baseUrlStr).href;
             mediaLog += `[NATIVE VIDEO ${i + 1}]: <video src="${src}" controls></video>\n\n`;
        }
    });

    doc.querySelectorAll('img').forEach((img, i) => {
        let src = img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        const className = img.className || '';
        const width = img.getAttribute('width') ? parseInt(img.getAttribute('width')!) : null;
        if (src) {
            if (!src.startsWith('http') && !src.startsWith('data:')) {
                try { src = new URL(src, baseUrlStr).href; } catch(e) { return; }
            }
            if (!isJunkImage(src, alt, className, width)) {
                mediaLog += `[CONTENT PHOTO ${i+1} (Alt: "${alt}")]: <img src="${src}" alt="${alt}" />\n`;
            }
        }
    });

    return mediaLog;
}

export const translateHtml = async (html: string, targetLanguage: string): Promise<string> => {
  const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the text content of the following HTML to ${targetLanguage}. Keep ALL tags/classes, especially <span class="explain-term" data-def="..."> and <img> and <mark>. HTML: ${html.substring(0, 30000)}`
    });
    return response.text || html;
  } catch (error) { return html; }
};

export const askAiAboutArticle = async (fullText: string, question: string, mode: 'chat' | 'summary' = 'chat'): Promise<string> => {
    const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
    if (!apiKey) return "API Key missing.";
    const ai = new GoogleGenAI({ apiKey });
    const context = fullText.replace(/<[^>]+>/g, ' '); 
    const prompt = mode === 'summary' 
        ? `Provide a concise, 3-bullet point summary. Use HTML <ul>/<li>. Text: ${context.substring(0, 500000)}`
        : `${APP_KNOWLEDGE_BASE} \n\n ### CURRENT ARTICLE CONTENT \n ${context.substring(0, 500000)} \n\n ### USER QUESTION \n "${question}" \n\n ### INSTRUCTIONS \n Answer the user's question using the article or app knowledge. Use HTML.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "No response generated.";
    } catch (e) {
        return "I couldn't generate a response at this time.";
    }
};

export const splitTextIntoChunks = (text: string, maxChars: number = 4000): string[] => {
    const chunks: string[] = [];
    const paragraphs = text.split(/(?:\r\n|\r|\n)+/);
    let currentChunk = "";
    for (const para of paragraphs) {
        if ((currentChunk.length + para.length + 2) <= maxChars) {
            currentChunk += (currentChunk ? "\n\n" : "") + para;
        } else {
            if (currentChunk) { chunks.push(currentChunk); currentChunk = ""; }
            if (para.length > maxChars) {
                const sentences = para.match(/[^.!?]+[.!?]+(\s+|$)/g) || [para];
                for (const sentence of sentences) {
                    if ((currentChunk.length + sentence.length) <= maxChars) { currentChunk += sentence; } 
                    else { if (currentChunk) chunks.push(currentChunk); currentChunk = sentence; }
                }
            } else { currentChunk = para; }
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
};

export const fetchAudioForChunk = async (text: string): Promise<HTMLAudioElement> => {
  const openAIKey = (window as any).process?.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (openAIKey) {
    try {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Authorization": `Bearer ${openAIKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "tts-1", input: text, voice: "alloy", response_format: "mp3" }),
        });
        if (!response.ok) throw new Error("TTS Error");
        const blob = await response.blob();
        return new Audio(URL.createObjectURL(blob));
    } catch (e) {}
  }
  return await puter.ai.txt2speech(text);
};

export const processSource = async (
  type: SourceType, 
  source: string, 
  options: HighlightOptions,
  style: WritingStyle = 'normal',
  customPrompt?: string,
  sourceName?: string,
  readingLevel: ReadingLevel = 'intermediate',
  targetLanguage: string = 'English'
): Promise<ProcessorResponse> => {
  
  const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
  if (!apiKey) return { id: 'error', title: "Config Error", content: "<p>API Key missing.</p>", excerpt: "", sourceType: type };

  const ai = new GoogleGenAI({ apiKey });
  let fullTextContext = "";
  let rawContext = "";
  let availableMedia = "";
  let title = "Article";

  try {
    if (type === 'pdf') {
        const base64Data = source.split(',')[1] || source;
        const pdfData = await pdfModule.getDocument({ data: atob(base64Data) }).promise;
        let extractedText = "";
        for (let i = 1; i <= pdfData.numPages; i++) {
            const page = await pdfData.getPage(i);
            const textContent = await page.getTextContent();
            extractedText += textContent.items.map((item: any) => item.str).join(' ') + "\n\n";
            if (i <= 10) {
                try {
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height; canvas.width = viewport.width;
                    if (context) {
                        await page.render({ canvasContext: context, viewport: viewport }).promise;
                        const imgData = canvas.toDataURL('image/jpeg', 0.8); 
                        rawContext += `<div class="pdf-page-visual"><p>Page ${i}:</p><img src="${imgData}" style="width:100%; border:1px solid #eee;" /></div>`;
                    }
                } catch (e) {}
            }
        }
        fullTextContext = extractedText;
        if (!rawContext) rawContext = "PDF Source";
        title = sourceName?.replace('.pdf', '') || "PDF";
    } else if (type === 'docx') {
        const base64Data = source.split(',')[1] || source;
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        rawContext = result.value;
        fullTextContext = result.value.replace(/<[^>]+>/g, ' ');
        title = sourceName?.replace('.docx', '') || "Document";
    } else if (type === 'html') {
         rawContext = source.startsWith('data:') ? atob(source.split(',')[1]) : source;
         availableMedia = extractRichMedia(rawContext, "https://example.com"); 
         fullTextContext = rawContext.replace(/<[^>]+>/g, ' ');
         title = sourceName?.replace('.html', '') || "HTML";
    } else {
        const rawHtml = await fetchRawUrlHtml(source);
        const doc = new DOMParser().parseFromString(rawHtml, "text/html");
        availableMedia = extractRichMedia(rawHtml, source);
        try {
          const baseUrl = new URL(source);
          doc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) img.src = new URL(src, baseUrl.href).href;
          });
        } catch(e) {}
        const reader = new Readability(doc);
        const article = reader.parse();
        rawContext = doc.body.innerHTML; 
        fullTextContext = article ? article.content : doc.body.innerText;
        if (article?.title) title = article.title;
        if (!sourceName) sourceName = source; 
    }

    const promptStructure = `
### SOURCE CONTEXT (PARSED TEXT)
${fullTextContext.substring(0, 1500000)} 

### RAW HTML VISUALS (FALLBACK FOR COOKIE WALLS)
${rawContext.substring(0, 500000)}

### AVAILABLE MEDIA
${availableMedia.substring(0, 50000)}

### KEYWORDS
${options.keywords.join(", ")}

### EXTRA FOCUS
${customPrompt || "None"}

TASK: Rewrite the source content into an article in ${targetLanguage}.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: getSmartReadingInstruction(style, readingLevel, targetLanguage, sourceName),
        temperature: 0.1,
        topP: 0.9,
      },
      contents: promptStructure
    });

    let generatedHtml = response.text || "<p>Could not generate content.</p>";
    generatedHtml = cleanMarkdownArtifacts(generatedHtml);

    let citation = "";
    const citationMatch = generatedHtml.match(/<citation>(.*?)<\/citation>/s);
    if (citationMatch) { citation = citationMatch[1].trim(); generatedHtml = generatedHtml.replace(/<citation>.*?<\/citation>/gs, ''); }

    let topQuestions: FaqItem[] = [];
    const faqMatch = generatedHtml.match(/<faq_section>(.*?)<\/faq_section>/s);
    if (faqMatch) {
        const items = faqMatch[1].split('</faq_item>');
        items.forEach(item => {
            const q = item.match(/<question>(.*?)<\/question>/s);
            const a = item.match(/<answer>(.*?)<\/answer>/s);
            if (q && a) topQuestions.push({ question: q[1].trim(), answer: a[1].trim() });
        });
        generatedHtml = generatedHtml.replace(/<faq_section>.*?<\/faq_section>/s, '');
    }

    // Apply Highlighting Style to ==matches==
    generatedHtml = generatedHtml.replace(/==(.*?)==/g, `<mark style="background-color: ${options.color}; color: inherit; padding: 0 4px; border-radius: 4px; box-decoration-break: clone; -webkit-box-decoration-break: clone;">$1</mark>`);

    // Inject unique IDs into H2 tags for Table of Contents
    generatedHtml = generatedHtml.replace(/<h2>(.*?)<\/h2>/g, (match, content) => {
        const plainText = content.replace(/<[^>]+>/g, '');
        const id = plainText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return `<h2 id="${id}">${content}</h2>`;
    });

    const titleMatch = generatedHtml.match(/<h1.*?>(.*?)<\/h1>/);
    if (titleMatch) { title = titleMatch[1]; generatedHtml = generatedHtml.replace(/<h1.*?>.*?<\/h1>/, ''); }

    const plainText = generatedHtml.replace(/<[^>]+>/g, '');
    const summary = plainText.substring(0, 300) + "...";
    let thumbnailUrl = "";
    const imgMatch = generatedHtml.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) thumbnailUrl = imgMatch[1];

    return {
      id: Date.now().toString(),
      title: title,
      content: generatedHtml,
      excerpt: summary,
      summary: `Smart-Read: ${style}. ${customPrompt}`,
      sourceType: type,
      sourceUrl: type === 'url' ? source : 'Uploaded Document',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      readTime: `${Math.max(1, Math.ceil(plainText.split(' ').length / 200))} min read`,
      thumbnailUrl: thumbnailUrl,
      citation: citation,
      topQuestions: topQuestions
    };

  } catch (error) {
    console.error("Processing Failed", error);
    return { id: 'error', title: "Error", content: `<p>${(error as Error).message}</p>`, excerpt: "Error", sourceType: type };
  }
};