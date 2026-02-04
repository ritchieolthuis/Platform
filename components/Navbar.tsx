
import React, { useState, useRef, useEffect } from 'react';
import { SourceType, User } from '../types';

interface PendingInput {
  id: string;
  type: SourceType;
  value: string;
  name: string;
}

interface NavbarProps {
  onProcess: (type: SourceType, source: string, name?: string) => void;
  onAudit: (type: SourceType, source: string, name?: string) => void;
  onProcessMultiple?: (items: PendingInput[]) => void;
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
  currentView: 'home' | 'library' | 'auditor';
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
  onAudit,
  onProcessMultiple,
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
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [pendingInputs, setPendingInputs] = useState<PendingInput[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateUrl = (str: string) => {
    return /^(http|https):\/\/[^ "]+$/.test(str) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}([^ "]*)$/.test(str);
  };

  const handleInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const trimmed = inputValue.trim();
      if (validateUrl(trimmed)) {
          addPendingInput('url', trimmed, trimmed);
          setInputValue('');
      } else {
          onAiQuery(trimmed);
          setInputValue('');
      }
    }
  };

  const addPendingInput = (type: SourceType, value: string, name: string) => {
    const newItem: PendingInput = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      value,
      name
    };
    setPendingInputs(prev => [...prev, newItem]);
    setShowAddMenu(false);
    inputRef.current?.focus();
  };

  const handleAddUrlFromMenu = () => {
    const trimmed = inputValue.trim();
    if (trimmed && validateUrl(trimmed)) {
        addPendingInput('url', trimmed, trimmed);
        setInputValue('');
    } else {
        const url = prompt("Enter URL to add:");
        if (url) addPendingInput('url', url, url);
    }
    setShowAddMenu(false);
  };

  const removePendingInput = (id: string) => {
    setPendingInputs(prev => prev.filter(item => item.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      const fileName = file.name; 
      const lowerName = fileName.toLowerCase();
      
      reader.onload = () => {
        const result = reader.result as string;
        let type: SourceType = 'pdf';
        if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) type = 'docx';
        else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) type = 'html';
        
        addPendingInput(type, result, fileName);
      };

      if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
          reader.readAsText(file);
      } else {
          reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleProcessAll = () => {
    let finalInputs = [...pendingInputs];
    if (inputValue.trim()) {
        const trimmed = inputValue.trim();
        if (validateUrl(trimmed)) {
            finalInputs.push({ id: 'temp-' + Date.now(), type: 'url', value: trimmed, name: trimmed });
        }
    }

    if (finalInputs.length === 0) return;

    if (onProcessMultiple) {
        onProcessMultiple(finalInputs);
        setPendingInputs([]);
        setInputValue('');
    } else {
        finalInputs.forEach(item => onProcess(item.type, item.value, item.name));
        setPendingInputs([]);
        setInputValue('');
    }
  };
  
  const handleDirectAudit = () => {
    let target = null;
    if (pendingInputs.length > 0) target = pendingInputs[0];
    else if (inputValue.trim() && validateUrl(inputValue.trim())) {
        target = { type: 'url', value: inputValue.trim(), name: inputValue.trim() } as PendingInput;
    }
    
    if (target) {
        onAudit(target.type, target.value, target.name);
        setPendingInputs([]);
        setInputValue('');
    } else {
        alert("Please enter a URL or upload a file to audit.");
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
  const hoverBg = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  return (
    <nav className={`sticky top-0 z-50 ${navBg} border-b h-[65px] flex items-center transition-all print:hidden`}>
      <div className="w-full px-6 flex justify-between items-center h-full max-w-screen-2xl mx-auto">
        
        <div className="flex items-center min-w-[150px]">
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

        <div className="flex-1 max-w-[600px] mx-4">
            <div className={`relative w-full rounded-2xl ${inputBg} border ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} transition-all focus-within:bg-white focus-within:shadow-md dark:focus-within:bg-[#1e1e1e] flex flex-col`}>
                
                {pendingInputs.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border-b border-gray-200 dark:border-gray-800">
                        {pendingInputs.map(item => (
                            <div key={item.id} className={`flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-medium ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                <span className="max-w-[120px] truncate">{item.name}</span>
                                <button onClick={() => removePendingInput(item.id)} className="hover:text-red-500">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center px-4 py-2.5">
                    <div className="relative" ref={addMenuRef}>
                        <button 
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className={`p-1 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${textMuted} transition-colors`}
                            title="Add more sources"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        
                        {showAddMenu && (
                            <div className={`absolute left-0 top-10 w-56 ${dropdownBg} border shadow-xl rounded-lg py-1.5 z-[60] animate-in fade-in slide-in-from-top-1 font-sans`}>
                                <button 
                                    onClick={handleAddUrlFromMenu}
                                    className={`w-full text-left px-4 py-3 text-[15px] ${hoverBg} ${textMain} flex items-center gap-3 transition-colors`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    Add URL
                                </button>
                                <button 
                                    onClick={() => { fileInputRef.current?.click(); setShowAddMenu(false); }}
                                    className={`w-full text-left px-4 py-3 text-[15px] ${hoverBg} ${textMain} flex items-center gap-3 transition-colors`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                    Upload File
                                </button>
                            </div>
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleInputSubmit}
                        disabled={loading}
                        placeholder={pendingInputs.length > 0 ? "Add another URL or ask AI..." : t('searchPlaceholder')}
                        className="flex-1 bg-transparent border-none focus:outline-none text-[15px] font-sans placeholder:font-light min-w-0"
                    />

                    <div className="flex items-center gap-2">
                        { (pendingInputs.length > 0 || (inputValue.trim() && validateUrl(inputValue.trim()))) && (
                            <>
                                <button 
                                    onClick={handleProcessAll}
                                    className={`flex-shrink-0 bg-medium-green text-white px-4 py-1 rounded-full text-xs font-bold hover:bg-green-700 transition-colors ${loading ? 'opacity-50' : ''}`}
                                >
                                    {loading ? '...' : (pendingInputs.length > 1 ? 'Read All' : 'Read')}
                                </button>
                                <button 
                                    onClick={handleDirectAudit}
                                    className={`flex-shrink-0 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold hover:bg-blue-700 transition-colors ${loading ? 'opacity-50' : ''}`}
                                    title="Run Deep Integrity Audit"
                                >
                                    Audit
                                </button>
                            </>
                        )}
                        
                        {/* THE STAR ICON (PHOTO 2 FIX) */}
                        <button 
                            onClick={onOpenAiPanel}
                            className={`flex-shrink-0 ${textMuted} hover:text-blue-600 transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ${loading ? 'animate-spin' : ''}`}
                            title="LumeaReader Pro / AI Assistant"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="transform scale-110"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex items-center space-x-5 min-w-[150px] justify-end">
           <button 
                onClick={onToggleSettings}
                className={`${textMuted} hover:${textMain} transition-colors`}
                title={t('customize')}
             >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
           </button>

           <input 
                 type="file" 
                 ref={fileInputRef}
                 accept=".pdf,.html,.htm,.docx,.doc"
                 onChange={handleFileUpload}
                 className="hidden" 
           />

           {user && (
             <button 
                onClick={onNavigateLibrary} 
                className={`text-sm font-sans hidden sm:block ${currentView === 'library' ? `${textMain} font-medium` : `${textMuted} hover:${textMain}`}`}
             >
               {t('library')}
             </button>
           )}

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

                 {showAccountMenu && (
                     <>
                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowAccountMenu(false)}></div>
                        <div className={`absolute top-10 right-0 ${dropdownBg} border shadow-xl rounded-lg w-64 py-2 z-50 animate-in fade-in slide-in-from-top-1 font-sans`}>
                            <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <div className={`text-sm font-bold ${textMain}`}>{user.name}</div>
                                <div className={`text-xs ${textMuted} mt-0.5`}>Signed in</div>
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
