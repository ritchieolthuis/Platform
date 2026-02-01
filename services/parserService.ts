
import { ProcessorResponse, HighlightOptions, SourceType, WritingStyle, FaqItem, ReadingLevel, Citation, Quiz, QuizQuestion } from '../types';
import { GoogleGenAI, Type, Modality } from "@google/genai";
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

const DEMO_CONTENT: Record<string, string> = {
    "https://news.un.org/en/story/2026/01/1160452": `<h1>UN Experts Warn of Global Job Displacement Risks in 2026</h1><figure><img src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80" alt="AI Future" /><figcaption>Global labor markets face unprecedented shifts.</figcaption></figure><p><b>GENEVA, 15 January 2026</b> — A new report by UN experts highlights the accelerating impact of autonomous systems on the global workforce. The report suggests that by late <b>2026</b>, nearly 15% of traditional administrative roles may be fully automated. However, new sectors in "Human-Centric Review" and "AI Ethics Compliance" are growing faster than anticipated.</p><h2>Key Findings</h2><ul><li>Automation is shifting from manufacturing to creative services.</li><li>Reskilling programs are lagging behind technological adoption curves.</li></ul><p>Dr. Elena <b>Voss</b>, lead author, stated: "The challenge isn't the technology, it's the transition period we are entering this year."</p>`,
    "https://www.youtube.com/watch?v=LXb3EKWsInQ": `<h1>The Tiny Tech Revolutionizing What We Know About Biology</h1><p>Nanotechnology is allowing biologists to observe cellular processes in real-time at a resolution never before possible. This video explores the new "Bio-Nano" lenses developed in <b>2025</b> that act as windows into the atomic structures of living cells.</p>`,
    "https://doi.org/10.1016/j.scib.2026.01.031": `<h1>Chinese Astronomers Trace Origin of Fast Radio Bursts</h1><figure><img src="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80" alt="Space Telescope" /></figure><p><b>BEIJING</b> — A team using the FAST telescope has pinpointed the source of a repeating Fast Radio Burst (FRB) to a magnetar in a neighboring dwarf galaxy. The signal, identified as FRB-2026-A, repeats on a 16-day cycle, confirming theories proposed back in <b>2020</b> regarding magnetar precession.</p>`,
    "https://laist.com/news/tiktok-at-the-grammys-2026": `<h1>TikTok Dominates 2026 Grammy Best New Artist Nominations</h1><figure><img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80" alt="Music Studio" /></figure><p>For the first time in history, all nominees for Best New Artist gained their initial traction via viral TikTok snippets. The shift marks a definitive end to the "Radio First" era of music discovery. Analysts predict that by <b>2027</b>, social discovery will account for 90% of new artist break-outs.</p>`
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
const getSmartReadingInstruction = (style: WritingStyle, level: ReadingLevel, targetLanguage: string, sourceName?: string) => `
You are an expert editor. Your task is to extract the CORE content from the provided source text and rewrite it into a clean HTML article.

**CRITICAL RULES:**
1. **LANGUAGE:** You MUST write the output article in **${targetLanguage}**.
2. **STRICT CONTENT EXTRACTION:** Bypass cookie walls and legal text. Extract the actual story.
3. **HIGHLIGHTING:** Identify 3-5 key facts. Wrap them in ==...==.
4. **KEY DATES & YEARS:** **BOLD** ALL crucial years and dates (e.g., <b>1945</b>, <b>2026</b>).
5. **GLOSSARY TERMS:** Identify 15-25 specific Entities (Geography, People, Events, Technical Terms). Wrap the first occurrence in <span class="explain-term" data-def="Definition">Term</span>.
6. **STRUCTURED CITATIONS:** Wrap source text in <span class="smart-citation" data-source="Source">Text</span>.
7. **HTML ONLY:** No Markdown. Use <h2>, <p>, <ul>, <li>, <b>, <blockquote>.
8. **IMAGE PLACEMENT:** NEVER place two images adjacent vertically.

**STRUCTURE:**
1. <citation>Source</citation>
2. <h1>Title</h1>
3. <figure>Hero Media</figure>
4. Body Text
5. <citations_list>References</citations_list>
6. <faq_section>3-5 FAQs</faq_section>

**STYLE:** ${STYLE_INSTRUCTIONS[style]}
**COMPLEXITY:** ${LEVEL_INSTRUCTIONS[level]}
`;

const APP_KNOWLEDGE_BASE = `
### ABOUT LUMEAREADER
LumeaReader is a premium AI-powered reader.
`;

function getDirectVideoEmbed(url: string): string | null {
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) {
        return `<iframe width="100%" height="450" src="https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) {
        return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" width="100%" height="450" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
    return null;
}

async function fetchRawUrlHtml(url: string, suppressErrors: boolean = false): Promise<string> {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
  ];
  let lastError: Error | null = null;
  for (const proxyGen of proxies) {
    try {
      const proxyUrl = proxyGen(url);
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 50) return text;
      }
      lastError = new Error(`Proxy returned status ${response.status}`);
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw lastError || new Error("Could not load URL.");
}

function extractRichMedia(html: string, baseUrlStr: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let mediaLog = "";
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
        let src = ogImage.getAttribute('content');
        if (src) {
             if (!src.startsWith('http')) src = new URL(src, baseUrlStr).href;
             mediaLog += `[HERO IMAGE CANDIDATE]: <img src="${src}" alt="Main Article Image" />\n\n`;
        }
    }
    doc.querySelectorAll('img').forEach((img, i) => {
        let src = img.getAttribute('src');
        if (src) {
            if (!src.startsWith('http') && !src.startsWith('data:')) {
                try { src = new URL(src, baseUrlStr).href; } catch(e) { return; }
            }
            mediaLog += `[CONTENT PHOTO ${i+1}]: <img src="${src}" alt="Content" />\n`;
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
      contents: `Translate text to ${targetLanguage}. Keep HTML: ${html.substring(0, 30000)}`
    });
    return response.text || html;
  } catch (error) { return html; }
};

export const generateQuizFromContent = async (text: string, language: string, imagesInArticle: string[] = [], difficulty: string = 'Intermediate', keywords?: string): Promise<Quiz[]> => {
    const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });
    
    // Determine the type of request: Custom keywords or Automatic set
    const isCustom = !!keywords;
    
    let prompt = "";
    
    if (isCustom) {
        prompt = `
        Create 1 specific quiz based on the text focusing on these keywords: "${keywords}".
        TEXT: ${text.substring(0, 50000)}
        INSTRUCTIONS:
        - 10 questions. 4 options each.
        - Difficulty: ${difficulty}. Language: ${language}.
        - STRICT FORMATTING: Use <b>Bold</b> tags for emphasis. DO NOT USE MARKDOWN (no **, no #).
        - EXPLANATIONS: Pure HTML text. NO Markdown.
        - OUTPUT JSON array with 1 item.
        `;
    } else {
        prompt = `
        Create 3 DISTINCT quizzes from the text.
        1. "Key Concepts & Facts" (General understanding)
        2. "Detailed Analysis" (Specific figures, dates, nuances)
        3. "Vocabulary & Terminology" (Definitions and usage)
        
        TEXT: ${text.substring(0, 50000)}
        INSTRUCTIONS:
        - 5-8 questions per quiz. 4 options each.
        - Language: ${language}.
        - STRICT FORMATTING: Use HTML tags only (e.g. <b>Text</b>). DO NOT USE MARKDOWN (no **, no ##).
        - EXPLANATIONS: Pure text/HTML. Clean and readable.
        - OUTPUT JSON array with 3 items.
        `;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      thumbnailUrl: { type: Type.STRING, nullable: true },
                      questions: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswerIndex: { type: Type.INTEGER },
                            explanation: { type: Type.STRING },
                            hint: { type: Type.STRING }
                          },
                          required: ["question", "options", "correctAnswerIndex", "explanation", "hint"]
                        }
                      }
                    },
                    required: ["id", "title", "questions"]
                  }
                }
            }
        });
        return JSON.parse((response.text || "[]").replace(/```json\n?|```/g, '').trim());
    } catch (e) { return []; }
};

export const askAiAboutArticle = async (fullText: string, question: string, mode: 'chat' | 'summary' = 'chat'): Promise<string> => {
    const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
    if (!apiKey) return "API Key missing.";
    const ai = new GoogleGenAI({ apiKey });
    const context = fullText.replace(/<[^>]+>/g, ' '); 
    const prompt = mode === 'summary' 
        ? `Provide a 3-bullet summary in HTML (<ul><li>). Text: ${context.substring(0, 50000)}`
        : `Answer this question based on the article.
           QUESTION: "${question}"
           STRICT FORMATTING RULES: 
           - USE HTML ONLY (<ul><li> for lists, <p> for paragraphs, <b> for bold).
           - NO Markdown artifacts like *, #, or mdashes. 
           - ENTITY CAPITALIZATION: Use Title Case (Hoofdletters) for dates, locations, organizations, and names.
           - BE EXTREMELY FAST AND CONCISE.
           TEXT: ${context.substring(0, 50000)}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "No response.";
    } catch (e) { return "Error."; }
};

export const splitTextIntoChunks = (text: string, maxChars: number = 4000): string[] => {
    const chunks: string[] = [];
    const paragraphs = text.split(/(?:\r\n|\r|\n)+/);
    let currentChunk = "";
    for (const para of paragraphs) {
        if ((currentChunk.length + para.length + 2) <= maxChars) {
            currentChunk += (currentChunk ? "\n\n" : "") + para;
        } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = para;
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
};

// --- AUDIO HELPERS ---
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function pcmToWav(pcmData: Uint8Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);
    const writeString = (v: DataView, offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM Format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);
    new Uint8Array(buffer, 44).set(pcmData);
    return new Blob([buffer], { type: 'audio/wav' });
}

export const fetchAudioForChunk = async (text: string): Promise<HTMLAudioElement> => {
  const openAIKey = (window as any).process?.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (openAIKey) {
    try {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Authorization": `Bearer ${openAIKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "tts-1", input: text, voice: "alloy", response_format: "mp3" }),
        });
        if (response.ok) {
            const blob = await response.blob();
            return new Audio(URL.createObjectURL(blob));
        }
    } catch (e) {}
  }
  
  // Fallback to Gemini 2.5 TTS if OpenAI fails or key missing
  const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
  if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
          },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const pcmData = decodeBase64(base64Audio);
            const wavBlob = pcmToWav(pcmData, 24000);
            return new Audio(URL.createObjectURL(wavBlob));
        }
      } catch(e) {}
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
  let availableMedia = "";
  let title = "Article";

  try {
    if (type === 'url' && DEMO_CONTENT[source]) {
        fullTextContext = DEMO_CONTENT[source];
        title = sourceName || "Demo Article";
    } 
    else if (type === 'pdf') {
        const base64Data = source.split(',')[1] || source;
        const pdfData = await pdfModule.getDocument({ data: atob(base64Data) }).promise;
        let extractedText = "";
        for (let i = 1; i <= pdfData.numPages; i++) {
            const page = await pdfData.getPage(i);
            const textContent = await page.getTextContent();
            extractedText += textContent.items.map((item: any) => item.str).join(' ') + "\n\n";
        }
        fullTextContext = extractedText;
        title = sourceName?.replace('.pdf', '') || "PDF";
    } else if (type === 'url') {
        const directVideo = getDirectVideoEmbed(source);
        if (directVideo) availableMedia += `\n\n[PRIMARY VIDEO PLAYER]: ${directVideo}\n\n`;
        const rawHtml = await fetchRawUrlHtml(source);
        availableMedia += extractRichMedia(rawHtml, source);
        const reader = new Readability(new DOMParser().parseFromString(rawHtml, "text/html"));
        const article = reader.parse();
        fullTextContext = article ? article.content : "No text found.";
        if (article?.title) title = article.title;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: getSmartReadingInstruction(style, readingLevel, targetLanguage, sourceName),
        temperature: 0.1,
      },
      contents: `### CONTEXT\n${fullTextContext}\n### MEDIA\n${availableMedia}`
    });

    let generatedHtml = response.text || "";
    generatedHtml = cleanMarkdownArtifacts(generatedHtml);

    let citation = "";
    const citationMatch = generatedHtml.match(/<citation>(.*?)<\/citation>/s);
    if (citationMatch) { citation = citationMatch[1].trim(); generatedHtml = generatedHtml.replace(/<citation>.*?<\/citation>/gs, ''); }

    let topQuestions: FaqItem[] = [];
    const faqMatch = generatedHtml.match(/<faq_section>(.*?)<\/faq_section>/s);
    if (faqMatch) {
        faqMatch[1].split('</faq_item>').forEach(item => {
            const q = item.match(/<question>(.*?)<\/question>/s);
            const a = item.match(/<answer>(.*?)<\/answer>/s);
            if (q && a) topQuestions.push({ question: q[1].trim(), answer: a[1].trim() });
        });
        generatedHtml = generatedHtml.replace(/<faq_section>.*?<\/faq_section>/s, '');
    }

    let smartCitations: Citation[] = [];
    const citationListMatch = generatedHtml.match(/<citations_list>(.*?)<\/citations_list>/s);
    if (citationListMatch) {
        citationListMatch[1].split('</citation_item>').forEach((item, index) => {
             const text = item.match(/<text>(.*?)<\/text>/s);
             const source = item.match(/<source>(.*?)<\/source>/s);
             if (text && source) smartCitations.push({ id: `cite-${index}`, text: text[1].trim(), source: source[1].trim() });
        });
        generatedHtml = generatedHtml.replace(/<citations_list>.*?<\/citations_list>/s, '');
    }

    generatedHtml = generatedHtml.replace(/==(.*?)==/g, `<mark style="background-color: ${options.color};">$1</mark>`);
    generatedHtml = generatedHtml.replace(/<h2>(.*?)<\/h2>/g, (m, c) => `<h2 id="${c.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${c}</h2>`);

    return {
      id: Date.now().toString(),
      title: title,
      content: generatedHtml,
      excerpt: generatedHtml.replace(/<[^>]+>/g, '').substring(0, 300),
      sourceType: type,
      sourceUrl: type === 'url' ? source : 'Uploaded Document',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      readTime: '4 min read',
      thumbnailUrl: (generatedHtml.match(/<img[^>]+src="([^">]+)"/) || [])[1] || "",
      citation: citation,
      citations: smartCitations,
      topQuestions: topQuestions,
      ownerId: 'ritchieolthuis'
    };
  } catch (error) { return { id: 'error', title: "Error", content: "<p>Processing failed.</p>", excerpt: "", sourceType: type }; }
};
