

export interface HighlightOptions {
  minLength: number;
  keywords: string[];
  color: string; // Hex code
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Citation {
  id: string;
  text: string;
  source: string; // Author, Year, or Document Page
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string; // Context/Fact shown after answering
  hint?: string; // Optional hint for the user
}

export interface Quiz {
  id: string;
  title: string;
  thumbnailUrl?: string;
  questions: QuizQuestion[];
}

export interface AuditPoint {
  category: 'Evidence' | 'Framing' | 'Omission' | 'Logic' | 'Sources';
  status: 'pass' | 'warning' | 'fail';
  finding: string;
  details: string;
}

export interface AuditResult {
  score: number; // 1-10
  summary: string;
  points: AuditPoint[];
  verdict: string;
}

// New Types for Deep Audit Dashboard
export interface ClaimAnalysis {
  claim: string;
  type: 'Fact' | 'Opinion' | 'Hybrid';
  verification: string;
}

export interface Fallacy {
  name: string;
  quote: string;
  explanation: string;
}

export interface ToneAnalysis {
  emotionalScore: number; // 0-100
  objectiveScore: number; // 0-100
  dominantTone: string;
}

export interface CitationAnalysis {
  source: string;
  context: string;
  credibility: string;
}

export interface DeepAuditResult {
  claims: ClaimAnalysis[];
  fallacies: Fallacy[];
  tone: ToneAnalysis;
  citations: CitationAnalysis[];
  authorAnalysis: string;
}

export interface ArticleData {
  id: string;
  title: string;
  content: string; // HTML string
  excerpt: string;
  summary?: string;
  author?: string;
  date?: string;
  readTime?: string;
  sourceType?: SourceType;
  sourceUrl?: string; // or filename for PDF
  thumbnailUrl?: string; // Image representing the article
  citation?: string; // Exact 1:1 source citation
  citations?: Citation[]; // List of specific citations found in text
  topQuestions?: FaqItem[]; // generated FAQs
  ownerId?: string; // ID of the user who generated/saved this
  audit?: AuditResult; // Cached audit result
}

export type SourceType = 'url' | 'pdf' | 'html' | 'docx';

export type WritingStyle = 'normal' | 'learning' | 'concise' | 'explanatory' | 'formal';
export type ReadingLevel = 'beginner' | 'intermediate' | 'expert';
export type ColorMode = 'light' | 'auto' | 'dark';
export type FontType = 'serif' | 'sans' | 'system' | 'dyslexic';
export type FontSize = 'small' | 'standard' | 'large';
export type PageWidth = 'standard' | 'full';

export interface UserSettings {
  readingLevel: ReadingLevel;
  writingStyle: WritingStyle;
  colorMode: ColorMode;
  font: FontType;
  fontSize: FontSize;
  pageWidth: PageWidth;
  highlightOptions: HighlightOptions;
  customPrompt?: string;
  language: string;
}

export interface ProcessorResponse extends ArticleData {}