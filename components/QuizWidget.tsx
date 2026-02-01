
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
  
  // Clean markdown artifacts like **text** to <b>text</b>
  const cleanMarkdown = (text: string): string => {
      if (!text) return "";
      return text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/__(.*?)__/g, '<i>$1</i>')
        .replace(/\n/g, '<br/>');
  };

  // Only used for Ask AI response or specific interactive elements
  const renderInteractiveText = (text: string) => {
      const dateRegex = /\b(?:(?:Jan(?:uary|uar|\.)?|Feb(?:ruary|ruar|\.)?|Ma(?:a)?r(?:t|ch|\.)?|Apr(?:il|\.)?|May|Mei|Jun(?:e|i|\.)?|Jul(?:i|\.)?|Aug(?:ust|ustus|\.)?|Sep(?:tember|\.)?|Okt(?:ober|ober|\.)?|Nov(?:ember|\.)?|Dec(?:ember|\.)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,)?\s+\d{4}|\d{1,2}\s+(?:Jan(?:uary|uar|\.)?|Feb(?:ruary|ruar|\.)?|Ma(?:a)?r(?:t|ch|\.)?|Apr(?:il|\.)?|May|Mei|Jun(?:i|\.)?|Jul(?:i|\.)?|Aug(?:ust|ustus|\.)?|Sep(?:tember|\.)?|Okt(?:ober|ober|\.)?|Nov(?:ember|\.)?|Dec(?:ember|\.)?)\s+\d{4})\b/gi;
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
                  return <span key={i} dangerouslySetInnerHTML={{ __html: cleanMarkdown(part) }} />;
              })}
          </span>
      );
  };

  const renderSidebarList = () => (
      <div className="mb-10 font-serif quiz-sidebar-section">
          <h3 className={`font-bold text-xl mb-4 border-b pb-2 ${isDarkMode ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-black'}`}>Quizzes</h3>
          
          <div className={`mb-6 p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800/40' : 'border-gray-100 bg-[#f9f9f9]'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Create Custom</p>
              <div className="flex gap-2">
                 <input type="text" value={customKeywords} onChange={(e) => setCustomKeywords(e.target.value)} placeholder="Keywords..." className={`flex-1 text-xs p-2 rounded border outline-none ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
                 <button onClick={() => generateQuizForLevel(difficulty, customKeywords)} disabled={loading || !customKeywords.trim()} className="w-10 flex items-center justify-center font-bold rounded bg-medium-green text-white hover:bg-green-700 transition-all">
                     {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
                 </button>
              </div>
          </div>

          <div className="space-y-6">
              {quizzes.length === 0 && loading ? (
                  <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-start gap-4 animate-pulse">
                              <div className={`w-14 h-14 rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                              <div className="flex-1 space-y-2 py-1">
                                  <div className={`h-4 w-3/4 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                                  <div className={`h-3 w-1/2 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  quizzes.map((quiz) => (
                      <div key={quiz.id} onClick={() => openQuizPage(quiz)} className="group flex items-start gap-4 cursor-pointer">
                          <div className="w-14 h-14 flex-shrink-0 overflow-hidden rounded-md bg-gray-200 relative shadow-sm">
                               <img src={quiz.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                               <h4 className={`font-serif font-bold text-[16px] leading-tight mb-1 group-hover:underline decoration-2 underline-offset-2 ${isDarkMode ? 'text-gray-100 decoration-gray-400' : 'text-[#242424] decoration-black'}`}>
                                   {quiz.title}
                               </h4>
                               <p className={`text-[10px] font-sans font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   {difficulty.toUpperCase()} • {quiz.questions.length} Q
                               </p>
                          </div>
                      </div>
                  ))
              )}
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
            .start-card { background: white; padding: 40px 50px; border-radius: 8px; text-align: center; position: relative; z-index: 10; max-width: 440px; width: 90%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .answer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; max-width: 900px; margin-top: 30px; }
            .opt-btn { background: white; border: 2px solid #e5e7eb; padding: 25px; border-radius: 8px; cursor: pointer; min-height: 120px; color: #1f2937; position: relative; font-size: 1.1rem; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .opt-btn:hover:not(:disabled) { border-color: #d1d5db; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .fact-box { background: ${THEME_LIGHT}; border-left: 5px solid #3c8dc5; padding: 30px; border-radius: 0 8px 8px 0; margin-top: 40px; width: 100%; max-width: 900px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            @media (max-width: 768px) { .answer-grid { grid-template-columns: 1fr; } }
        `}</style>
        
        {/* Navigation Bar */}
        <div className="sticky top-0 z-[10002] bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={closeQuizPage} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </button>
                <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-gray-900 leading-none">{activeQuiz.title}</h2>
                    <span className="text-xs text-gray-500 mt-0.5">Question {currentIndex + 1} of {activeQuiz.questions.length}</span>
                </div>
            </div>
            <button onClick={closeQuizPage} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        <div className="flex-1 flex flex-col bg-[#fafafa]">
            {!isStarted ? (
                <div className="w-full flex justify-center py-10">
                    <div className="quiz-hero-section">
                        <img className="hero-img-sharp" src={activeQuiz.thumbnailUrl} alt="Cover" />
                        <div className="start-card">
                            <h1 className="text-3xl font-serif font-bold mb-6 text-gray-900">{activeQuiz.title}</h1>
                            <p className="text-gray-500 mb-8 font-sans">Test your knowledge with {activeQuiz.questions.length} questions tailored for {difficulty} level.</p>
                            <button onClick={startQuestions} className="w-full py-3.5 bg-medium-green text-white font-bold rounded-full hover:bg-green-700 transition-all shadow-lg transform hover:-translate-y-0.5">
                                Start Quiz
                            </button>
                        </div>
                    </div>
                </div>
            ) : !showResult ? (
                <div className="flex-1 py-10 px-6 flex flex-col items-center">
                    <div className="w-full max-w-4xl">
                        <h1 className="text-2xl md:text-3xl font-serif font-bold leading-tight mb-8 text-gray-900">
                            {currentQuestion.question}
                        </h1>
                        
                        <div className="answer-grid mx-auto">
                            {currentQuestion.options.map((option, idx) => {
                                let styleAttr = {};
                                if (isAnswered) {
                                    if (idx === currentQuestion.correctAnswerIndex) styleAttr = { borderColor: THEME_ACCENT, backgroundColor: '#f0f9f0', fontWeight: 'bold' };
                                    else if (idx === selectedOption) styleAttr = { borderColor: THEME_ERROR, backgroundColor: '#fff5f5', opacity: 0.7 };
                                }
                                return ( 
                                    <button 
                                        key={idx} 
                                        onClick={() => handleAnswer(idx)} 
                                        disabled={isAnswered} 
                                        className="opt-btn text-left flex items-center" 
                                        style={styleAttr}
                                    >
                                        {option}
                                    </button> 
                                );
                            })}
                        </div>
                        
                        {isAnswered && (
                            <div className="fact-box animate-in slide-in-from-bottom-4 mx-auto">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-xs uppercase text-blue-800 tracking-wide">EXPLANATION</h4>
                                </div>
                                
                                {/* CLEAN EXPLANATION: Plain text with bolding, no blue links */}
                                <div className="text-lg leading-relaxed text-gray-800 font-serif" dangerouslySetInnerHTML={{ __html: cleanMarkdown(currentQuestion.explanation) }} />
                                
                                <div className="flex flex-wrap gap-3 mt-8">
                                    <button 
                                        onClick={handleAiContextAsk} 
                                        className="px-5 py-2.5 bg-white border-2 border-blue-600 text-blue-700 rounded-full font-bold text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                                        Ask AI details
                                    </button>
                                    
                                    <button 
                                        onClick={handleNext} 
                                        className="ml-auto px-8 py-2.5 bg-[#242424] text-white rounded-full font-bold text-sm hover:bg-black transition-colors shadow-md"
                                    >
                                        {currentIndex + 1 < activeQuiz.questions.length ? 'Next Question' : 'See Results'}
                                    </button>
                                </div>
                                
                                {showAiChat && (
                                    <div className="mt-6 pt-6 border-t border-blue-200 w-full animate-in fade-in">
                                        <div className="text-xs font-bold uppercase text-blue-600 mb-2">AI Analysis</div>
                                        <div className="text-sm text-gray-800 bg-white p-5 rounded-lg shadow-sm leading-relaxed border border-blue-100">
                                            {aiChatLoading ? (
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                                    Thinking...
                                                </div>
                                            ) : (
                                                /* INTERACTIVE AI RESPONSE: Blue links enabled here */
                                                renderInteractiveText(aiChatResponse)
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#fafafa]">
                    <div className="bg-white p-12 rounded-2xl shadow-xl max-w-lg w-full text-center border border-gray-100">
                        <div className="w-24 h-24 rounded-full bg-gray-100 mx-auto mb-6 flex items-center justify-center text-4xl">
                            {score > (activeQuiz.questions.length / 2) ? '🎉' : '📚'}
                        </div>
                        <h2 className="text-4xl font-serif font-bold mb-2 text-gray-900">{score} / {activeQuiz.questions.length}</h2>
                        <p className="text-gray-500 mb-8 text-lg">
                            {score === activeQuiz.questions.length ? "Perfect score! You're an expert." : "Great effort! Keep reading to improve."}
                        </p>
                        <button onClick={closeQuizPage} className="w-full py-3.5 bg-[#242424] text-white rounded-lg font-bold hover:bg-black transition-all">
                            Finish Review
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>,
    document.body
  );
};

export default QuizWidget;
