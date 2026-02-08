
import { ProcessorResponse, HighlightOptions, SourceType, WritingStyle, FaqItem, ReadingLevel, Citation, Quiz, QuizQuestion, AuditResult, DeepAuditResult } from '../types';
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

// --- CACHED RAW CONTENT FOR FAST RETRIEVAL ---
const RAW_CACHE: Record<string, string> = {
    "https://www.britannica.com/biography/Hannibal-Carthaginian-general-247-183-BCE/Exile-and-death": `
    Hannibal (247-183 BCE) was a Carthaginian general, one of the greatest military strategists of ancient history. 
    In the Second Punic War (218-201 BCE), he famously led an army, including war elephants, across the Alps to invade Italy. 
    He won several major battles, most notably at Cannae (216 BCE), but was eventually defeated by Scipio Africanus at the Battle of Zama (202 BCE).
    After the war, he served as a statesman in Carthage until forced into exile by the Romans. 
    He fled to the court of Antiochus III of the Seleucid Empire and later to the Kingdom of Bithynia. 
    To avoid being captured by the Romans, he committed suicide by poison in 183 BCE at Libyssa.
    Key people: Hamilcar Barca (his father), Scipio Africanus, Antiochus III, Prusias I.
    Key locations: Carthage, Rome, Saguntum, Alps, Cannae, Zama, Libyssa.
    Historical significance: Tactical genius, flanking maneuvers, pincer movement, Punic culture.
    `
};

const DEMO_CONTENT: Record<string, string> = {
    "https://news.un.org/en/story/2026/01/1160452": `<h1>UN Experts Warn of Global Job Displacement Risks in 2026</h1><figure><img src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80" alt="AI Future" /><figcaption>Global labor markets face unprecedented shifts.</figcaption></figure><p><b>GENEVA, 15 January 2026</b> — A new report by UN experts highlights the accelerating impact of autonomous systems on the global workforce. The report suggests that by late <b>2026</b>, nearly 15% of traditional administrative roles may be fully automated. However, new sectors in "Human-Centric Review" and "AI Ethics Compliance" are growing faster than anticipated.</p><h2>Key Findings</h2><ul><li>Automation is shifting from manufacturing to creative services.</li><li>Reskilling programs are lagging behind technological adoption curves.</li></ul><p><b>Dr. Elena Voss</b>, lead author, stated: "The challenge isn't the technology, it's the transition period we are entering this year."</p>`,
    "https://www.youtube.com/watch?v=LXb3EKWsInQ": `<h1>The Tiny Tech Revolutionizing What We Know About Biology</h1><p>Nanotechnology is allowing biologists to observe cellular processes in real-time at a resolution never before possible. This video explores the new "Bio-Nano" lenses developed in <b>2025</b> that act as windows into the atomic structures of living cells.</p>`,
    "https://doi.org/10.1016/j.scib.2026.01.031": `<h1>Chinese Astronomers Trace Origin of Fast Radio Bursts</h1><figure><img src="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80" alt="Space Telescope" /></figure><p><b>BEIJING</b> — A team using the FAST telescope has pinpointed the source of a repeating Fast Radio Burst (FRB) to a magnetar in a neighboring dwarf galaxy. The signal, identified as FRB-2026-A, repeats on a 16-day cycle, confirming theories proposed back in <b>2020</b> regarding magnetar precession.</p>`,
    "https://laist.com/news/tiktok-at-the-grammys-2026": `<h1>TikTok Dominates 2026 Grammy Best New Artist Nominations</h1><figure><img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80" alt="Music Studio" /></figure><p>For the first time in history, all nominees for Best New Artist gained their initial traction via viral TikTok snippets. The shift marks a definitive end to the "Radio First" era of music discovery. Analysts predict that by <b>2027</b>, social discovery will account for 90% of new artist break-outs.</p>`
};

// --- HELPER: CLEAN MARKDOWN ARTIFACTS AND BOLD YEARS ---
function cleanMarkdownArtifacts(html: string, boldYears: boolean = true): string {
    let cleaned = html
        .replace(/```html\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/==([\s\S]*?)==/g, '<mark>$1</mark>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/## (.*?)(<br>|<\/p>|\n)/g, '<h2>$1</h2>')
        .replace(/__ (.*?)\n/g, '<h2>$1</h2>')
        .replace(/__(.*?)__/g, '<i>$1</i>')
        .replace(/^- (.*?)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '<p></p>')
        .replace(/\[Score \d+\]/gi, '');

    // Aggressively remove any "Glossary" or "Definitions" headers at the end if the AI ignored instructions
    cleaned = cleaned.replace(/<h2>(Glossary|Definitions|Terms|Begrippenlijst).*?<\/h2>[\s\S]*/i, '');

    if (boldYears) {
        // Precise year bolding for 1000-2999 and BCE dates
        cleaned = cleaned.replace(/\b((?:1|2)\d{3})\b(?![^<]*<\/b>)/g, '<b>$1</b>');
        cleaned = cleaned.replace(/\b(\d{1,4}\s?(?:v\.Chr\.|BCE|BC))\b(?![^<]*<\/b>)/g, '<b>$1</b>');
    }
    return cleaned;
}

// --- System Instruction: PIXEL PERFECT LOGIC ---
const getSmartReadingInstruction = (style: WritingStyle, level: ReadingLevel, targetLanguage: string, sourceName?: string) => `
You are an "Expert Page Architect". Your only task is the transformation of uploaded content into a pixel-perfect Medium.com reading experience.

**FORMATTING RULES:**
1. **LANGUAGE:** ALWAYS write in **${targetLanguage}**.
2. **HTML STRUCTURE:** Use semantic tags (<h2>, <p>, <ul>, <li>, blockquote, figure, figcaption). NEVER use markdown artifacts like # or ** in final output. Use <h2> and <b> instead.
3. **ARCEREN (HIGHLIGHTING):** Identify exactly 3 to 5 of the absolute most important, surprising, or vital sentences/insights. Wrap them EXACTLY in ==...==. This is MANDATORY. Do not over-highlight.
4. **KEY DATES & YEARS:** YOU MUST **BOLD** ALL years and historical dates (e.g., <b>1899</b>, <b>2026</b>, <b>218 BCE</b>). No exceptions.
5. **INTERACTIVE GLOSSARY (IN-TEXT ONLY):**
   - **STRICT REQUIREMENT:** Identify terms ONLY from the following categories. Focus on specific, high-impact entities that provide necessary context.
   - **FORBIDDEN ENTITIES:** Do NOT highlight common knowledge locations (e.g., Spain, Rome, Russia) unless they are part of a specific historical entity (e.g., Roman Republic). Do NOT highlight generic technical terms, quantities, products, common brands, or abstract nouns.
   - **MANDATORY CATEGORIES & EXAMPLES:**
     * **Persons (PER):** Specific individuals (e.g., Hamilcar Barca, Scipio Africanus, Hasdrubal de Schone, Publius Cornelius Scipio, Hanno, Brancus, Hannibal).
     * **Locations (LOC):** Historical cities, specific regions, rivers, natural barriers, and mountain passes (e.g., Saguntum, Ebro River, Pyreneeën, Gallia Transalpina, Col du Mont-Cenis, Montgenèvrepas, Kleine Sint-Bernhard, Bithynië).
     * **Nationalities/Groups/Tribes (NORP):** Specific ethnic or political groups and ancient tribes (e.g., Olcades, Vaccaei, Punics, Romans, Carthaginians).
     * **Organizations (ORG):** Historical governments or specific groups (e.g., Carthaginian Senate, Roman Republic).
     * **Events (EVE):** Wars, specific battles, or historical incidents (e.g., Second Punic War, Battle of Cannae, Battle of Zama).
     * **Titles & Ranks (TITLE):** Official roles or specific ranks (e.g., Suffeet, Consul, General).
     * **Works/Documents (WORK):** Specific historical books, treaties, or annals (e.g., 'Ab urbe condita', Polybius' Histories).
     * **Languages (LANG):** Specific languages (e.g., Punic, Latin).
     * **Dynasties/Lineages (FAM):** Specific families (e.g., Barcids).
     * **Deities/Religions (REL):** Gods or holy sites (e.g., Baal Hammon).
     * **Geographic Facilities (FAC):** Named man-made structures (e.g., Via Appia, Port of Carthage).
   - **ACTION:** Wrap these entities IN-PLACE within the text: <span class="explain-term" data-def="Brief factual context, max 12 words">Term</span>.
   - **FORBIDDEN:** Do NOT create a "Glossary", "Definitions", or "Terms" list at the bottom. The functionality must be embedded in the text.
6. **SMART CITATIONS:**
   - Find 10-20 word-for-word quotes from the source.
   - Wrap them: <span class="smart-citation" data-source="${sourceName || 'Source'}: [URL]">The exact quote</span>.
7. **MEDIA INTEGRATION:**
   - Integrate provided images using <figure><img src="..." alt="..." /><figcaption>Contextual description</figcaption></figure>.
8. **NAMES:** Bold full names of people (e.g., <b>Hannibal Barca</b>) the first time they appear.

**STYLE:** ${STYLE_INSTRUCTIONS[style]}
**COMPLEXITY:** ${LEVEL_INSTRUCTIONS[level]}
**NO EMOJIS.** **NO META-COMMENTARY.** **STRICT FACTUAL ADHERENCE.**
`;

function getDirectVideoEmbed(url: string): string | null {
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `<iframe width="100%" height="450" src="https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" width="100%" height="450" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    return null;
}

async function fetchRawUrlHtml(url: string): Promise<string> {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];
  for (const proxyGen of proxies) {
    try {
      const response = await fetch(proxyGen(url));
      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 50) return text;
      }
    } catch (e) {}
  }
  throw new Error("Could not load URL.");
}

const ULTRA_IMAGE_PROXY = "https://images.weserv.nl/?url=";

const getUltraFixUrl = (src: string): string => {
    if (!src || src.startsWith('data:')) return src;
    return `${ULTRA_IMAGE_PROXY}${encodeURIComponent(src)}&w=1200&output=webp&q=85&default=${encodeURIComponent(src)}`;
};

function extractRichMedia(html: string, baseUrlStr: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let mediaLog = "";
    const mediaBlacklist = ['logo', 'icon', 'avatar', 'profile', 'social', 'banner-ad', 'pixel', 'spacer', 'nav', 'menu', 'button', 'loading', 'sprite', 'placeholder', 'favicon', 'ad-choices', 'advertisement'];
    
    const isBullshit = (src: string, alt: string): boolean => {
        const lowerSrc = src.toLowerCase();
        const lowerAlt = (alt || "").toLowerCase();
        return mediaBlacklist.some(word => lowerSrc.includes(word) || lowerAlt.includes(word));
    };

    const resolveUrl = (src: string) => {
        try {
            return new URL(src, baseUrlStr).href;
        } catch (e) {
            return src;
        }
    };

    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
        let src = ogImage.getAttribute('content');
        if (src) {
             src = resolveUrl(src);
             if (!isBullshit(src, "")) {
                 const proxySrc = getUltraFixUrl(src);
                 mediaLog += `[HERO IMAGE]: <img src="${proxySrc}" alt="Main Article Image" />\n\n`;
             }
        }
    }

    const processedSrcs = new Set<string>();
    doc.querySelectorAll('img').forEach((img, i) => {
        let src = img.getAttribute('src') || img.getAttribute('data-src');
        if (!src) return;
        src = resolveUrl(src);
        const width = parseInt(img.getAttribute('width') || '100');
        const height = parseInt(img.getAttribute('height') || '100');
        const alt = img.getAttribute('alt') || "";
        if ((width > 0 && width < 60) || (height > 0 && height < 60)) return;
        if (isBullshit(src, alt)) return;
        if (src && !processedSrcs.has(src)) {
            processedSrcs.add(src);
            const proxySrc = getUltraFixUrl(src);
            mediaLog += `[CONTENT PHOTO ${processedSrcs.size}]: <img src="${proxySrc}" alt="${alt || 'Article Illustration ' + processedSrcs.size}" />\n`;
        }
    });
    return mediaLog;
}

export const translateHtml = async (html: string, targetLanguage: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following to ${targetLanguage}. Maintain all HTML tags exactly, especially <span class="explain-term">, <span class="smart-citation">, <figure>, and <mark>. Bold ALL years (<b>2024</b>). Content: ${html.substring(0, 30000)}`
    });
    return cleanMarkdownArtifacts(response.text || html, true);
  } catch (error) { return html; }
};

export const regenerateTextSegment = async (
  originalText: string,
  instruction: string,
  fullContext: string,
  mode: 'shorten' | 'expand' | 'rewrite' | 'custom'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const basePrompt = `
  You are an Expert Fact-Checked Reformulator. Your task is to reformulate the following text block using ONLY the provided context as the source of truth.
  
  ORIGINAL SEGMENT TO REFORMULATE:
  "${originalText}"
  
  REFORMULATION GOAL:
  ${mode === 'shorten' ? 'Reformulate into a significantly more concise, punchy version. Keep only the essential facts.' : ''}
  ${mode === 'expand' ? 'Reformulate by adding depth and detail, making the narrative richer based on the context.' : ''}
  ${mode === 'rewrite' ? 'Reformulate for professional flow, clarity, and engagement. Do not add external info.' : ''}
  ${mode === 'custom' ? `Follow this specific reformulating instruction: "${instruction}"` : ''}

  STRICT RULES:
  1. Return ONLY the reformulated HTML snippet. NO preamble, NO meta-comments, NO markdown symbols (no **, no ##).
  2. Maintain existing HTML tags if they wrap technical terms or citations.
  3. YOU MUST BOLD ALL YEARS (e.g., <b>1999</b>, <b>2026</b>).
  4. Factual accuracy is mandatory. If the instruction asks for info not in the context, stick to the context.
  5. DO NOT mention any generic brands or locations unless they are specific historical entities from the context.
  
  FULL SOURCE CONTEXT (Ground Truth):
  ${fullContext.substring(0, 10000)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: basePrompt,
      config: {
          thinkingConfig: { thinkingBudget: 0 } // Maximum speed for reformulation
      }
    });
    return cleanMarkdownArtifacts(response.text || originalText, true);
  } catch (e) {
    return originalText;
  }
};

export const generateQuizFromContent = async (text: string, language: string, imagesInArticle: string[] = [], difficulty: string = 'Intermediate', keywords?: string): Promise<Quiz[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a high-quality quiz for ${difficulty} level in ${language}. Subject keywords: ${keywords || 'Article content'}. Return JSON ONLY. Bold years: <b>1899</b>. Text: ${text.substring(0, 25000)}`;
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

export const runIntegrityCheck = async (text: string, language: string, citations: string[] = []): Promise<AuditResult> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanText = text.replace(/<[^>]+>/g, ' ').substring(0, 50000);
    const prompt = `
    INSTRUCTIE: Analyseer de onderstaande tekst op de aanwezigheid van desinformatie, narratieve sturing en logische drogredenen. Negeer de bron van de tekst volledig en beoordeel uitsluitend de inhoud op basis van de volgende criteria:

    1. Feitelijke Onderbouwing: Identificeer alle harde claims (cijfers, gebeurtenissen, citaten).
    2. Logische Consistentie: Bevat de tekst drogredenen?
    3. Weglatingsanalyse (Omissie): Wat ontbreekt er?
    4. Framing & Taalgebruik: Wijs op subjectiviteit.
    5. Brongebruik: Worden bronnen geanonimiseerd of zijn ze controleerbaar?

    RESULTAAT VEREISTEN:
    - Geef een kritische score van 1 tot 10 op objectiviteit.
    - Taal van output: ${language}.
    - Maak belangrijke jaartallen dikgedrukt (bijv. <b>2024</b>).

    ANALYSEER DEZE TEKST: ${cleanText}
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
             type: Type.OBJECT,
             properties: {
                 score: { type: Type.INTEGER },
                 verdict: { type: Type.STRING },
                 summary: { type: Type.STRING },
                 points: {
                     type: Type.ARRAY,
                     items: {
                         type: Type.OBJECT,
                         properties: {
                             category: { type: Type.STRING, enum: ["Evidence", "Framing", "Omission", "Logic", "Sources"] },
                             status: { type: Type.STRING, enum: ["pass", "warning", "fail"] },
                             finding: { type: Type.STRING },
                             details: { type: Type.STRING }
                         },
                         required: ["category", "status", "finding", "details"]
                     }
                 }
             },
             required: ["score", "verdict", "summary", "points"]
          }
        }
      });
      return JSON.parse((response.text || "{}"));
    } catch (e) { return { score: 0, verdict: "Audit error.", summary: "Error.", points: [] }; }
};

export const runDeepAnalysis = async (text: string, language: string): Promise<DeepAuditResult> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanText = text.replace(/<[^>]+>/g, ' ').substring(0, 50000);
    const prompt = `Perform a Deep Expert Analysis in ${language}. Extract claims, fallacies. Bold ALL years. JSON ONLY. Text: ${cleanText}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        claims: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { claim: { type: Type.STRING }, category: { type: Type.STRING }, verification: { type: Type.STRING } }, required: ["claim", "category", "verification"] } },
                        fallacies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quote: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["name", "quote", "explanation"] } },
                        tone: { type: Type.OBJECT, properties: { emotionalScore: { type: Type.INTEGER }, objectiveScore: { type: Type.INTEGER }, dominantTone: { type: Type.STRING } }, required: ["emotionalScore", "objectiveScore", "dominantTone"] },
                        citations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, quote: { type: Type.STRING }, category: { type: Type.STRING }, credibility: { type: Type.STRING } }, required: ["source", "quote", "category", "credibility"] } },
                        authorAnalysis: { type: Type.STRING }
                    },
                    required: ["claims", "fallacies", "tone", "citations", "authorAnalysis"]
                }
            }
        });
        return JSON.parse((response.text || "{}"));
    } catch (e) { return { claims: [], fallacies: [], citations: [], tone: { emotionalScore: 50, objectiveScore: 50, dominantTone: "Unknown" }, authorAnalysis: "Error" }; }
};

export const askAiAboutArticle = async (fullText: string, question: string, mode: 'chat' | 'summary' = 'chat'): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = fullText.replace(/<[^>]+>/g, ' '); 
    const prompt = `Answer based on the source. Bold ALL years (<b>1899</b>). QUESTION: "${question}" SOURCE: ${context.substring(0, 40000)}`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return cleanMarkdownArtifacts(response.text || "No answer.", true);
    } catch (e) { return "Error."; }
};

export const splitTextIntoChunks = (text: string, maxChars: number = 4000): string[] => {
    const chunks: string[] = [];
    const paragraphs = text.split(/(?:\r\n|\r|\n)+/);
    let currentChunk = "";
    for (const para of paragraphs) {
        if ((currentChunk.length + para.length + 2) <= maxChars) currentChunk += (currentChunk ? "\n\n" : "") + para;
        else { if (currentChunk) chunks.push(currentChunk); currentChunk = para; }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
};

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

function encodeWAV(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, string: string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); };
  writeString(0, 'RIFF'); view.setUint32(4, 32 + samples.length * 2, true); writeString(8, 'WAVE'); writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeString(36, 'data'); view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) view.setInt16(offset, samples[i], true);
  return buffer;
}

export const fetchAudioForChunk = async (text: string): Promise<HTMLAudioElement> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text.substring(0, 4000) }] }],
            config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data");
        const pcmBytes = decode(base64Audio);
        const samples = new Int16Array(pcmBytes.buffer);
        const wavBuffer = encodeWAV(samples, 24000);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        return new Audio(url);
    } catch (e) { throw e; }
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let fullTextContext = "";
  let availableMedia = "";
  let title = sourceName || "Article";

  try {
    if (type === 'url' && RAW_CACHE[source]) {
        fullTextContext = RAW_CACHE[source];
        title = "Hannibal Barca: The General Who Terrified Rome";
    } 
    else if (type === 'url' && DEMO_CONTENT[source]) {
        fullTextContext = DEMO_CONTENT[source];
        const h1Match = fullTextContext.match(/<h1>(.*?)<\/h1>/);
        if (h1Match) title = h1Match[1];
    } 
    else if (type === 'pdf') {
        const base64Data = source.split(',')[1] || source;
        const pdfData = await pdfModule.getDocument({ data: atob(base64Data) }).promise;
        for (let i = 1; i <= pdfData.numPages; i++) {
            const page = await pdfData.getPage(i);
            const textContent = await page.getTextContent();
            fullTextContext += textContent.items.map((item: any) => item.str).join(' ') + "\n\n";
        }
        title = sourceName?.replace('.pdf', '') || "PDF Document";
    } else if (type === 'url') {
        const directVideo = getDirectVideoEmbed(source);
        if (directVideo) availableMedia += `\n\n[PRIMARY VIDEO PLAYER]: ${directVideo}\n\n`;
        const rawHtml = await fetchRawUrlHtml(source);
        availableMedia += extractRichMedia(rawHtml, source);
        const reader = new Readability(new DOMParser().parseFromString(rawHtml, "text/html"));
        const article = reader.parse();
        if (!article || !article.content || article.content.length < 200) fullTextContext = rawHtml.substring(0, 100000);
        else { fullTextContext = article.content; if (article.title) title = article.title; }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: getSmartReadingInstruction(style, readingLevel, targetLanguage, sourceName || title), temperature: 0.1 },
      contents: `CONTEXT: ${fullTextContext}\n\nMEDIA SECTION (INTEGRATE THESE INTO THE HTML NARRATIVE):\n${availableMedia}\n\nADDITIONAL INSTRUCTIONS: ${customPrompt || 'None'}`
    });

    const finalHtml = cleanMarkdownArtifacts(response.text || "", true);
    const parser = new DOMParser();
    const doc = parser.parseFromString(finalHtml, "text/html");
    const citationNodes = doc.querySelectorAll('.smart-citation');
    const citations: Citation[] = Array.from(citationNodes).map((node, index) => ({
      id: `cite-${index}`,
      text: node.textContent || "",
      source: node.getAttribute('data-source') || "Source"
    }));

    return {
      id: Date.now().toString(),
      title: title,
      content: finalHtml,
      excerpt: (response.text || "").replace(/<[^>]+>/g, '').substring(0, 300),
      sourceType: type,
      sourceUrl: type === 'url' ? source : 'Document',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      readTime: '4 min read',
      thumbnailUrl: (response.text?.match(/<img[^>]+src="([^">]+)"/) || [])[1] || (availableMedia.match(/src="([^">]+)"/) || [])[1] || "",
      citations: citations,
      ownerId: 'ritchieolthuis'
    };
  } catch (error) { return { id: 'error', title: "Error", content: "", excerpt: "", sourceType: type }; }
};
