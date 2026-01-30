import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ArticleView from './components/ArticleView';
import SettingsPanel from './components/SettingsPanel';
import LibraryView from './components/LibraryView';
import { ArticleData, SourceType, HighlightOptions, User, UserSettings, WritingStyle, ColorMode, FontType } from './types';
import { processSource, translateHtml } from './services/parserService';
import { ensureUserInDb, saveArticleToLibrary, getLibraryFromDb } from './services/firebase';

export default function App() {
  // State
  const [data, setData] = useState<ArticleData>({ id: '', title: "", content: "", excerpt: "" });
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'library'>('home');
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State with Persistence
  const [settings, setSettings] = useState<UserSettings>({
    writingStyle: 'normal',
    colorMode: 'light',
    font: 'serif',
    highlightOptions: {
      minLength: 150,
      keywords: [],
      color: '#cffafe'
    },
    customPrompt: ''
  });

  // User & Library
  // Default logged in user: ritchieolthuis@gmail.com
  const [user, setUser] = useState<User | null>({
    id: 'ritchieolthuis',
    name: 'Ritchie Olthuis',
    avatar: 'https://ui-avatars.com/api/?name=Ritchie+Olthuis&background=1a8917&color=fff' 
  });
  const [library, setLibrary] = useState<ArticleData[]>([]);

  // Load library & settings from local storage on boot (Fallback)
  useEffect(() => {
    const savedLibrary = localStorage.getItem('medium-clone-library');
    if (savedLibrary) {
      setLibrary(JSON.parse(savedLibrary));
    }
    const savedSettings = localStorage.getItem('medium-clone-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Auto-sync initial user with DB
    if (user) {
        ensureUserInDb(user).then(() => {
            return getLibraryFromDb(user.id);
        }).then(dbLibrary => {
            if (dbLibrary.length > 0) {
                setLibrary(dbLibrary);
                localStorage.setItem('medium-clone-library', JSON.stringify(dbLibrary));
            }
        }).catch(e => console.error("Initial DB Sync failed", e));
    }
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    localStorage.setItem('medium-clone-settings', JSON.stringify(settings));
  }, [settings]);

  // Determine effective Dark Mode
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

  const handleProcess = async (type: SourceType, source: string) => {
    setLoading(true);
    setCurrentView('home');
    try {
      const result = await processSource(
          type, 
          source, 
          settings.highlightOptions, 
          settings.writingStyle,
          settings.customPrompt
      );
      setData(result);
    } catch (error) {
      console.error("Failed to process", error);
      setData({ 
        id: 'error',
        title: "Error", 
        content: "<p>Something went wrong processing your document.</p>",
        excerpt: ""
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (lang: string) => {
    if (!data.content || data.id === 'error') return;
    
    setLoading(true);
    try {
      const translatedContent = await translateHtml(data.content, lang);
      setData(prev => ({ ...prev, content: translatedContent }));
    } catch (error) {
      console.error("Translation failed", error);
      alert("Could not translate article.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const mockUser = {
      id: 'ritchieolthuis',
      name: 'Ritchie Olthuis',
      avatar: 'https://ui-avatars.com/api/?name=Ritchie+Olthuis&background=1a8917&color=fff'
    };
    setUser(mockUser);
    
    // Database Integration: Check/Create User and Load Library
    try {
        await ensureUserInDb(mockUser);
        const dbLibrary = await getLibraryFromDb(mockUser.id);
        if (dbLibrary.length > 0) {
            setLibrary(dbLibrary);
            localStorage.setItem('medium-clone-library', JSON.stringify(dbLibrary));
        }
    } catch (e) {
        console.error("DB Login Sync failed", e);
    }
  };

  const handleSaveToLibrary = async (article: ArticleData) => {
    if (!user) {
      alert("Please sign in to save articles.");
      return;
    }

    // Optimistic UI Update
    const exists = library.find(item => item.id === article.id);
    if (!exists) {
      const newLibrary = [article, ...library];
      setLibrary(newLibrary);
      localStorage.setItem('medium-clone-library', JSON.stringify(newLibrary));
      
      // Database Sync
      try {
        await saveArticleToLibrary(user.id, article);
      } catch (e) {
        console.error("Failed to save to database", e);
      }
    }
  };

  const handleSelectFromLibrary = (article: ArticleData) => {
    setData(article);
    setCurrentView('home');
  };

  const isCurrentArticleSaved = library.some(item => item.id === data.id);

  // Apply Dark Mode Class to Root/Body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#121212';
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
    }
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen antialiased relative transition-colors duration-300 ${isDarkMode ? 'bg-[#121212] text-medium-darkText' : 'bg-white text-medium-black'}`}>
      <Navbar 
        onProcess={handleProcess} 
        loading={loading} 
        user={user}
        onLogin={handleLogin}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateLibrary={() => setCurrentView('library')}
        onTranslate={handleTranslate}
        currentView={currentView}
        isDarkMode={isDarkMode}
      />

      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        onChange={setSettings}
        isDarkMode={isDarkMode}
      />
      
      <main className="w-full">
        {currentView === 'home' ? (
           <ArticleView 
             data={data} 
             loading={loading} 
             onSave={user ? handleSaveToLibrary : undefined}
             isSaved={isCurrentArticleSaved}
             isDarkMode={isDarkMode}
             font={settings.font}
           />
        ) : (
           <LibraryView 
             articles={library}
             onSelect={handleSelectFromLibrary}
             isDarkMode={isDarkMode}
             font={settings.font}
           />
        )}
      </main>
    </div>
  );
}