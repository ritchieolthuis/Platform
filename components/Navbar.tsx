import React, { useState, useRef } from 'react';
import { SourceType, User } from '../types';

interface NavbarProps {
  onProcess: (type: SourceType, source: string) => void;
  loading: boolean;
  user: User | null;
  onLogin: () => void;
  onToggleSettings: () => void;
  onNavigateHome: () => void;
  onNavigateLibrary: () => void;
  onTranslate: (lang: string) => void;
  currentView: 'home' | 'library';
  isDarkMode: boolean;
}

const LANGUAGES = [
  'English', 'Nederlands', 'Español', 'Français', 'Deutsch', 'Italiano', 
  'Português', '中文 (Chinese)', '日本語 (Japanese)', '한국어 (Korean)', 'Русский (Russian)', 'العربية (Arabic)'
];

const Navbar: React.FC<NavbarProps> = ({ 
  onProcess, 
  loading, 
  user, 
  onLogin, 
  onToggleSettings,
  onNavigateHome,
  onNavigateLibrary,
  onTranslate,
  currentView,
  isDarkMode
}) => {
  const [url, setUrl] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim()) {
      onProcess('url', url);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onProcess('pdf', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLangSelect = (lang: string) => {
    onTranslate(lang);
    setShowLangMenu(false);
  };

  const navBg = isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-medium-black';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDarkMode ? 'bg-gray-800 text-white border-gray-700 focus:bg-[#121212]' : 'bg-gray-50 text-medium-black border-gray-100 focus:bg-white';
  const dropdownBg = isDarkMode ? 'bg-[#242424] border-gray-700' : 'bg-white border-gray-200';
  const dropdownHover = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  return (
    <nav className={`sticky top-0 z-50 ${navBg} border-b h-[65px] flex items-center justify-center transition-all print:hidden`}>
      <div className="w-full max-w-screen-xl px-6 flex justify-between items-center h-full">
        {/* Logo Section */}
        <div className="flex items-center gap-6">
          <div className={`font-serif font-bold text-3xl tracking-tighter cursor-pointer ${textMain}`} onClick={onNavigateHome}>
            MediumClone
          </div>
          {/* Search/Input only visible on Home */}
          {currentView === 'home' && (
            <div className="relative hidden md:block group ml-4">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleUrlSubmit}
                    disabled={loading}
                    placeholder="Paste URL..."
                    className={`pl-10 pr-4 py-2 rounded-full border text-sm w-64 focus:outline-none focus:border-medium-black transition-all font-sans placeholder:font-light ${inputBg}`}
                />
           </div>
          )}
        </div>

        {/* Action Section */}
        <div className="flex items-center space-x-5">
           
           {/* Translate Button */}
           {currentView === 'home' && (
             <div className="relative">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className={`${textMuted} hover:${textMain} transition-colors flex items-center`}
                  title="Translate Article"
                  disabled={loading}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </button>
                
                {showLangMenu && (
                  <div className={`absolute top-10 right-0 ${dropdownBg} border shadow-xl rounded-lg w-48 py-2 z-50 animate-in fade-in slide-in-from-top-1`}>
                    <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} text-xs font-bold text-gray-500 uppercase tracking-wider`}>Translate to</div>
                    {LANGUAGES.map(lang => (
                      <button 
                        key={lang} 
                        onClick={() => handleLangSelect(lang)}
                        className={`w-full text-left px-4 py-2 text-sm ${textMain} ${dropdownHover} font-sans`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
             </div>
           )}

           {/* Settings Trigger */}
           {currentView === 'home' && (
             <button 
                onClick={onToggleSettings}
                className={`${textMuted} hover:${textMain} transition-colors`}
                title="Highlight Settings"
             >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
             </button>
           )}

           {/* Write / Upload */}
           {currentView === 'home' && (
             <>
               <input 
                 type="file" 
                 ref={fileInputRef}
                 accept=".pdf"
                 onChange={handleFileUpload}
                 className="hidden" 
               />
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className={`hidden md:flex items-center space-x-2 ${textMuted} hover:${textMain} cursor-pointer font-sans text-sm`}
               >
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                 <span>Upload PDF</span>
               </div>
             </>
           )}

           {/* User / Library */}
           {user ? (
             <div className="flex items-center gap-4">
               <button 
                  onClick={onNavigateLibrary} 
                  className={`text-sm font-sans ${currentView === 'library' ? `${textMain} font-medium` : `${textMuted} hover:${textMain}`}`}
               >
                 My Library
               </button>
               <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden cursor-pointer">
                 <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
               </div>
             </div>
           ) : (
             <button 
               onClick={onLogin}
               className={`${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} px-5 py-2 rounded-full text-sm font-sans transition-colors`}
             >
               Sign In
             </button>
           )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;