

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ArticleView from './components/ArticleView';
import SettingsPanel from './components/SettingsPanel';
import LibraryView from './components/LibraryView';
import { ArticleData, SourceType, HighlightOptions, User, UserSettings, WritingStyle, ColorMode, FontType, ReadingLevel } from './types';
import { processSource, translateHtml } from './services/parserService';
import { ensureUserInDb, saveArticleToLibrary, getLibraryFromDb } from './services/firebase';

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
    citationsDesc: 'Click a quote to jump to it in the text. Exact source citations.'
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
    citationsDesc: 'Klik op een citaat om naar de tekst te gaan. Exacte bronvermeldingen.'
  },
  'Español': {
      text: 'Texto',
      small: 'Pequeño',
      standard: 'Estándar',
      large: 'Grande',
      pageWidth: 'Ancho de página',
      fullWidth: 'Ancho completo',
      upload: 'Subir archivo',
      library: 'Mi biblioteca',
      searchPlaceholder: 'Pegar URL o preguntar a IA...',
      ready: '¿Listo para leer?',
      readyDesc: 'Pega una URL o sube un archivo PDF, DOCX o HTML.',
      myLibrary: 'Mi biblioteca',
      emptyLibrary: 'Tu biblioteca está vacía',
      saveLater: 'Guarda artículos para leerlos más tarde.',
      signIn: 'Iniciar sesión',
      customize: 'Personalizar',
      writingStyle: 'Estilo de escritura',
      appearance: 'Apariencia',
      colorMode: 'Modo de color',
      font: 'Fuente',
      focusHighlights: 'Enfoque y destacados',
      keywords: 'Palabras clave',
      keywordsPlaceholder: 'Palabras clave (ej. IA, Tech)',
      customFocus: 'Instrucción de enfoque personalizado',
      customFocusPlaceholder: 'Ej., Enfocarse en estadísticas...',
      account: 'Cuenta',
      language: 'Idioma',
      signOut: 'Cerrar sesión',
      saveToLibrary: 'Guardar en biblioteca',
      share: 'Compartir',
      responses: 'Respuestas',
      respond: 'Responder',
      download: 'Descargar copia sin conexión',
      generateMore: 'Generar más',
      sourceCitation: 'Cita de fuente',
      topQuestions: 'Preguntas frecuentes',
      quickSummary: 'Resumen rápido',
      askAnything: 'Preguntar cualquier cosa',
      tableOfContents: 'Contenido',
      hide: 'ocultar',
      show: 'mostrar',
      highlightLength: 'Longitud de destacado',
      readingLevel: 'Nivel de lectura',
      levelBeginner: 'Principiante',
      levelIntermediate: 'Intermedio',
      levelExpert: 'Experto',
      styleNormal: 'Normal',
      styleLearning: 'Aprendizaje',
      styleConcise: 'Conciso',
      styleExplanatory: 'Explicativo',
      styleFormal: 'Formal',
      descNormal: 'Estilo estándar',
      descLearning: 'Explicaciones simples',
      descConcise: 'Corto y al punto',
      descExplanatory: 'Detalles profundos',
      descFormal: 'Académico y objetivo',
      modeLight: 'Claro',
      modeAuto: 'Auto',
      modeDark: 'Oscuro',
      smartCitations: 'Citas Inteligentes',
      citationsDesc: 'Haga clic en una cita para ir al texto. Citas de fuente exactas.'
  },
  'Français': {
      text: 'Texte',
      small: 'Petit',
      standard: 'Standard',
      large: 'Grand',
      pageWidth: 'Largeur de page',
      fullWidth: 'Pleine largeur',
      upload: 'Télécharger un fichier',
      library: 'Ma bibliothèque',
      searchPlaceholder: 'Collez l\'URL ou demandez à l\'IA...',
      ready: 'Prêt à lire ?',
      readyDesc: 'Collez une URL ou téléchargez un fichier PDF, DOCX ou HTML.',
      myLibrary: 'Ma bibliothèque',
      emptyLibrary: 'Votre bibliothèque est vide',
      saveLater: 'Enregistrez des articles pour les lire plus tard.',
      signIn: 'Se connecter',
      customize: 'Personnaliser',
      writingStyle: 'Style d\'écriture',
      appearance: 'Apparence',
      colorMode: 'Mode couleur',
      font: 'Police',
      focusHighlights: 'Focus & Surlignages',
      keywords: 'Mots-clés',
      keywordsPlaceholder: 'Mots-clés (ex: IA, Tech)',
      customFocus: 'Instruction de focus personnalisé',
      customFocusPlaceholder: 'Ex: Focus sur les stats...',
      account: 'Compte',
      language: 'Langue',
      signOut: 'Se déconnecter',
      saveToLibrary: 'Enregistrer dans la bibliothèque',
      share: 'Partager',
      responses: 'Réponses',
      respond: 'Répondre',
      download: 'Télécharger la copie hors ligne',
      generateMore: 'Générer plus',
      sourceCitation: 'Citation de la source',
      topQuestions: 'Questions fréquentes',
      quickSummary: 'Résumé rapide',
      askAnything: 'Demandez n\'importe quoi',
      tableOfContents: 'Sommaire',
      hide: 'masquer',
      show: 'afficher',
      highlightLength: 'Longueur de surlignage',
      readingLevel: 'Niveau de lecture',
      levelBeginner: 'Débutant',
      levelIntermediate: 'Intermédiaire',
      levelExpert: 'Expert',
      styleNormal: 'Normal',
      styleLearning: 'Apprentissage',
      styleConcise: 'Concis',
      styleExplanatory: 'Explicatif',
      styleFormal: 'Formel',
      descNormal: 'Style standard',
      descLearning: 'Explications simples',
      descConcise: 'Court et précis',
      descExplanatory: 'Détails approfondis',
      descFormal: 'Académique',
      modeLight: 'Clair',
      modeAuto: 'Auto',
      modeDark: 'Sombre',
      smartCitations: 'Citations Intelligentes',
      citationsDesc: 'Cliquez sur une citation pour y accéder. Citations exactes.'
  }
};

const getUiText = (lang: string, key: string) => {
   // Fallback to English if the specific language dictionary doesn't exist, 
   // or if the specific key doesn't exist in that language.
   const dict = UI_TEXT[lang] || UI_TEXT['English'];
   return dict[key] || UI_TEXT['English'][key] || key;
};

export default function App() {
  // State
  const [data, setData] = useState<ArticleData>({ id: '', title: "", content: "", excerpt: "" });
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'library'>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [globalAiQuery, setGlobalAiQuery] = useState<string>(''); 
  const [triggerAiPanel, setTriggerAiPanel] = useState<number>(0); // Counter to trigger panel open
  
  // Settings State 
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
    language: 'English' // Default language
  });

  // User & Library
  const [user, setUser] = useState<User | null>({
    id: 'ritchieolthuis',
    name: 'Ritchie Olthuis',
    avatar: 'https://ui-avatars.com/api/?name=Ritchie+Olthuis&background=1a8917&color=fff' 
  });
  const [library, setLibrary] = useState<ArticleData[]>([]);

  // Load library & settings
  useEffect(() => {
    const savedLibrary = localStorage.getItem('medium-clone-library');
    if (savedLibrary) {
      setLibrary(JSON.parse(savedLibrary));
    }
    const savedSettings = localStorage.getItem('medium-clone-settings');
    if (savedSettings) {
      setSettings(prev => ({...prev, ...JSON.parse(savedSettings)}));
    }

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

  // Persist settings
  useEffect(() => {
    localStorage.setItem('medium-clone-settings', JSON.stringify(settings));
  }, [settings]);

  // Dark Mode
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

  const handleProcess = async (type: SourceType, source: string, sourceName?: string) => {
    setLoading(true);
    setCurrentView('home');
    try {
      const result = await processSource(
          type, 
          source, 
          settings.highlightOptions, 
          settings.writingStyle,
          settings.customPrompt,
          sourceName,
          settings.readingLevel,
          settings.language // Pass current language for translation
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
    // Update global language setting
    setSettings(prev => ({ ...prev, language: lang }));

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

  const handleTitleUpdate = (newTitle: string) => {
    setData(prev => ({ ...prev, title: newTitle }));
  };

  const handleLogin = async () => {
    const mockUser = {
      id: 'ritchieolthuis',
      name: 'Ritchie Olthuis',
      avatar: 'https://ui-avatars.com/api/?name=Ritchie+Olthuis&background=1a8917&color=fff'
    };
    setUser(mockUser);
    
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

  const handleLogout = () => {
      setUser(null);
      setLibrary([]);
  };

  const handleSaveToLibrary = async (article: ArticleData) => {
    if (!user) {
      alert("Please sign in to save articles.");
      return;
    }

    const existingIndex = library.findIndex(item => item.id === article.id);
    let newLibrary;
    
    if (existingIndex >= 0) {
        newLibrary = [...library];
        newLibrary[existingIndex] = article; 
    } else {
        newLibrary = [article, ...library];
    }

    setLibrary(newLibrary);
    localStorage.setItem('medium-clone-library', JSON.stringify(newLibrary));
      
    try {
      await saveArticleToLibrary(user.id, article);
    } catch (e) {
      console.error("Failed to save to database", e);
    }
  };

  const handleSelectFromLibrary = (article: ArticleData) => {
    setData(article);
    setCurrentView('home');
  };

  const handleAiQuery = (query: string) => {
      setGlobalAiQuery(query);
      setCurrentView('home');
  };

  const handleOpenAiPanel = () => {
      if (currentView !== 'home') setCurrentView('home');
      setTriggerAiPanel(prev => prev + 1);
  }

  const isCurrentArticleSaved = library.some(item => item.id === data.id);

  // Apply Dark Mode Class
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
      <Navbar 
        onProcess={handleProcess} 
        onAiQuery={handleAiQuery}
        onOpenAiPanel={handleOpenAiPanel}
        loading={loading} 
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateLibrary={() => setCurrentView('library')}
        onTranslate={handleTranslate}
        currentView={currentView}
        isDarkMode={isDarkMode}
        t={t}
        currentLanguage={settings.language}
      />

      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        onChange={setSettings}
        isDarkMode={isDarkMode}
        t={t}
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
             fontSize={settings.fontSize}
             pageWidth={settings.pageWidth}
             onTitleChange={handleTitleUpdate}
             globalAiQuery={globalAiQuery}
             onGlobalAiQueryHandled={() => setGlobalAiQuery('')}
             // Pass the trigger to prompt opening the panel
             highlightOptions={settings.highlightOptions}
             triggerAiPanel={triggerAiPanel}
             t={t}
             onNavigateLibrary={() => setCurrentView('library')}
             onNavigateHome={() => setCurrentView('home')}
           />
        ) : (
           <LibraryView 
             articles={library}
             onSelect={handleSelectFromLibrary}
             isDarkMode={isDarkMode}
             font={settings.font}
             t={t}
           />
        )}
      </main>
    </div>
  );
}