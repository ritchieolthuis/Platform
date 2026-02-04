
import React, { useState } from 'react';
import { ArticleData, AuditResult, DeepAuditResult } from '../types';
import { askAiAboutArticle } from '../services/parserService';

interface AuditDashboardProps {
  data: ArticleData;
  auditResult: AuditResult | null;
  deepResult: DeepAuditResult | null;
  language: string;
  isDarkMode: boolean;
  onBack: () => void;
}

const CircularProgress = ({ score, size = 120, strokeWidth = 10 }: { score: number, size?: number, strokeWidth?: number }) => {
    const percentage = Math.min(Math.max(score * 10, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    let color = 'text-red-500';
    if (score >= 8) color = 'text-green-500';
    else if (score >= 5) color = 'text-orange-500';
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90 w-full h-full">
                <circle className="text-gray-200 dark:text-gray-700" stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
                <circle className={`${color} transition-all duration-1000 ease-out`} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className={`text-4xl font-bold ${color}`}>{percentage}%</span>
                <span className="text-xs uppercase tracking-widest opacity-60 font-bold mt-1">Trust Score</span>
            </div>
        </div>
    );
};

const AuditDashboard: React.FC<AuditDashboardProps> = ({ data, auditResult, deepResult, language, isDarkMode, onBack }) => {
    const [activeTab, setActiveTab] = useState<'claims' | 'fallacies' | 'citations' | 'tone'>('claims');
    const [deepDiveData, setDeepDiveData] = useState<Record<string, { text: string; loading: boolean }>>({});

    const handleDeepDive = async (category: string, itemKey: string, promptContext: string) => {
        if (deepDiveData[itemKey]?.loading) return;
        setDeepDiveData(prev => ({ ...prev, [itemKey]: { text: '', loading: true } }));
        const query = `Analyze CATEGORY: ${category}. CONTEXT: ${promptContext}. Give critical analysis in ${language}. Bold ALL years (<b>1980</b>). NO Markdown.`;
        try {
            const response = await askAiAboutArticle(data.content || '', query, 'chat');
            setDeepDiveData(prev => ({ ...prev, [itemKey]: { text: response, loading: false } }));
        } catch (e) {
            setDeepDiveData(prev => ({ ...prev, [itemKey]: { text: 'Audit assistent kon niet laden.', loading: false } }));
        }
    };

    const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const textSec = isDarkMode ? 'text-gray-400' : 'text-gray-600';
    const bgCard = isDarkMode ? 'bg-[#1e1e1e] border-gray-700' : 'bg-white border-gray-200';

    if (!auditResult) return null;

    return (
        <div className="max-w-6xl mx-auto mt-8 mb-20 px-6 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={onBack} className={`mb-6 flex items-center gap-2 text-sm font-medium ${textSec} hover:${textMain}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Back to Home
            </button>

            <div className={`p-8 rounded-2xl border shadow-sm ${bgCard} mb-8`}>
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="flex-shrink-0"><CircularProgress score={auditResult.score} /></div>
                    <div className="flex-1 text-center md:text-left">
                        <div className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-3 ${auditResult.score >= 6 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {auditResult.score >= 6 ? 'BETROUWBAAR' : 'NIET BETROUWBAAR'}
                        </div>
                        <h1 className={`text-3xl font-bold font-serif mb-2 ${textMain}`}>{data.title}</h1>
                        <p className={`text-lg leading-relaxed ${textSec}`}>{auditResult.summary}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-8">
                 <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-print">
                     {['claims', 'fallacies', 'citations', 'tone'].map((tab) => (
                         <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab as any)} 
                            className={`px-8 py-3 text-[13px] font-bold uppercase tracking-[0.2em] transition-all relative
                                ${activeTab === tab 
                                    ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' 
                                    : 'text-gray-400 hover:text-gray-600'
                                }
                            `}
                         >
                             {tab}
                         </button>
                     ))}
                 </div>

                 <div className="grid grid-cols-1 gap-6">
                     {activeTab === 'claims' && deepResult?.claims.map((claim, i) => (
                         <div key={i} className={`p-8 rounded-xl border shadow-sm ${bgCard} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                             <div className="text-blue-500 text-[11px] font-bold uppercase tracking-[0.15em] mb-4">{(claim as any).category || 'HISTORICAL FACT'}</div>
                             <p className={`text-xl font-medium ${textMain} mb-6 leading-relaxed`}>"{claim.claim}"</p>
                             <button 
                                onClick={() => handleDeepDive('Claim', `claim-${i}`, claim.claim)} 
                                className={`flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                             >
                                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L12 2Z"></path></svg>
                                 {deepDiveData[`claim-${i}`]?.loading ? 'Analyzing...' : 'Ask AI'}
                             </button>
                             {deepDiveData[`claim-${i}`] && !deepDiveData[`claim-${i}`].loading && (
                                 <div className={`mt-6 p-4 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50/30 border-blue-100'}`} dangerouslySetInnerHTML={{ __html: deepDiveData[`claim-${i}`].text }}></div>
                             )}
                         </div>
                     ))}

                     {activeTab === 'citations' && (
                        <div className="space-y-6">
                            {(deepResult?.citations || []).length === 0 ? (
                                <div className="text-center py-20 opacity-40">No deep citations extracted.</div>
                            ) : (
                                deepResult?.citations.map((cite, i) => (
                                    <div key={i} className={`p-8 rounded-xl border shadow-sm ${bgCard} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className="text-purple-500 text-[11px] font-bold uppercase tracking-[0.15em] mb-4">{(cite as any).category || 'SOURCE QUOTE'}</div>
                                        <div className="flex gap-4">
                                            <div className="text-4xl font-serif text-gray-200 select-none">“</div>
                                            <div className="flex-1">
                                                <p className={`text-xl font-serif italic ${textMain} mb-6 leading-relaxed`}>{(cite as any).quote || (cite as any).context}</p>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                                                    <div className="flex flex-col">
                                                        <span className={`text-xs font-bold uppercase tracking-widest ${textSec} mb-1`}>Source</span>
                                                        <span className={`text-sm font-bold ${textMain}`}>{cite.source}</span>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex flex-col items-end">
                                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${textSec} mb-1`}>Credibility</span>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>{cite.credibility}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleDeepDive('Citation', `cite-${i}`, (cite as any).quote || cite.source)} 
                                                            className={`flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L12 2Z"></path></svg>
                                                            {deepDiveData[`cite-${i}`]?.loading ? 'Analyzing...' : 'Ask AI'}
                                                        </button>
                                                    </div>
                                                </div>
                                                {deepDiveData[`cite-${i}`] && !deepDiveData[`cite-${i}`].loading && (
                                                    <div className={`mt-6 p-4 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-purple-50/30 border-purple-100'}`} dangerouslySetInnerHTML={{ __html: deepDiveData[`cite-${i}`].text }}></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                     )}

                     {activeTab === 'fallacies' && deepResult?.fallacies.map((fal, i) => (
                         <div key={i} className={`p-8 rounded-xl border border-red-200 bg-red-50/20 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                             <div className="text-red-500 text-[11px] font-bold uppercase tracking-[0.15em] mb-4">{fal.name}</div>
                             <p className={`text-lg font-medium italic ${textMain} mb-4 leading-relaxed`}>"{fal.quote}"</p>
                             <p className={`text-sm ${textSec} mb-6 leading-relaxed`}>{fal.explanation}</p>
                             <button 
                                onClick={() => handleDeepDive('Fallacy', `fal-${i}`, fal.name)} 
                                className={`flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                             >
                                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L12 2Z"></path></svg>
                                 {deepDiveData[`fal-${i}`]?.loading ? 'Analyzing...' : 'Ask AI'}
                             </button>
                             {deepDiveData[`fal-${i}`] && !deepDiveData[`fal-${i}`].loading && (
                                 <div className={`mt-6 p-4 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-red-50 border-red-100'}`} dangerouslySetInnerHTML={{ __html: deepDiveData[`fal-${i}`].text }}></div>
                             )}
                         </div>
                     ))}

                     {activeTab === 'tone' && deepResult?.tone && (
                         <div className={`p-8 rounded-xl border shadow-sm ${bgCard} animate-in fade-in duration-500`}>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                 <div>
                                     <div className="flex justify-between mb-3"><span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Objective Analysis</span><span className="text-sm font-bold">{deepResult.tone.objectiveScore}%</span></div>
                                     <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${deepResult.tone.objectiveScore}%` }}></div></div>
                                 </div>
                                 <div>
                                     <div className="flex justify-between mb-3"><span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Emotional Weight</span><span className="text-sm font-bold">{deepResult.tone.emotionalScore}%</span></div>
                                     <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${deepResult.tone.emotionalScore}%` }}></div></div>
                                 </div>
                             </div>
                             <div className={`mt-10 p-10 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'} text-center`}>
                                 <span className="text-[11px] font-bold uppercase text-blue-500 mb-4 block tracking-widest">Dominant Tone</span>
                                 <p className={`text-4xl font-serif italic leading-tight ${textMain}`}>{deepResult.tone.dominantTone}</p>
                                 <div className={`mt-10 pt-10 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-sm leading-relaxed max-w-2xl mx-auto ${textSec}`}>
                                    {deepResult.authorAnalysis}
                                 </div>
                             </div>
                         </div>
                     )}
                 </div>
            </div>
        </div>
    );
};

export default AuditDashboard;
