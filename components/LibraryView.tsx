import React from 'react';
import { ArticleData, FontType } from '../types';

interface LibraryViewProps {
  articles: ArticleData[];
  onSelect: (article: ArticleData) => void;
  isDarkMode: boolean;
  font: FontType;
}

const LibraryView: React.FC<LibraryViewProps> = ({ articles, onSelect, isDarkMode, font }) => {
  const textMain = isDarkMode ? 'text-medium-darkText' : 'text-medium-black';
  const textSecondary = isDarkMode ? 'text-medium-darkGray' : 'text-gray-500';
  const borderCol = isDarkMode ? 'border-gray-800' : 'border-gray-100';

  const getFontClass = () => {
    switch(font) {
        case 'sans': return 'font-sans';
        case 'system': return 'font-system';
        case 'dyslexic': return 'font-dyslexic';
        default: return 'font-serif';
    }
  };

  if (articles.length === 0) {
    return (
      <div className={`max-w-[680px] mx-auto mt-24 text-center ${isDarkMode ? 'text-gray-400' : ''}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        </div>
        <h2 className="text-2xl font-bold font-serif mb-2">Your library is empty</h2>
        <p className="font-sans">Save articles to read them later. They will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[680px] mx-auto mt-12 px-6 md:px-0">
      <h1 className={`text-4xl font-bold font-serif mb-12 ${textMain}`}>My Library</h1>
      <div className="space-y-10">
        {articles.map((article) => (
          <div key={article.id} className={`group cursor-pointer border-b ${borderCol} pb-10`} onClick={() => onSelect(article)}>
            <div className="flex items-center space-x-2 mb-3">
               <div className="w-5 h-5 rounded-full bg-gray-200">
                 <img src="https://picsum.photos/50/50" className="w-full h-full rounded-full" />
               </div>
               <span className={`text-sm font-sans font-medium ${textMain}`}>Reader Bot</span>
               <span className={`text-sm font-sans ${textSecondary}`}>· {article.date}</span>
            </div>
            
            <div className="flex justify-between gap-6">
                <div className="flex-1">
                    <h2 className={`text-xl font-bold ${getFontClass()} mb-2 group-hover:underline ${isDarkMode ? 'decoration-white' : 'decoration-medium-black'} decoration-2 underline-offset-4 leading-tight ${textMain}`}>
                        {article.title}
                    </h2>
                    <p className={`${getFontClass()} ${textSecondary} line-clamp-2 md:line-clamp-3 leading-relaxed mb-4`}>
                        {article.excerpt.replace(/<[^>]*>?/gm, '')}
                    </p>
                    <div className={`flex items-center text-xs font-sans ${textSecondary}`}>
                        <span>{article.readTime}</span>
                        <span className="mx-2">·</span>
                        <span className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} px-2 py-1 rounded-full`}>{article.sourceType?.toUpperCase() || 'ARTICLE'}</span>
                    </div>
                </div>
                <div className={`hidden sm:block w-32 h-32 flex-shrink-0 bg-gray-100 overflow-hidden rounded-sm`}>
                   <img 
                      src={article.thumbnailUrl || `https://picsum.photos/seed/${article.id}/200/200`} 
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      onError={(e) => {
                          // Fallback if image fails
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${article.id}/200/200`;
                      }}
                   />
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LibraryView;