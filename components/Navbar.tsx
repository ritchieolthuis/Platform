

import React, { useState, useRef } from 'react';
import { SourceType, User } from '../types';

interface NavbarProps {
  onProcess: (type: SourceType, source: string, name?: string) => void;
  onAiQuery: (query: string) => void;
  onOpenAiPanel: () => void;
  loading: boolean;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onToggleSettings: () => void;
  onNavigateHome: () => void;
  onNavigateLibrary: () => void;
  onTranslate: (lang: string) => void;
  currentView: 'home' | 'library';
  isDarkMode: boolean;
  t: (key: string) => string;
  currentLanguage: string;
}

const LANGUAGES = [
  'English', 'Nederlands', 'Español', 'Français', 'Deutsch', 'Italiano', 
  'Português', '中文 (Chinese)', '日本語 (Japanese)', '한국어 (Korean)', 'Русский (Russian)', 'العربية (Arabic)'
];

const Navbar: React.FC<NavbarProps> = ({ 
  onProcess,
  onAiQuery,
  onOpenAiPanel,
  loading, 
  user, 
  onLogin, 
  onLogout,
  onToggleSettings,
  onNavigateHome,
  onNavigateLibrary,
  onTranslate,
  currentView,
  isDarkMode,
  t,
  currentLanguage
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const trimmed = inputValue.trim();
      const isUrl = /^(http|https):\/\/[^ "]+$/.test(trimmed) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}([^ "]*)$/.test(trimmed);
      
      if (isUrl) {
          onProcess('url', trimmed, trimmed);
      } else {
          onAiQuery(trimmed);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      const fileName = file.name; 
      const lowerName = fileName.toLowerCase();
      
      reader.onload = () => {
        const result = reader.result as string;
        if (lowerName.endsWith('.pdf')) {
            onProcess('pdf', result, fileName);
        } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
            onProcess('docx', result, fileName);
        } else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
            onProcess('html', result, fileName);
        } else {
            alert('Unsupported file type.');
        }
      };

      if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
          reader.readAsText(file);
      } else {
          reader.readAsDataURL(file);
      }
    }
  };

  const handleLangSelect = (lang: string) => {
    onTranslate(lang);
    setShowAccountMenu(false);
  };

  const navBg = isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-medium-black';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDarkMode ? 'bg-[#242424] text-white' : 'bg-[#f9f9f9] text-medium-black';
  const dropdownBg = isDarkMode ? 'bg-[#242424] border-gray-700' : 'bg-white border-gray-200';

  return (
    <nav className={`sticky top-0 z-50 ${navBg} border-b h-[65px] flex items-center transition-all print:hidden`}>
      <div className="w-full px-6 flex justify-between items-center h-full max-w-screen-2xl mx-auto">
        
        {/* Left: Logo */}
        <div className="flex items-center min-w-[200px]">
          <div 
            className="cursor-pointer flex items-center gap-3 group" 
            onClick={onNavigateHome}
            title="Back to Home"
          >
             <div className={`font-serif font-bold text-2xl tracking-tight hidden md:block ${textMain} group-hover:text-medium-green transition-colors`}>
               LumeaReader
             </div>
          </div>
        </div>

        {/* Center: Search / AI Bar */}
        <div className="flex-1 max-w-[480px] mx-4 hidden md:block">
            <div className={`relative w-full rounded-full ${inputBg} flex items-center px-4 py-2.5 transition-colors focus-within:bg-white focus-within:shadow-[0_0_0_1px_rgba(0,0,0,0.1)] dark:focus-within:bg-[#1e1e1e] dark:focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]`}>
                {/* Search Icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 mr-2 flex-shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputSubmit}
                    disabled={loading}
                    placeholder={t('searchPlaceholder')}
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm font-sans placeholder:font-light min-w-0"
                />

                {/* AI Star Icon (Right side of input) */}
                <button 
                  onClick={onOpenAiPanel}
                  className={`flex-shrink-0 text-medium-green hover:text-green-700 transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ${loading ? 'animate-spin' : ''}`}
                  title="Open AI Assistant"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                </button>
            </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-5 min-w-[200px] justify-end">
           
           {/* Settings Gear */}
           <button 
                onClick={onToggleSettings}
                className={`${textMuted} hover:${textMain} transition-colors`}
                title={t('customize')}
             >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
           </button>

           {/* Write / Upload Icon */}
           <>
               <input 
                 type="file" 
                 ref={fileInputRef}
                 accept=".pdf,.html,.htm,.docx,.doc"
                 onChange={handleFileUpload}
                 className="hidden" 
               />
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className={`${textMuted} hover:${textMain} flex items-center gap-2`}
                 title={t('upload')}
               >
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                 <span className="hidden lg:inline text-sm font-sans">{t('upload')}</span>
               </button>
           </>

           {/* My Library (Text) */}
           {user && (
             <button 
                onClick={onNavigateLibrary} 
                className={`text-sm font-sans ${currentView === 'library' ? `${textMain} font-medium` : `${textMuted} hover:${textMain}`}`}
             >
               {t('library')}
             </button>
           )}

           {/* Avatar with Dropdown */}
           {user ? (
             <div className="relative">
                 <div 
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer overflow-hidden border border-white hover:opacity-90 transition-opacity"
                 >
                    {user.avatar ? (
                         <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                    ) : (
                        "RO"
                    )}
                 </div>

                 {/* Account Dropdown */}
                 {showAccountMenu && (
                     <>
                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowAccountMenu(false)}></div>
                        <div className={`absolute top-10 right-0 ${dropdownBg} border shadow-xl rounded-lg w-64 py-2 z-50 animate-in fade-in slide-in-from-top-1 font-sans`}>
                            <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <div className={`text-sm font-bold ${textMain}`}>{user.name}</div>
                                <div className={`text-xs ${textMuted} mt-0.5`}>Signed in</div>
                            </div>

                            <div className="py-2">
                                <div className={`px-4 py-1 text-xs font-bold ${textMuted} uppercase tracking-wider mb-1`}>{t('language')}</div>
                                <div className="max-h-48 overflow-y-auto">
                                    {LANGUAGES.map(lang => (
                                        <button 
                                            key={lang}
                                            onClick={() => handleLangSelect(lang)}
                                            className={`w-full text-left px-4 py-2 text-sm flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700 ${currentLanguage === lang ? 'text-medium-green font-medium' : textMain}`}
                                        >
                                            {lang}
                                            {currentLanguage === lang && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} mt-1 pt-1`}>
                                <button 
                                    onClick={() => {
                                        onLogout();
                                        setShowAccountMenu(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800`}
                                >
                                    {t('signOut')}
                                </button>
                            </div>
                        </div>
                     </>
                 )}
             </div>
           ) : (
             <button 
               onClick={onLogin}
               className={`${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} px-5 py-2 rounded-full text-sm font-sans transition-colors`}
             >
               {t('signIn')}
             </button>
           )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;