import React from 'react';
import { UserSettings, WritingStyle, ColorMode, FontType, HighlightOptions } from '../types';

interface SettingsPanelProps {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const COLORS = [
  { label: 'Green', value: '#cffafe' },
  { label: 'Yellow', value: '#fef9c3' },
  { label: 'Blue', value: '#dbeafe' },
  { label: 'Pink', value: '#fce7f3' },
];

const WRITING_STYLES: { id: WritingStyle, label: string, icon: string, desc: string }[] = [
  { id: 'normal', label: 'Normal', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', desc: 'Default Medium style' },
  { id: 'learning', label: 'Learning', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', desc: 'Simple explanations' },
  { id: 'concise', label: 'Concise', icon: 'M4 6h16M4 12h16M4 18h7', desc: 'Short & to the point' },
  { id: 'explanatory', label: 'Explanatory', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', desc: 'Deep dive details' },
  { id: 'formal', label: 'Formal', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', desc: 'Academic & objective' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, isOpen, onClose, isDarkMode }) => {
  if (!isOpen) return null;

  const updateHighlight = (key: keyof HighlightOptions, value: any) => {
    onChange({ ...settings, highlightOptions: { ...settings.highlightOptions, [key]: value } });
  };

  const panelBg = isDarkMode ? 'bg-[#242424] border-gray-700' : 'bg-white border-gray-200';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-medium-black';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50';
  const activeBg = isDarkMode ? 'bg-gray-800' : 'bg-gray-100';
  const inputBg = isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-black';

  return (
    <div className={`absolute top-[70px] right-4 md:right-10 z-50 ${panelBg} border shadow-xl rounded-lg w-[340px] p-0 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden`}>
      {/* Header */}
      <div className={`flex justify-between items-center px-5 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <h3 className={`font-sans font-bold text-xs uppercase tracking-wide ${textMuted}`}>Customize</h3>
        <button onClick={onClose} className={`${textMuted} hover:${textMain}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="max-h-[80vh] overflow-y-auto px-5 py-2">
        {/* WRITING STYLE */}
        <div className={`py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <label className={`block text-sm font-bold ${textMain} mb-3`}>Writing Style</label>
          <div className="space-y-1">
            {WRITING_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => onChange({ ...settings, writingStyle: style.id })}
                className={`w-full flex items-center p-2 rounded-md transition-colors ${settings.writingStyle === style.id ? 'text-medium-green' : textMuted} ${hoverBg} group`}
              >
                <div className={`mr-3 ${settings.writingStyle === style.id ? 'text-medium-green' : 'text-gray-400'}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={style.icon} strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="text-left">
                  <div className={`text-sm font-medium ${settings.writingStyle === style.id ? textMain : ''}`}>{style.label}</div>
                  <div className="text-[10px] opacity-70">{style.desc}</div>
                </div>
                {settings.writingStyle === style.id && (
                    <div className="ml-auto text-medium-green">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* APPEARANCE */}
        <div className={`py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
           <label className={`block text-sm font-bold ${textMain} mb-3`}>Appearance</label>
           
           {/* Color Mode */}
           <div className="text-xs font-sans text-gray-500 mb-2">Color mode</div>
           <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-4 dark:bg-gray-800">
              {(['light', 'auto', 'dark'] as ColorMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onChange({ ...settings, colorMode: mode })}
                    className={`flex-1 py-2 text-xs font-medium rounded-md capitalize transition-all ${settings.colorMode === mode ? 'bg-white shadow-sm text-medium-black dark:bg-gray-600 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                  >
                      {mode}
                  </button>
              ))}
           </div>

           {/* Font */}
           <div className="text-xs font-sans text-gray-500 mb-2">Chat font</div>
           <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onChange({...settings, font: 'serif'})} className={`p-3 border rounded-lg flex flex-col items-center justify-center transition-all ${settings.font === 'serif' ? 'border-medium-green bg-green-50 text-medium-green dark:bg-green-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}>
                 <span className="font-serif text-lg mb-1">Aa</span>
                 <span className="text-[10px] uppercase tracking-wider text-gray-500">Default</span>
              </button>
              <button onClick={() => onChange({...settings, font: 'sans'})} className={`p-3 border rounded-lg flex flex-col items-center justify-center transition-all ${settings.font === 'sans' ? 'border-medium-green bg-green-50 text-medium-green dark:bg-green-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}>
                 <span className="font-sans text-lg mb-1">Aa</span>
                 <span className="text-[10px] uppercase tracking-wider text-gray-500">Sans</span>
              </button>
              <button onClick={() => onChange({...settings, font: 'system'})} className={`p-3 border rounded-lg flex flex-col items-center justify-center transition-all ${settings.font === 'system' ? 'border-medium-green bg-green-50 text-medium-green dark:bg-green-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}>
                 <span className="font-system text-lg mb-1">Aa</span>
                 <span className="text-[10px] uppercase tracking-wider text-gray-500">System</span>
              </button>
              <button onClick={() => onChange({...settings, font: 'dyslexic'})} className={`p-3 border rounded-lg flex flex-col items-center justify-center transition-all ${settings.font === 'dyslexic' ? 'border-medium-green bg-green-50 text-medium-green dark:bg-green-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}>
                 <span className="font-dyslexic text-lg mb-1">Aa</span>
                 <span className="text-[10px] uppercase tracking-wider text-gray-500 text-center leading-none">Dyslexic friendly</span>
              </button>
           </div>
        </div>

        {/* HIGHLIGHTS & CUSTOM FOCUS */}
        <div className="py-4">
          <label className={`block text-sm font-bold ${textMain} mb-3`}>Focus & Highlights</label>
          
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
               <span>Highlight Length: {settings.highlightOptions.minLength} chars</span>
            </div>
            <input 
                type="range" 
                min="50" 
                max="400" 
                step="10"
                value={settings.highlightOptions.minLength}
                onChange={(e) => updateHighlight('minLength', parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-medium-green dark:bg-gray-700"
            />
          </div>

          <div className="mb-4">
            <input 
                type="text" 
                value={settings.highlightOptions.keywords.join(', ')}
                onChange={(e) => updateHighlight('keywords', e.target.value.split(',').map(s => s.trim()))}
                placeholder="Keywords (e.g., AI, Tech)"
                className={`w-full border rounded px-3 py-2 text-xs focus:outline-none focus:border-medium-green ${inputBg}`}
            />
          </div>

          <div className="mb-4">
             <div className={`text-xs font-bold ${textMain} mb-1`}>Custom Focus Prompt (Optional)</div>
             <textarea
                value={settings.customPrompt || ''}
                onChange={(e) => onChange({ ...settings, customPrompt: e.target.value })}
                placeholder="Explain what to focus on in detail (e.g., 'Leg specifiek de financiële risico's uit in de 3e sectie')..."
                className={`w-full border rounded px-3 py-2 text-xs h-20 resize-none focus:outline-none focus:border-medium-green ${inputBg}`}
             />
             <div className="text-[10px] text-gray-400 mt-1">
               Instructs the AI to 80/20 the source but deep-dive on this topic.
             </div>
          </div>

          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.label}
                onClick={() => updateHighlight('color', c.value)}
                className={`w-6 h-6 rounded-full border-2 ${settings.highlightOptions.color === c.value ? 'border-medium-black dark:border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;