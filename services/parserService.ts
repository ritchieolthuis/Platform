import { ProcessorResponse, HighlightOptions, SourceType, WritingStyle } from '../types';
import { GoogleGenAI } from "@google/genai";
import * as ReadabilityMod from '@mozilla/readability';
import * as pdfjsLib from 'pdfjs-dist';

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
    normal: "Schrijf in de standaard Medium-stijl: boeiend, verhalend, professioneel maar toegankelijk.",
    learning: "Schrijf als een leraar (Learning mode): leg concepten simpel uit, gebruik analogieën, definieer jargon direct, focus op didactisch begrip.",
    concise: "Schrijf beknopt (Concise mode): gebruik korte zinnen en bullet points waar mogelijk. Verwijder alle 'fluff' en anekdotes. Focus puur op de feiten en data.",
    explanatory: "Schrijf verklarend (Explanatory mode): ga diep in op het 'waarom' en 'hoe'. Gebruik metaforen en stap-voor-stap uitleg om context te geven.",
    formal: "Schrijf formeel (Formal mode): gebruik academisch/zakelijk taalgebruik. Wees objectief. Vermijd de 'ik' of 'jij' vorm. Focus op autoriteit."
};

// --- System Instruction (The Brain) ---
// Modified to strict Source Only + 80/20 + Audio Optimized + Custom Prompt support
const getSmartReadingInstruction = (style: WritingStyle) => `
Fungeer als een tekst-naar-spraak geoptimaliseerde editor.

**Bronbeperking:** Gebruik uitsluitend de geüploade PDF of URL content hieronder als bron. Verzin GEEN feiten.

**Structuur:** Pas de 80/20 regel toe voor de kernwaarde. Identificeer de 20% van de kerninformatie die 80% van de waarde draagt.

**Diepte-injectie:** Analyseer de 'EXTRA FOCUS (USER PROMPT)' (indien aanwezig). Breid de sectie in de bron die hierover gaat uit met factor 3 aan detail, terwijl je 100% feitelijk blijft op basis van de bron.

**Audio-optimalisatie:** Schrijf de tekst in een vloeiende, voorleesbare stijl (geen complexe tabellen of underscores), zodat de 'Lees voor'-functie van de browser of AI vlekkeloos werkt.

**Output:** Geef alléén de gegenereerde HTML content. Geen inleiding of afsluiting.

**STIJL INSTRUCTIE:** ${STYLE_INSTRUCTIONS[style]}

**FORMATTING REGELS:**
1.  **Structuur:** Converteer onderwerpwissels naar \`<h2>\`.
2.  **Alinea's:** Heldere \`<p>\` tags.
3.  **Afbeeldingen:** Neem \`<img src...>\` over indien aanwezig in de HTML context met bijbehorende caption in \`<figure>\`.
4.  **Start:** H1 titel, cursieve samenvatting (80/20 essentie), dan FAQ in \`<details>\`.

Lever puur de HTML body content.
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

// --- Translation Function ---
export const translateHtml = async (html: string, targetLanguage: string): Promise<string> => {
  const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the text content of the following HTML to ${targetLanguage}. Keep ALL tags/classes. HTML: ${html.substring(0, 30000)}`
    });
    return response.text || html;
  } catch (error) { return html; }
};

// --- Audio Generation Function (Updated to Puter.js) ---
export const generateArticleAudio = async (text: string): Promise<HTMLAudioElement> => {
  try {
    // Puter.js text-to-speech
    // Automatically uses gpt-4o-mini-tts or tts-1 logic internally and returns an Audio object
    const audio = await puter.ai.txt2speech(text.substring(0, 10000)); // Limit to avoid hitting soft limits
    return audio;
  } catch (error) {
    console.error("Puter Audio Generation Error", error);
    throw error;
  }
};

// --- Main Processor ---
export const processSource = async (
  type: SourceType, 
  source: string, 
  options: HighlightOptions,
  style: WritingStyle = 'normal',
  customPrompt?: string
): Promise<ProcessorResponse> => {
  
  const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;

  if (!apiKey) {
    return {
      id: 'error',
      title: "Configuration Error",
      content: "<p>API_KEY is missing. Please add your Gemini API Key to the environment variables.</p>",
      excerpt: "Missing API Key",
      sourceType: type
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  let fullTextContext = "";
  let rawContext = "";
  let title = "Article";

  try {
    // 1. Extraction
    if (type === 'pdf') {
        const base64Data = source.split(',')[1] || source;
        const pdfData = await pdfModule.getDocument({ data: atob(base64Data) }).promise;
        let extractedText = "";
        for (let i = 1; i <= pdfData.numPages; i++) {
            const page = await pdfData.getPage(i);
            const textContent = await page.getTextContent();
            extractedText += textContent.items.map((item: any) => item.str).join(' ') + "\n\n";
        }
        fullTextContext = extractedText;
        rawContext = "PDF Source provided via base64. Note: Images cannot be extracted from PDF text mode, but look for Figure captions in text."; 
    } else {
        const rawHtml = await fetchRawUrlHtml(source);
        const doc = new DOMParser().parseFromString(rawHtml, "text/html");
        
        try {
          const baseUrl = new URL(source);
          doc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
               img.src = new URL(src, baseUrl.href).href;
            }
          });
        } catch(e) {}

        const reader = new Readability(doc);
        const article = reader.parse();
        fullTextContext = article ? article.content : doc.body.innerText;
        rawContext = rawHtml;
        if (article?.title) title = article.title;
    }

    // 2. Generation (Single Pass, Strict Logic)
    const keywordsString = options.keywords.length > 0 ? options.keywords.join(", ") : "None";
    const extraFocus = customPrompt ? customPrompt : "Geen extra focus gespecificeerd.";

    // Revised Prompt Structure as per user instruction
    const promptStructure = `
### BRON
${fullTextContext.substring(0, 40000)}

### KEYWORDS
${keywordsString}

### EXTRA FOCUS (USER PROMPT)
${extraFocus}

OPDRACHT: Genereer de 80/20 analyse en de diepe focus. Schrijf het als een script dat direct voorgelezen kan worden.

--- RAW HTML CONTEXT (For images/captions only) ---
${rawContext.substring(0, 20000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: getSmartReadingInstruction(style),
        temperature: 0.1, // Low temperature for strict adherence
        topP: 0.9,
      },
      contents: promptStructure
    });

    let generatedHtml = response.text || "<p>Could not generate content.</p>";

    // Post-Processing: Highlighting
    generatedHtml = generatedHtml.replace(/<p>(.*?)<\/p>/g, (match, p1) => {
        if (p1.includes('<img') || p1.trim().length === 0) return match;
        
        const textContent = p1.replace(/<[^>]+>/g, '');
        if (textContent.length > options.minLength) {
            // Using inline style for highlight, respecting user choice
            return `<p style="background-color: ${options.color}; padding: 4px 2px; border-radius: 2px;">${p1}</p>`;
        }
        return match;
    });

    // Extract Title if present in HTML
    const titleMatch = generatedHtml.match(/<h1.*?>(.*?)<\/h1>/);
    if (titleMatch && titleMatch[1]) {
        title = titleMatch[1];
        generatedHtml = generatedHtml.replace(/<h1.*?>.*?<\/h1>/, '');
    }

    const plainText = generatedHtml.replace(/<[^>]+>/g, '');
    const summary = plainText.substring(0, 300) + "...";

    // --- Image Extraction & Fallback Logic ---
    let thumbnailUrl = "";
    
    // Attempt 1: Check for images in the generated HTML (Source Preservation)
    const imgMatch = generatedHtml.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
        thumbnailUrl = imgMatch[1];
    } else {
        // Attempt 2: Fallback to Concept Match via Keyword
        // We use the title or keywords to find a relevant "stock photo"
        let searchTerms = title;
        if (options.keywords && options.keywords.length > 0) {
             searchTerms = options.keywords[0];
        }
        
        // Clean terms to be URL safe and concise (first 4 words)
        const cleanTerms = searchTerms.replace(/[^a-zA-Z0-9\s]/g, '').split(' ').slice(0, 4).join(' ');
        
        // Use Pollinations AI to generate a "Unsplash-style" stock photo for the concept
        // This simulates finding a free image based on keywords reliably
        thumbnailUrl = `https://image.pollinations.ai/prompt/high%20quality%20photography%20of%20${encodeURIComponent(cleanTerms)}?width=800&height=600&nologo=true&seed=${Date.now()}`;
    }

    return {
      id: Date.now().toString(),
      title: title,
      content: generatedHtml,
      excerpt: summary,
      summary: `AI Smart-Read (${style} style) generated this. Focus: ${customPrompt ? 'Custom' : 'Standard 80/20'}.`,
      sourceType: type,
      sourceUrl: type === 'url' ? source : 'Uploaded Document',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      readTime: `${Math.max(1, Math.ceil(plainText.split(' ').length / 200))} min read`,
      thumbnailUrl: thumbnailUrl
    };

  } catch (error) {
    console.error("Smart Processing Failed", error);
    return {
      id: 'error',
      title: "Processing Failed",
      content: `<div class="p-4 bg-red-50 text-red-600 rounded">
        <h3 class="font-bold mb-2">Error</h3>
        <p>${(error as Error).message}</p>
      </div>`,
      excerpt: "Error occurred.",
      sourceType: type,
    };
  }
};