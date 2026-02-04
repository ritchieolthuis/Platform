
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import ArticleView from './components/ArticleView';
import SettingsPanel from './components/SettingsPanel';
import LibraryView from './components/LibraryView';
import AuditDashboard from './components/AuditDashboard';
import { ArticleData, SourceType, HighlightOptions, User, UserSettings, WritingStyle, ColorMode, FontType, ReadingLevel, AuditResult, DeepAuditResult } from './types';
import { processSource, translateHtml, runIntegrityCheck, runDeepAnalysis } from './services/parserService';
import { ensureUserInDb, saveArticleToLibrary, getLibraryFromDb, saveUserSettings, getUserSettings } from './services/firebase';

// --- UI Translations ---
const UI_TEXT: Record<string, any> = {
  'English': {
    text: 'Text',
    small: 'Small',
    standard: 'Standard',
    large: 'Large',
    pageWidth: 'Page Width',
    fullWidth: 'Full Width',
    upload: 'Upload File',
    library: 'My Library',
    searchPlaceholder: 'Paste URL or ask AI...',
    ready: 'Ready to read?',
    readyDesc: 'Paste a URL, or upload a PDF, DOCX, or HTML file.',
    myLibrary: 'My Library',
    emptyLibrary: 'Your library is empty',
    saveLater: 'Save articles to read them later.',
    signIn: 'Sign In',
    customize: 'Customize',
    writingStyle: 'Writing Style',
    appearance: 'Appearance',
    colorMode: 'Color Mode',
    font: 'Font',
    focusHighlights: 'Focus & Highlights',
    keywords: 'Keywords',
    keywordsPlaceholder: 'Keywords (e.g., AI, Tech)',
    customFocus: 'Custom Focus Prompt',
    customFocusPlaceholder: 'E.g., Focus on financial statistics...',
    account: 'Account',
    language: 'Language',
    signOut: 'Sign Out',
    saveToLibrary: 'Save to Library',
    share: 'Share',
    responses: 'Responses',
    respond: 'Reageren',
    download: 'Download Offline Kopie',
    generateMore: 'Generate More',
    sourceCitation: 'Source Citation',
    topQuestions: 'Top Questions',
    quickSummary: 'Quick Summary',
    askAnything: 'Ask Anything',
    tableOfContents: 'Table of Contents',
    hide: 'Hide',
    show: 'Show',
    highlightLength: 'Highlight Length',
    readingLevel: 'Reading Level',
    levelBeginner: 'Beginner',
    levelIntermediate: 'Intermediate',
    levelExpert: 'Expert',
    styleNormal: 'Normal',
    styleLearning: 'Learning',
    styleConcise: 'Concise',
    styleExplanatory: 'Explanatory',
    styleFormal: 'Formal',
    descNormal: 'Default Medium style',
    descLearning: 'Simple explanations',
    descConcise: 'Short & to the point',
    descExplanatory: 'Deep dive details',
    descFormal: 'Academic & objective',
    modeLight: 'Light',
    modeAuto: 'Auto',
    modeDark: 'Dark',
    smartCitations: 'Smart Citations',
    citationsDesc: 'Click a quote to jump to it in the text. Exact source citations.',
    tryNow: 'Try these today'
  },
  'Nederlands': {
    text: 'Tekst',
    small: 'Klein',
    standard: 'Standaard',
    large: 'Groot',
    pageWidth: 'Paginabreedte',
    fullWidth: 'Volle breedte',
    upload: 'Bestand Uploaden',
    library: 'Mijn Bibliotheek',
    searchPlaceholder: 'Plak URL of vraag AI...',
    ready: 'Klaar om te lezen?',
    readyDesc: 'Plak een URL of upload een PDF, DOCX of HTML bestand.',
    myLibrary: 'Mijn Bibliotheek',
    emptyLibrary: 'Je bibliotheek is leeg',
    saveLater: 'Sla artikelen op om ze later te lezen.',
    signIn: 'Inloggen',
    customize: 'Aanpassen',
    writingStyle: 'Schrijfstijl',
    appearance: 'Weergave',
    colorMode: 'Kleurmodus',
    font: 'Lettertype',
    focusHighlights: 'Focus & Markeringen',
    keywords: 'Trefwoorden',
    keywordsPlaceholder: 'Trefwoorden (bijv. AI, Tech)',
    customFocus: 'Extra Focus Instructie',
    customFocusPlaceholder: 'Bijv. focus op financiële statistieken...',
    account: 'Account',
    language: 'Taal',
    signOut: 'Uitloggen',
    saveToLibrary: 'Opslaan in Bibliotheek',
    share: 'Delen',
    responses: 'Reacties',
    respond: 'Reageren',
    download: 'Download Offline Kopie',
    generateMore: 'Meer Genereren',
    sourceCitation: 'Bronvermelding',
    topQuestions: 'Veelgestelde Vragen',
    quickSummary: 'Korte Samenvatting',
    askAnything: 'Vraag Alles',
    tableOfContents: 'Inhoud',
    hide: 'verbergen',
    show: 'tonen',
    highlightLength: 'Markeringslengte',
    readingLevel: 'Leesniveau',
    levelBeginner: 'Beginner',
    levelIntermediate: 'Intermediair',
    levelExpert: 'Expert',
    styleNormal: 'Normaal',
    styleLearning: 'Leren',
    styleConcise: 'Beknopt',
    styleExplanatory: 'Uitleggend',
    styleFormal: 'Formeel',
    descNormal: 'Standaard Medium stijl',
    descLearning: 'Simpele uitleg',
    descConcise: 'Kort & bondig',
    descExplanatory: 'Diepgaande details',
    descFormal: 'Academisch & objectief',
    modeLight: 'Licht',
    modeAuto: 'Auto',
    modeDark: 'Donker',
    smartCitations: 'Slimme Citaten',
    citationsDesc: 'Klik op een citaat om naar de tekst te gaan. Exacte bronvermeldingen.',
    tryNow: 'Probeer dit vandaag'
  }
};

const getUiText = (lang: string, key: string) => {
   const dict = UI_TEXT[lang] || UI_TEXT['English'];
   return dict[key] || UI_TEXT['English'][key] || key;
};

// --- Custom Real-time Loading Overlay ---
const LoadingOverlay: React.FC<{ progress: number; message: string; isDarkMode: boolean }> = ({ progress, message, isDarkMode }) => {
  const roundedProgress = Math.min(Math.round(progress), 100);
  const strokeDasharray = 251.2;
  const offset = strokeDasharray - (Math.min(progress, 100) / 100) * strokeDasharray;

  return (
    <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center transition-all duration-500 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <div className="relative w-44 h-44 mb-16 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle className={`${isDarkMode ? 'text-gray-800' : 'text-gray-100'}`} cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle className="text-blue-500 transition-all duration-500 ease-out" cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray={strokeDasharray} strokeDashoffset={offset} strokeLinecap="round" fill="none" />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-2xl font-bold font-sans ${isDarkMode ? 'text-white' : 'text-[#1a1a1b]'}`}>
          {roundedProgress}%
        </div>
      </div>
      <div className="text-center px-10 max-w-4xl w-full">
        <h2 className={`text-3xl md:text-5xl font-bold font-sans mb-12 leading-tight transition-all duration-300 break-words whitespace-pre-line ${isDarkMode ? 'text-white' : 'text-[#1a1a1b]'}`}>
          {message}
        </h2>
        <div className="w-full max-w-[800px] mx-auto flex flex-col items-center">
            <div className={`w-full h-1.5 rounded-full overflow-hidden mb-12 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className="h-full bg-blue-500 transition-all duration-700 ease-out" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <p className={`text-[12px] uppercase tracking-[0.5em] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                PROCESSING DATA
            </p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [data, setData] = useState<ArticleData>({ id: '', title: "", content: "", excerpt: "" });
  const [auditResults, setAuditResults] = useState<{ result: AuditResult | null; deep: DeepAuditResult | null }>({ result: null, deep: null });
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentView, setCurrentView] = useState<'home' | 'library' | 'auditor'>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [globalAiQuery, setGlobalAiQuery] = useState<string>(''); 
  const [triggerAiPanel, setTriggerAiPanel] = useState<number>(0);
  const [dailyHighlights, setDailyHighlights] = useState<any[]>([]);
  
  const [settings, setSettings] = useState<UserSettings>({
    readingLevel: 'intermediate',
    writingStyle: 'normal',
    colorMode: 'light',
    font: 'serif',
    fontSize: 'standard',
    pageWidth: 'standard',
    highlightOptions: { minLength: 150, keywords: [], color: '#cffafe' },
    customPrompt: '',
    language: 'English'
  });

  const [user, setUser] = useState<User | null>({
    id: 'ritchieolthuis',
    name: 'Ritchie Olthuis',
    avatar: 'https://ui-avatars.com/api/?name=Ritchie+Olthuis&background=1a8917&color=fff' 
  });
  const [library, setLibrary] = useState<ArticleData[]>([]);

  const progressTimerRef = useRef<number | null>(null);
  const targetProgressRef = useRef(0);

  const startLoadingAnimation = (initialMessage: string) => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage(initialMessage);
    targetProgressRef.current = 5;

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    progressTimerRef.current = window.setInterval(() => {
      setLoadingProgress(prev => {
        if (prev < targetProgressRef.current) {
          const distance = targetProgressRef.current - prev;
          const step = Math.max(0.1, distance / 20);
          return prev + step;
        }
        if (prev < 99.5) return prev + 0.01;
        return prev;
      });
    }, 40);
  };

  const updateLoadingStage = (target: number, message: string) => {
    if (target > targetProgressRef.current) {
      targetProgressRef.current = Math.min(target, 99);
    }
    setLoadingMessage(message);
  };

  const finishLoadingAnimation = () => {
    targetProgressRef.current = 100;
    const checkCompletion = setInterval(() => {
        setLoadingProgress(prev => {
           if (prev >= 99.9) {
               clearInterval(checkCompletion);
               setTimeout(() => {
                   setLoading(false);
                   if (progressTimerRef.current) clearInterval(progressTimerRef.current);
               }, 300);
               return 100;
           }
           return prev + 1;
        });
    }, 30);
  };

  useEffect(() => {
    if (user) {
        ensureUserInDb(user).then(() => getUserSettings(user.id))
        .then(dbSettings => {
            if (dbSettings) setSettings(prev => ({...prev, ...dbSettings}));
            return getLibraryFromDb(user.id);
        }).then(dbLibrary => {
            if (dbLibrary.length > 0) {
                setLibrary(dbLibrary);
                localStorage.setItem('lumea-reader-library', JSON.stringify(dbLibrary));
            }
        }).catch(e => console.error("Initial Sync failed", e));
    }
  }, []);

  const initialSettingsLoadRef = useRef(true);
  useEffect(() => {
    if (user) {
        if (initialSettingsLoadRef.current) {
            initialSettingsLoadRef.current = false;
            return;
        }
        saveUserSettings(user.id, settings);
    }
    localStorage.setItem('lumea-reader-settings', JSON.stringify(settings));
  }, [settings, user]);

  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    if (settings.colorMode === 'auto') {
      const matchDark = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(matchDark.matches);
      const listener = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      matchDark.addEventListener('change', listener);
      return () => matchDark.removeEventListener('change', listener);
    } else {
      setIsDarkMode(settings.colorMode === 'dark');
    }
  }, [settings.colorMode]);

  useEffect(() => {
    if (currentView === 'home' && !data.content && !loading) {
      const highlights = [
        { title: "Hannibal Barca: The General Who Terrified Rome", source: "Britannica (Cached)", url: "https://www.britannica.com/biography/Hannibal-Carthaginian-general-247-183-BCE/Exile-and-death" },
        { title: "UN Experts Warn of Global Job Displacement Risks in 2026", source: "UN News", url: "https://news.un.org/en/story/2026/01/1160452" },
        { title: "The Tiny Tech Revolutionizing What We Know About Biology", source: "CNN10", url: "https://www.youtube.com/watch?v=LXb3EKWsInQ" },
        { title: "Chinese Astronomers Trace Origin of Fast Radio Bursts", source: "Science Bulletin", url: "https://doi.org/10.1016/j.scib.2026.01.031" }
      ];
      setDailyHighlights(highlights);
    }
  }, [currentView, data.content, settings.language]);

  const handleProcess = async (type: SourceType, source: string, sourceName?: string) => {
    const isCached = source === "https://www.britannica.com/biography/Hannibal-Carthaginian-general-247-183-BCE/Exile-and-death";
    startLoadingAnimation(`Accessing Source:\n${sourceName || source}`);
    try {
      if (isCached) {
        updateLoadingStage(40, `Retrieving Cached Data:\n${sourceName || source}`);
        await new Promise(r => setTimeout(r, 800)); // Fast mock delay
      } else {
        updateLoadingStage(20, `Processing Source:\n${sourceName || source}`);
      }
      
      const result = await processSource(
          type, source, settings.highlightOptions, settings.writingStyle,
          settings.customPrompt, sourceName, settings.readingLevel, settings.language
      );
      
      updateLoadingStage(70, `Formatting Article:\n${result.title}`);
      await new Promise(r => setTimeout(r, isCached ? 400 : 800));
      updateLoadingStage(90, `Injecting AI Metadata:\n${result.title}`);
      
      setData(result);
      setCurrentView('home');
      
      if (user && result.id !== 'error') {
          await saveArticleToLibrary(user.id, result);
      }
      finishLoadingAnimation();
    } catch (error) {
      setData({ id: 'error', title: "Error", content: "<p>Processing failed.</p>", excerpt: "", sourceType: type });
      finishLoadingAnimation();
    }
  };

  const handleAudit = async (type: SourceType, source: string, sourceName?: string) => {
    startLoadingAnimation(`Accessing Source:\n${sourceName || source}`);
    try {
      updateLoadingStage(15, `Processing Source:\n${sourceName || source}`);
      const result = await processSource(
          type, source, settings.highlightOptions, settings.writingStyle,
          settings.customPrompt, sourceName, settings.readingLevel, settings.language
      );
      
      updateLoadingStage(40, `Auditing Integrity:\n${result.title}`);
      const citations = result.citations?.map(c => c.source) || [result.sourceUrl || ""];
      const auditData = await runIntegrityCheck(result.content, settings.language, citations);
      
      updateLoadingStage(70, `Deep Analysis:\n${result.title}`);
      const deepData = await runDeepAnalysis(result.content, settings.language);
      
      updateLoadingStage(95, `Generating Verdict:\n${result.title}`);
      
      setData(result);
      setAuditResults({ result: auditData, deep: deepData });
      setCurrentView('auditor');
      
      finishLoadingAnimation();
    } catch (error) {
      setData({ id: 'error', title: "Error", content: "<p>Audit failed.</p>", excerpt: "", sourceType: type });
      finishLoadingAnimation();
    }
  };

  const handleProcessMultiple = async (items: { type: SourceType, value: string, name: string }[]) => {
    startLoadingAnimation(`Processing 1/${items.length}:\n${items[0].name}`);
    const processedArticles: ArticleData[] = [];
    try {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const baseProgress = (i / items.length) * 100;
            updateLoadingStage(baseProgress + 5, `Processing ${i+1}/${items.length}:\n${item.name}`);
            const result = await processSource(
                item.type, item.value, settings.highlightOptions, settings.writingStyle,
                settings.customPrompt, item.name, settings.readingLevel, settings.language
            );
            if (result.id !== 'error') {
                processedArticles.push(result);
                if (user) await saveArticleToLibrary(user.id, result);
            }
            updateLoadingStage(baseProgress + (95/items.length), `Finalizing ${item.name}...`);
        }
        if (processedArticles.length > 0) {
            setData(processedArticles[processedArticles.length - 1]);
            setLibrary(prev => {
                const newLib = [...processedArticles, ...prev];
                return Array.from(new Map(newLib.map(a => [a.id, a])).values());
            });
            setCurrentView('home');
        }
        finishLoadingAnimation();
    } catch (error) {
        finishLoadingAnimation();
    }
  };

  const handleTranslate = async (lang: string) => {
    setSettings(prev => ({ ...prev, language: lang }));
    if (!data.content || data.id === 'error') return;
    startLoadingAnimation(`Translating:\n${data.title}`);
    try {
      updateLoadingStage(50, `Translating:\n${data.title}`);
      const translatedContent = await translateHtml(data.content, lang);
      updateLoadingStage(90, `Re-formatting:\n${data.title}`);
      setData(prev => ({ ...prev, content: translatedContent }));
      finishLoadingAnimation();
    } catch (error) { finishLoadingAnimation(); }
  };

  const handleTitleUpdate = (newTitle: string) => setData(prev => ({ ...prev, title: newTitle }));

  const handleLogin = async () => {
    const mockUser = { id: 'ritchieolthuis', name: 'Ritchie Olthuis', avatar: 'https://ui-avatars.com/api/?name=Ritchie+Olthuis&background=1a8917&color=fff' };
    setUser(mockUser);
    try {
        await ensureUserInDb(mockUser);
        const dbSettings = await getUserSettings(mockUser.id);
        if (dbSettings) setSettings(dbSettings);
        const dbLibrary = await getLibraryFromDb(mockUser.id);
        if (dbLibrary.length > 0) setLibrary(dbLibrary);
    } catch (e) {}
  };

  const handleLogout = () => { setUser(null); setLibrary([]); };

  const handleSaveToLibrary = async (article: ArticleData) => {
    if (!user) return;
    const existingIndex = library.findIndex(item => item.id === article.id);
    let newLibrary = existingIndex >= 0 ? [...library] : [article, ...library];
    if (existingIndex >= 0) newLibrary[existingIndex] = article;
    setLibrary(newLibrary);
    try { await saveArticleToLibrary(user.id, article); } catch (e) {}
  };

  const handleSelectFromLibrary = (article: ArticleData) => { setData(article); setCurrentView('home'); };
  const handleAiQuery = (query: string) => { setGlobalAiQuery(query); setCurrentView('home'); };
  const handleOpenAiPanel = () => { if (currentView !== 'home') setCurrentView('home'); setTriggerAiPanel(prev => prev + 1); }
  const handleNavigateHome = () => { setCurrentView('home'); setData({ id: '', title: "", content: "", excerpt: "" }); };

  const isCurrentArticleSaved = library.some(item => item.id === data.id);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#121212';
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
    }
  }, [isDarkMode]);

  const t = (key: string) => getUiText(settings.language, key);

  const IntegrityCheckerHero = () => {
    const [auditInput, setAuditInput] = useState('');
    const handleLocalAudit = () => { if (!auditInput.trim()) return; handleAudit('url', auditInput.trim(), auditInput.trim()); };
    return (
        <div className={`p-10 rounded-3xl border-2 mb-16 shadow-lg flex flex-col items-center text-center transition-all ${isDarkMode ? 'bg-[#1a1a1b] border-blue-900/30' : 'bg-blue-50/30 border-blue-100'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h2 className={`text-3xl font-bold font-serif mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Deep Integrity Verification</h2>
            <p className={`text-base mb-8 max-w-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Zero-Trust validation of any URL or PDF. Analyzing framing, logic, and verifying all claims against the web.</p>
            <div className="w-full max-w-lg flex gap-2">
                <input type="text" value={auditInput} onChange={(e) => setAuditInput(e.target.value)} placeholder="Enter URL to audit..." className={`flex-1 px-5 py-3 rounded-full border outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-black'}`} />
                <button onClick={handleLocalAudit} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all shadow-md active:scale-95">Audit</button>
            </div>
        </div>
    );
  };

  return (
    <div className={`min-h-screen antialiased relative transition-colors duration-300 ${isDarkMode ? 'bg-[#121212] text-medium-darkText' : 'bg-white text-medium-black'}`}>
      {loading && <LoadingOverlay progress={loadingProgress} message={loadingMessage} isDarkMode={isDarkMode} />}
      <Navbar onProcess={handleProcess} onAudit={handleAudit} onProcessMultiple={handleProcessMultiple} onAiQuery={handleAiQuery} onOpenAiPanel={handleOpenAiPanel} loading={loading} user={user} onLogin={handleLogin} onLogout={handleLogout} onToggleSettings={() => setShowSettings(!showSettings)} onNavigateHome={handleNavigateHome} onNavigateLibrary={() => setCurrentView('library')} onTranslate={handleTranslate} currentView={currentView} isDarkMode={isDarkMode} t={t} currentLanguage={settings.language} />
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onChange={setSettings} isDarkMode={isDarkMode} t={t} />
      <main className="w-full">
        {currentView === 'home' && (
           <div className="flex flex-col">
              {!data.content && <div className="max-w-[800px] mx-auto mt-16 px-6"><IntegrityCheckerHero /></div>}
              <ArticleView data={data} loading={false} onSave={user ? handleSaveToLibrary : undefined} isSaved={isCurrentArticleSaved} isDarkMode={isDarkMode} font={settings.font} fontSize={settings.fontSize} pageWidth={settings.pageWidth} onTitleChange={handleTitleUpdate} globalAiQuery={globalAiQuery} onGlobalAiQueryHandled={() => setGlobalAiQuery('')} highlightOptions={settings.highlightOptions} triggerAiPanel={triggerAiPanel} t={t} onNavigateLibrary={() => setCurrentView('library')} onNavigateHome={handleNavigateHome} onLoadDemo={(url, title) => handleProcess('url', url, title)} dailyHighlights={dailyHighlights} language={settings.language} currentUser={user} />
           </div>
        )}
        {currentView === 'library' && <LibraryView articles={library} onSelect={handleSelectFromLibrary} isDarkMode={isDarkMode} font={settings.font} t={t} />}
        {currentView === 'auditor' && <AuditDashboard data={data} auditResult={auditResults.result} deepResult={auditResults.deep} language={settings.language} isDarkMode={isDarkMode} onBack={handleNavigateHome} />}
      </main>
    </div>
  );
}
