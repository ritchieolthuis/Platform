
import React, { useState } from 'react';
import { AuditResult, AuditPoint } from '../types';
import { runIntegrityCheck, askAiAboutArticle } from '../services/parserService';

interface AuditorWidgetProps {
  articleText: string;
  citations: string[];
  isDarkMode: boolean;
  language?: string;
}

const CircularProgress = ({ score, size = 60, strokeWidth = 5 }: { score: number, size?: number, strokeWidth?: number }) => {
    // Score is 1-10, convert to percentage 0-100
    const percentage = Math.min(Math.max(score * 10, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    let color = 'text-red-500';
    if (score >= 8) color = 'text-green-500';
    else if (score >= 5) color = 'text-orange-500';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Background Circle */}
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    className="text-gray-200 dark:text-gray-700"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress Circle */}
                <circle
                    className={`${color} transition-all duration-1000 ease-out`}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <span className={`absolute text-sm font-bold ${color}`}>
                {percentage}%
            </span>
        </div>
    );
};

const AuditorWidget: React.FC<AuditorWidgetProps> = ({ 
  articleText, 
  citations,
  isDarkMode,
  language = 'English'
}) => {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [deepDiveData, setDeepDiveData] = useState<Record<number, { text: string; loading: boolean }>>({});

  const runAudit = async () => {
    if (!articleText) return;
    setLoading(true);
    setResult(null);
    setDeepDiveData({});
    try {
        const auditData = await runIntegrityCheck(articleText, language, citations);
        setResult(auditData);
    } catch (e) {
        console.error("Audit failed", e);
    } finally {
        setLoading(false);
    }
  };

  const handleDeepDive = async (index: number, point: AuditPoint) => {
      if (deepDiveData[index]?.loading) return;
      
      setDeepDiveData(prev => ({ ...prev, [index]: { text: '', loading: true } }));
      
      const query = `Analyze this specific finding from the integrity audit:
      CATEGORY: ${point.category}
      FINDING: ${point.finding}
      DETAILS: ${point.details}
      
      Please provide a deeper analysis in clean text. Be critical and factual. Pose 2-3 specific questions for the reader. NO HTML TAGS. NO MARKDOWN. NO <b> TAGS.`;
      
      try {
          const response = await askAiAboutArticle(articleText, query, 'chat');
          setDeepDiveData(prev => ({ 
              ...prev, 
              [index]: { text: response, loading: false } 
          }));
      } catch (e) {
          setDeepDiveData(prev => ({ 
              ...prev, 
              [index]: { text: 'Kon geen extra analyse laden.', loading: false } 
          }));
      }
  };

  const getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
      switch(status) {
          case 'pass': return <svg className="text-green-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>;
          case 'warning': return <svg className="text-amber-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
          case 'fail': return <svg className="text-red-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
      }
  };

  const getVerdictStatus = (verdict: string) => {
      const v = verdict.toUpperCase();
      if (v.includes('BETROUWBAAR') && !v.includes('NIET')) return 'BETROUWBAAR';
      if (v.includes('RELIABLE') && !v.includes('NOT')) return 'RELIABLE';
      if (v.includes('NIET BETROUWBAAR') || v.includes('NOT RELIABLE')) return 'NIET BETROUWBAAR';
      return result && result.score >= 6 ? 'BETROUWBAAR' : 'NIET BETROUWBAAR';
  };

  // Clean raw text from AI of any residual markdown stars
  const cleanText = (txt: string) => {
      return txt.replace(/\*\*/g, '').replace(/###/g, '').replace(/---/g, '').replace(/<b>/g, '').replace(/<\/b>/g, '');
  }

  const textMain = isDarkMode ? 'text-gray-100' : 'text-medium-black';

  return (
    <div className={`fixed right-10 top-32 w-80 no-print animate-in fade-in slide-in-from-right-4 h-[calc(100vh-100px)] overflow-y-auto pr-2 custom-scrollbar hidden xl:block`}>
       <div className={`rounded-xl border shadow-sm ${isDarkMode ? 'bg-[#1e1e1e] border-gray-700' : 'bg-white border-gray-200'}`}>
          
          <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
             <div className="flex items-center gap-2">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                 </svg>
                 <h3 className={`font-bold font-serif ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Integrity Auditor</h3>
             </div>
             <button onClick={() => setIsOpen(!isOpen)} className="text-gray-400 hover:text-gray-600">
                {isOpen ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                )}
             </button>
          </div>

          {isOpen && (
              <div className="p-4">
                  {!result ? (
                      <div className="text-center py-6">
                          <p className={`text-sm mb-4 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Perform a Zero-Trust audit on this text. I will check evidence, logic, framing, and verify sources against the web.
                          </p>
                          <button 
                            onClick={runAudit} 
                            disabled={loading}
                            className={`w-full py-2.5 rounded font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${loading ? 'bg-gray-200 text-gray-500' : 'bg-gray-900 text-white hover:bg-black'}`}
                          >
                              {loading ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                                    Auditing...
                                  </>
                              ) : (
                                  'Run Integrity Audit'
                              )}
                          </button>
                      </div>
                  ) : (
                      <div className="animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex items-center justify-between mb-4">
                              <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Objectivity Score</span>
                              <CircularProgress score={result.score} size={50} />
                          </div>
                          
                          <div className={`p-3 rounded mb-5 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                              <p className={`font-bold text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{cleanText(result.verdict.split(':')[0])}</p>
                              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{cleanText(result.summary)}</p>
                          </div>

                          <div className="space-y-4 mb-6">
                              {result.points.map((point, i) => (
                                  <div key={i} className={`pb-3 border-b last:border-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                      <div className="flex items-center justify-between mb-1">
                                          <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{point.category}</span>
                                          {getStatusIcon(point.status)}
                                      </div>
                                      <div className={`font-medium text-sm mb-0.5 ${point.status === 'fail' ? 'text-red-500' : point.status === 'warning' ? 'text-amber-500' : isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {cleanText(point.finding)}
                                      </div>
                                      <p className={`text-xs leading-relaxed mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                          {cleanText(point.details)}
                                      </p>
                                      
                                      {/* ASK AI DEEP DIVE BUTTON - STYLED SAME AS GLOSSARY */}
                                      <button 
                                        onClick={() => handleDeepDive(i, point)}
                                        className={`mt-2 text-xs font-medium flex items-center gap-1 ${textMain} opacity-60 hover:opacity-100 hover:text-blue-600 transition-all`}
                                      >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                                          {deepDiveData[i]?.loading ? 'Analyzing...' : '✨ Ask AI for deep dive'}
                                      </button>

                                      {deepDiveData[i] && !deepDiveData[i].loading && (
                                          <div className={`mt-2 p-2 rounded text-xs animate-in fade-in slide-in-from-top-1 ${isDarkMode ? 'bg-blue-900/10 text-gray-300' : 'bg-blue-50 text-gray-700'} leading-relaxed`}>
                                              {cleanText(deepDiveData[i].text)}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>

                          {/* FINAL CONCLUSION SECTION */}
                          <div className={`mt-4 p-4 rounded-lg border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className={`text-xs font-bold tracking-widest uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Conclusion</h4>
                                    <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700"></div>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <div className={`inline-flex self-start px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                        ${getVerdictStatus(result.verdict) === 'BETROUWBAAR' || getVerdictStatus(result.verdict) === 'RELIABLE'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }
                                    `}>
                                        {getVerdictStatus(result.verdict)}
                                    </div>
                                    <div 
                                        className={`text-sm font-serif italic leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}
                                    >
                                        {cleanText(result.verdict.includes(':') ? result.verdict.split(':')[1].trim() : result.verdict)}
                                    </div>
                                    <p className={`text-[11px] mt-2 opacity-60 leading-tight ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        * This audit is factual and neutral. It highlights data points and raises critical questions to assist your decision-making.
                                    </p>
                                </div>
                          </div>
                          
                          <button onClick={runAudit} className={`mt-8 w-full text-xs underline py-2 rounded transition-colors ${isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'}`}>
                              Re-run Audit
                          </button>
                      </div>
                  )}
              </div>
          )}
       </div>
    </div>
  );
};

export default AuditorWidget;
