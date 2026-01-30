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
}

export type SourceType = 'url' | 'pdf';

export type WritingStyle = 'normal' | 'learning' | 'concise' | 'explanatory' | 'formal';
export type ColorMode = 'light' | 'auto' | 'dark';
export type FontType = 'serif' | 'sans' | 'system' | 'dyslexic';

export interface UserSettings {
  writingStyle: WritingStyle;
  colorMode: ColorMode;
  font: FontType;
  highlightOptions: HighlightOptions;
  customPrompt?: string;
}

export interface ProcessorResponse extends ArticleData {}