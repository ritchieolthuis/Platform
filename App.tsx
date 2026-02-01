
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import ArticleView from './components/ArticleView';
import SettingsPanel from './components/SettingsPanel';
import LibraryView from './components/LibraryView';
import { ArticleData, SourceType, HighlightOptions, User, UserSettings, WritingStyle, ColorMode, FontType, ReadingLevel } from './types';
import { processSource, translateHtml } from './services/parserService';
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
    respond: 'Respond',
    download: 'Download Offline Copy',
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

export default function App() {
  const [data, setData] = useState<ArticleData>({ id: '', title: "", content: "", excerpt: "" });
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'library'>('home');
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
    highlightOptions: {
      minLength: 150,
      keywords: [],
      color: '#cffafe'
    },
    customPrompt: '',
    language: 'English'
  });

  const [user, setUser] = useState<User | null>({
    id: 'ritchieolthuis',
    name: 'Ritchie Olthuis',
    avatar: 'https://ui-avatars.com/api/?name=Ritchie+Olthuis&background=1a8917&color=fff' 
  });
  const [library, setLibrary] = useState<ArticleData[]>([]);

  // Initial Sync Logic
  useEffect(() => {
    if (user) {
        ensureUserInDb(user).then(() => {
            // Load Settings from DB
            return getUserSettings(user.id);
        }).then(dbSettings => {
            if (dbSettings) {
                setSettings(prev => ({...prev, ...dbSettings}));
            }
            // Load Library from DB
            return getLibraryFromDb(user.id);
        }).then(dbLibrary => {
            if (dbLibrary.length > 0) {
                setLibrary(dbLibrary);
                localStorage.setItem('lumea-reader-library', JSON.stringify(dbLibrary));
            }
        }).catch(e => console.error("Initial Sync failed", e));
    }
  }, []);

  // PERMANENT MEMORY: Sync settings to DB on change
  const initialSettingsLoadRef = useRef(true);
  useEffect(() => {
    if (user) {
        // Skip first call if it was the load from DB
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
        { title: "UN Experts Warn of Global Job Displacement Risks in 2026", source: "UN News", url: "https://news.un.org/en/story/2026/01/1160452" },
        { title: "The Tiny Tech Revolutionizing What We Know About Biology", source: "CNN10", url: "https://www.youtube.com/watch?v=LXb3EKWsInQ" },
        { title: "Chinese Astronomers Trace Origin of Fast Radio Bursts", source: "Science Bulletin", url: "https://doi.org/10.1016/j.scib.2026.01.031" },
        { title: "TikTok Dominates 2026 Grammy Best New Artist Nominations", source: "LAist / NPR", url: "https://laist.com/news/tiktok-at-the-grammys-2026" }
      ];
      setDailyHighlights(highlights);
    }
  }, [currentView, data.content, settings.language]);

  const handleProcess = async (type: SourceType, source: string, sourceName?: string) => {
    setLoading(true);
    setCurrentView('home');
    try {
      const result = await processSource(
          type, source, settings.highlightOptions, settings.writingStyle,
          settings.customPrompt, sourceName, settings.readingLevel, settings.language
      );
      setData(result);
    } catch (error) {
      setData({ id: 'error', title: "Error", content: "<p>Processing failed.</p>", excerpt: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (lang: string) => {
    setSettings(prev => ({ ...prev, language: lang }));
    if (!data.content || data.id === 'error') return;
    setLoading(true);
    try {
      const translatedContent = await translateHtml(data.content, lang);
      setData(prev => ({ ...prev, content: translatedContent }));
    } catch (error) {
      alert("Translation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleTitleUpdate = (newTitle: string) => {
    setData(prev => ({ ...prev, title: newTitle }));
  };

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
    localStorage.setItem('lumea-reader-library', JSON.stringify(newLibrary));
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

  return (
    <div className={`min-h-screen antialiased relative transition-colors duration-300 ${isDarkMode ? 'bg-[#121212] text-medium-darkText' : 'bg-white text-medium-black'}`}>
      <Navbar onProcess={handleProcess} onAiQuery={handleAiQuery} onOpenAiPanel={handleOpenAiPanel} loading={loading} user={user} onLogin={handleLogin} onLogout={handleLogout} onToggleSettings={() => setShowSettings(!showSettings)} onNavigateHome={handleNavigateHome} onNavigateLibrary={() => setCurrentView('library')} onTranslate={handleTranslate} currentView={currentView} isDarkMode={isDarkMode} t={t} currentLanguage={settings.language} />
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onChange={setSettings} isDarkMode={isDarkMode} t={t} />
      <main className="w-full">
        {currentView === 'home' ? (
           <ArticleView data={data} loading={loading} onSave={user ? handleSaveToLibrary : undefined} isSaved={isCurrentArticleSaved} isDarkMode={isDarkMode} font={settings.font} fontSize={settings.fontSize} pageWidth={settings.pageWidth} onTitleChange={handleTitleUpdate} globalAiQuery={globalAiQuery} onGlobalAiQueryHandled={() => setGlobalAiQuery('')} highlightOptions={settings.highlightOptions} triggerAiPanel={triggerAiPanel} t={t} onNavigateLibrary={() => setCurrentView('library')} onNavigateHome={handleNavigateHome} onLoadDemo={(url) => handleProcess('url', url, 'Demo Article')} dailyHighlights={dailyHighlights} language={settings.language} />
        ) : (
           <LibraryView articles={library} onSelect={handleSelectFromLibrary} isDarkMode={isDarkMode} font={settings.font} t={t} />
        )}
      </main>
    </div>
  );
}
