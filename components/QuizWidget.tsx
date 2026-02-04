
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateQuizFromContent, askAiAboutArticle } from '../services/parserService';
import { Quiz, QuizQuestion } from '../types';

interface QuizWidgetProps {
  articleTitle: string;
  articleContent: string;
  thumbnailUrl?: string;
  t: (key: string) => string;
  isDarkMode: boolean;
  language?: string;
  onNavigateToText?: (text: string) => void;
}

type Difficulty = 'Beginner' | 'Intermediate' | 'Expert';

const QuizWidget: React.FC<QuizWidgetProps> = ({ 
  articleTitle, 
  articleContent, 
  thumbnailUrl, 
  t, 
  isDarkMode,
  language = 'English',
  onNavigateToText
}) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('Intermediate');
  const [showHint, setShowHint] = useState(false);
  const [hintUsedCount, setHintUsedCount] = useState(0);
  const [customKeywords, setCustomKeywords] = useState('');
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiChatResponse, setAiChatResponse] = useState<string>('');
  const [aiChatLoading, setAiChatLoading] = useState(false);

  const THEME_BLUE = "#0f172a"; 
  const THEME_ACCENT = "#1a8917"; 
  const THEME_ERROR = "#d93025"; 
  const THEME_LIGHT = "#f2f8fc"; 

  const generateQuizForLevel = async (level: Difficulty, keywords?: string) => {
      setLoading(true);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = articleContent;
      const text = tempDiv.textContent || "";
      const generated = await generateQuizFromContent(text, language, [], level, keywords);
      const enriched = generated.map((q) => ({
            ...q,
            thumbnailUrl: q.thumbnailUrl || thumbnailUrl || 'https://images.unsplash.com/photo-1555662709-e9329589eb75?auto=format&fit=crop&w=1200&q=80'
      }));
      if (keywords) {
          setQuizzes(prev => [...enriched, ...prev]);
          if (enriched.length > 0) openQuizPage(enriched[0]);
          setCustomKeywords('');
      } else { setQuizzes(enriched); }
      setLoading(false);
  };

  useEffect(() => {
    if (articleContent && quizzes.length === 0 && !loading) generateQuizForLevel('Intermediate');
  }, [articleContent]);

  const handleDifficultyChange = (level: Difficulty) => { setDifficulty(level); generateQuizForLevel(level); };

  const openQuizPage = (quiz: Quiz) => {
      setActiveQuiz(quiz); setIsStarted(false); setCurrentIndex(0); setScore(0); setSelectedOption(null);
      setIsAnswered(false); setShowResult(false); setShowHint(false); setShowAiChat(false);
      document.body.style.overflow = 'hidden'; 
  };

  const startQuestions = () => setIsStarted(true);
  const closeQuizPage = () => { setActiveQuiz(null); setIsStarted(false); document.body.style.overflow = 'auto'; };
  
  const handleLinkClick = (text: string) => {
      if (onNavigateToText) {
          closeQuizPage();
          setTimeout(() => onNavigateToText(text), 100);
      }
  };

  const handleAnswer = (optionIndex: number) => {
      if (isAnswered || !activeQuiz) return;
      setSelectedOption(optionIndex);
      setIsAnswered(true);
      if (optionIndex === activeQuiz.questions[currentIndex].correctAnswerIndex) setScore(prev => prev + 1);
  };

  const handleNext = () => {
      if (!activeQuiz) return;
      setShowHint(false); setShowAiChat(false);
      if (currentIndex + 1 < activeQuiz.questions.length) {
          setCurrentIndex(prev => prev + 1); setSelectedOption(null); setIsAnswered(false);
      } else { setShowResult(true); }
  };

  const handleAiContextAsk = async () => {
      if (!activeQuiz) return;
      const currentQ = activeQuiz.questions[currentIndex];
      setShowAiChat(true); setAiChatLoading(true);
      const query = `Regarding "${currentQ.question}" with answer "${currentQ.options[currentQ.correctAnswerIndex]}". Explain why this is correct and give 2 facts. Be very brief. Use HTML list.`;
      const answer = await askAiAboutArticle(articleContent, query, 'chat');
      setAiChatResponse(answer); setAiChatLoading(false);
  };
  
  const renderInteractiveText = (text: string) => {
      /**
       * ULTIMATE REGEX (Priority order is key):
       * 1. Full Dates: Handles sequences like "January 15, 2026" or "15 januari 2026" as ONE match.
       * 2. Entities: STRICTLY 2+ capitalized words (handles hyphens like Human-Centric). Rejects mixed garbage like "ew sectors".
       * 3. Isolated Years: 19xx or 20xx anchors.
       */
      
      const dateRegex = /\b(?:(?:Jan(?:uary|uar|\.)?|Feb(?:ruary|ruar|\.)?|Ma(?:a)?r(?:t|ch|\.)?|Apr(?:il|\.)?|May|Mei|Jun(?:e|i|\.)?|Jul(?:i|\.)?|Aug(?:ust|ustus|\.)?|Sep(?:tember|\.)?|Okt(?:ober|ober|\.)?|Nov(?:ember|\.)?|Dec(?:ember|\.)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,)?\s+\d{4}|\d{1,2}\s+(?:Jan(?:uary|uar|\.)?|Feb(?:ruary|ruar|\.)?|Ma(?:a)?r(?:t|ch|\.)?|Apr(?:il|\.)?|May|Mei|Jun(?:i|\.)?|Jul(?:i|\.)?|Aug(?:ust|ustus|\.)?|Sep(?:tember|\.)?|Okt(?:ober|ober|\.)?|Nov(?:ember|\.)?|Dec(?:ember|\.)?)\s+\d{4})\b/gi;
      
      // Strict Entity Regex: Capitalized word followed by 1 or more capitalized words. Rejects lowercase starts.
      const entityRegex = /\b[A-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9'’-]*\s+[A-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9'’\s-]*\b/g;
      
      const yearRegex = /\b(?:19|20)\d{2}\b/g;
      
      const combinedRegex = new RegExp(`(${dateRegex.source}|${entityRegex.source}|${yearRegex.source})`, 'g');
      const parts = text.split(combinedRegex);
      
      return (
          <span>
              {parts.map((part, i) => {
                  if (!part) return null;
                  const isMatch = part.match(dateRegex) || part.match(entityRegex) || part.match(yearRegex);

                  if (isMatch) {
                      return (
                          <span 
                            key={i} onClick={(e) => { e.stopPropagation(); handleLinkClick(part); }}
                            className="font-bold text-blue-700 dark:text-blue-400 cursor-pointer border-b-2 border-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all px-0.5"
                          >
                              {part}
                          </span>
                      );
                  }
                  return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
              })}
          </span>
      );
  };

  const renderSidebarList = () => (
      <div className="mb-10 font-serif quiz-sidebar-section">
          <h3 className={`font-bold text-xl mb-4 border-b pb-2 ${isDarkMode ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-black'}`}>Quizzes</h3>
          <div className={`mb-6 p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Create Custom</p>
              <input type="text" value={customKeywords} onChange={(e) => setCustomKeywords(e.target.value)} placeholder="Keywords..." className={`w-full text-xs p-2 rounded border outline-none mb-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200'}`} />
              <button onClick={() => generateQuizForLevel(difficulty, customKeywords)} disabled={loading || !customKeywords.trim()} className="w-full py-1.5 text-[11px] font-bold rounded flex items-center justify-center gap-1 bg-medium-green text-white hover:bg-green-700 transition-all">
                  {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Generate Quiz"}
              </button>
          </div>
          <div className="space-y-4">
              {quizzes.map((quiz) => (
                  <div key={quiz.id} onClick={() => openQuizPage(quiz)} className={`group flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                      <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-200 relative"><img src={quiz.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /><div className="absolute inset-0 bg-black/10 group-hover:bg-transparent"></div></div>
                      <div className="flex-1"><h4 className={`font-bold text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{quiz.title}</h4><p className="text-[10px] uppercase text-gray-500 font-bold">{difficulty} • {quiz.questions.length} Q</p></div>
                  </div>
              ))}
          </div>
      </div>
  );

  if (!activeQuiz) return renderSidebarList();
  const currentQuestion = activeQuiz.questions[currentIndex];

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-[#fafafa] flex flex-col font-sans animate-in fade-in duration-200 overflow-y-auto w-screen h-screen">
        <style>{`
            .quiz-hero-section { width: 90%; max-width: 800px; min-height: 500px; margin: 40px auto; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
            .hero-img-sharp { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2; }
            .start-card { background: white; padding: 40px 50px; border-radius: 8px; text-align: center; position: relative; z-index: 10; max-width: 440px; width: 90%; }
            .answer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; max-width: 900px; margin-top: 30px; }
            .opt-btn { background: white; border: 2px solid #e5e7eb; padding: 25px; border-radius: 8px; cursor: pointer; min-height: 120px; color: #1f2937; position: relative; }
            .fact-box { background: ${THEME_LIGHT}; border-left: 5px solid #3c8dc5; padding: 25px 30px; border-radius: 0 8px 8px 0; margin-top: 40px; width: 100%; max-width: 900px; }
            @media (max-width: 768px) { .answer-grid { grid-template-columns: 1fr; } }
        `}</style>
        <div className="sticky top-0 z-[10002] bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4"><button onClick={closeQuizPage} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg></button><h2 className="text-lg font-bold">{activeQuiz.title}</h2></div>
            <button onClick={closeQuizPage} className="p-2 bg-gray-100 rounded-full text-gray-500"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
        <div className="flex-1 flex flex-col bg-[#fafafa]">
            {!isStarted ? (
                <div className="w-full flex justify-center"><div className="quiz-hero-section"><img className="hero-img-sharp" src={activeQuiz.thumbnailUrl} /><div className="start-card"><h1 className="text-3xl font-serif font-bold mb-6">{activeQuiz.title}</h1><button onClick={startQuestions} className="w-full py-3 bg-medium-green text-white font-bold rounded-lg hover:bg-green-700 transition-all">Start Quiz</button></div></div></div>
            ) : !showResult ? (
                <div className="flex-1 py-16 px-6 flex flex-col items-center">
                    <div className="w-full max-w-4xl"><h1 className="text-2xl md:text-4xl font-serif font-bold leading-tight mb-8">{currentQuestion.question}</h1>
                        <div className="answer-grid mx-auto">
                            {currentQuestion.options.map((option, idx) => {
                                let styleAttr = {};
                                if (isAnswered) {
                                    if (idx === currentQuestion.correctAnswerIndex) styleAttr = { borderColor: THEME_ACCENT, backgroundColor: '#f0f9f0', fontWeight: 'bold' };
                                    else if (idx === selectedOption) styleAttr = { borderColor: THEME_ERROR, backgroundColor: '#fff5f5' };
                                }
                                return ( <button key={idx} onClick={() => handleAnswer(idx)} disabled={isAnswered} className="opt-btn" style={styleAttr}>{option}</button> );
                            })}
                        </div>
                        {isAnswered && (
                            <div className="fact-box animate-in slide-in-from-bottom-4 mx-auto">
                                <h4 className="font-bold text-xs uppercase mb-1">Explanation</h4>
                                <div className="text-lg leading-relaxed">{renderInteractiveText(currentQuestion.explanation)}</div>
                                <div className="flex gap-3 mt-6"><button onClick={handleAiContextAsk} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md font-bold text-sm">Ask AI details</button><button onClick={handleNext} className="ml-auto px-6 py-2 bg-gray-900 text-white rounded-md font-bold text-sm">Next Question</button></div>
                                {showAiChat && (<div className="mt-4 pt-4 border-t border-blue-100 w-full text-sm text-gray-800 bg-white p-4 rounded shadow-sm leading-relaxed">{aiChatLoading ? 'Thinking...' : renderInteractiveText(aiChatResponse)}</div>)}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6"><div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center border border-gray-100"><h2 className="text-3xl font-serif font-bold mb-8">Score: {score} / {activeQuiz.questions.length}</h2><button onClick={closeQuizPage} className="w-full py-3 bg-gray-900 text-white rounded-lg font-bold">Finish</button></div></div>
            )}
        </div>
    </div>,
    document.body
  );
};

export default QuizWidget;
