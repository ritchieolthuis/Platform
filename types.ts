

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
  topQuestions?: FaqItem[]; // Generated FAQs
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