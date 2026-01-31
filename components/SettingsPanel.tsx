import React, { useState } from 'react';
import { UserSettings, WritingStyle, HighlightOptions, FontSize, PageWidth, ReadingLevel, ColorMode } from '../types';

interface SettingsPanelProps {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  t: (key: string) => string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, isOpen, onClose, isDarkMode, t }) => {
  const [isUiterlijkOpen, setIsUiterlijkOpen] = useState(true);

  if (!isOpen) return null;

  const panelBg = isDarkMode ? 'bg-[#242424] border-gray-700' : 'bg-white border-gray-200';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-medium-black';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const separator = isDarkMode ? 'border-gray-700' : 'border-gray-100';
  const inputBg = isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-black';
  const radioBg = isDarkMode ? 'border-gray-500' : 'border-gray-300';
  const radioActive = 'border-blue-600 bg-blue-600';

  const COLORS = [
    { label: 'Green', value: '#cffafe' },
    { label: 'Yellow', value: '#fef9c3' },
    { label: 'Blue', value: '#dbeafe' },
    { label: 'Pink', value: '#fce7f3' },
  ];

  const READING_LEVELS: { id: ReadingLevel; label: string; }[] = [
      { id: 'beginner', label: t('levelBeginner') },
      { id: 'intermediate', label: t('levelIntermediate') },
      { id: 'expert', label: t('levelExpert') }
  ];

  const WRITING_STYLES: { id: WritingStyle; label: string; desc: string }[] = [
      { id: 'normal', label: t('styleNormal'), desc: t('descNormal') },
      { id: 'learning', label: t('styleLearning'), desc: t('descLearning') },
      { id: 'concise', label: t('styleConcise'), desc: t('descConcise') },
      { id: 'explanatory', label: t('styleExplanatory'), desc: t('descExplanatory') },
      { id: 'formal', label: t('styleFormal'), desc: t('descFormal') }
  ];

  const FONTS = [
      { id: 'serif', label: 'DEFAULT', sample: 'Aa', fontClass: 'font-serif' },
      { id: 'sans', label: 'SANS', sample: 'Aa', fontClass: 'font-sans' },
      { id: 'system', label: 'SYSTEM', sample: 'Aa', fontClass: 'font-system' },
      { id: 'dyslexic', label: 'DYSLEXIC', sample: 'Aa', fontClass: 'font-dyslexic' },
  ];

  const updateHighlight = (key: keyof HighlightOptions, value: any) => {
    onChange({ ...settings, highlightOptions: { ...settings.highlightOptions, [key]: value } });
  };

  const RadioOption = ({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) => (
      <div onClick={onClick} className="flex items-center gap-3 cursor-pointer py-1.5 group">
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected ? radioActive : radioBg} group-hover:border-blue-500`}>
              {selected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <span className={`text-[15px] ${textMain}`}>{label}</span>
      </div>
  );

  return (
    <div className={`absolute top-[70px] right-4 md:right-10 z-[60] ${panelBg} border shadow-xl rounded-lg w-[340px] max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200`}>
      <div className="p-5">
        <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>{t('customize')}</h2>
            <button onClick={onClose} className={textMuted}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        {/* 0. UITERLIJK (Specific Request Implementation) */}
        <div className={`mb-8 border-b ${separator} pb-6`}>
             <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setIsUiterlijkOpen(!isUiterlijkOpen)}>
                <h3 className={`text-xl font-bold ${textMain}`}>Uiterlijk</h3>
                <button className={`px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    {isUiterlijkOpen ? t('hide') : t('show')}
                </button>
             </div>
             
             {isUiterlijkOpen && (
                 <div className="space-y-6 animate-in slide-in-from-top-1 duration-200">
                     <div>
                         <div className={`text-base font-medium mb-3 ${textSecondary} border-b ${separator} pb-1 inline-block w-full`}>{t('text')}</div>
                         <RadioOption 
                            label={t('small')} 
                            selected={settings.fontSize === 'small'} 
                            onClick={() => onChange({...settings, fontSize: 'small'})} 
                         />
                         <RadioOption 
                            label={t('standard')} 
                            selected={settings.fontSize === 'standard'} 
                            onClick={() => onChange({...settings, fontSize: 'standard'})} 
                         />
                         <RadioOption 
                            label={t('large')} 
                            selected={settings.fontSize === 'large'} 
                            onClick={() => onChange({...settings, fontSize: 'large'})} 
                         />
                     </div>

                     <div>
                         <div className={`text-base font-medium mb-3 ${textSecondary} border-b ${separator} pb-1 inline-block w-full`}>{t('pageWidth')}</div>
                         <RadioOption 
                            label={t('standard')} 
                            selected={settings.pageWidth === 'standard'} 
                            onClick={() => onChange({...settings, pageWidth: 'standard'})} 
                         />
                         <RadioOption 
                            label={t('fullWidth')} 
                            selected={settings.pageWidth === 'full'} 
                            onClick={() => onChange({...settings, pageWidth: 'full'})} 
                         />
                     </div>

                     <div>
                         <div className={`text-base font-medium mb-3 ${textSecondary} border-b ${separator} pb-1 inline-block w-full`}>Kleur (bèta)</div>
                         <RadioOption 
                            label={t('modeAuto')} 
                            selected={settings.colorMode === 'auto'} 
                            onClick={() => onChange({...settings, colorMode: 'auto'})} 
                         />
                         <RadioOption 
                            label={t('modeLight')} 
                            selected={settings.colorMode === 'light'} 
                            onClick={() => onChange({...settings, colorMode: 'light'})} 
                         />
                         <RadioOption 
                            label={t('modeDark')} 
                            selected={settings.colorMode === 'dark'} 
                            onClick={() => onChange({...settings, colorMode: 'dark'})} 
                         />
                     </div>
                 </div>
             )}
        </div>

        {/* 1. READING LEVEL */}
        <div className={`mb-6`}>
            <h3 className={`text-base font-bold mb-3 ${textMain}`}>{t('readingLevel')}</h3>
            <div className={`flex ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded p-1`}>
                {READING_LEVELS.map((level) => (
                     <button 
                        key={level.id}
                        onClick={() => onChange({...settings, readingLevel: level.id})} 
                        className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${settings.readingLevel === level.id ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                     >
                        {level.label}
                     </button>
                ))}
            </div>
        </div>

        {/* 2. WRITING STYLE */}
        <div className={`mb-8`}>
            <h3 className={`text-base font-bold mb-3 ${textMain}`}>{t('writingStyle')}</h3>
            <div className="space-y-1">
                {WRITING_STYLES.map((style) => {
                    const isSelected = settings.writingStyle === style.id;
                    return (
                        <div 
                            key={style.id}
                            onClick={() => onChange({ ...settings, writingStyle: style.id })}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-500 text-white' : `hover:${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} ${textMain}`}`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon based on style */}
                                {style.id === 'normal' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>}
                                {style.id === 'learning' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>}
                                {style.id === 'concise' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>}
                                {style.id === 'explanatory' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>}
                                {style.id === 'formal' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"></path><path d="M5 21V7l8-4 8 4v14"></path><path d="M9 10a2 2 0 1 1-2-2v0a2 2 0 0 1 2 2"></path></svg>}
                                
                                <div>
                                    <div className="font-semibold text-sm">{style.label}</div>
                                    <div className={`text-xs ${isSelected ? 'text-blue-100' : textMuted}`}>{style.desc}</div>
                                </div>
                            </div>
                            {isSelected && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* 3. Advanced Appearance (Fonts) */}
        <div className={`mb-8 pt-6 border-t ${separator}`}>
            <h3 className={`text-base font-bold mb-4 ${textMain}`}>Advanced Fonts</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
                {FONTS.map(font => {
                    const isSelected = settings.font === font.id;
                    return (
                        <button
                            key={font.id}
                            onClick={() => onChange({ ...settings, font: font.id as any })}
                            className={`p-4 rounded border flex flex-col items-center justify-center gap-2 transition-all
                                ${isSelected 
                                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-600' 
                                    : `${isDarkMode ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-400'}`
                                }`
                            }
                        >
                            <span className={`text-xl ${font.fontClass} ${textMain}`}>{font.sample}</span>
                            <span className={`text-[10px] font-bold tracking-wider uppercase ${textMuted}`}>{font.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* 4. FOCUS & HIGHLIGHTS */}
        <div className={`pt-6 border-t ${separator}`}>
            <h3 className={`text-base font-bold mb-4 ${textMain}`}>{t('focusHighlights')}</h3>
            
            <div className="mb-4">
                <div className={`flex justify-between items-center mb-2`}>
                     <label className={`text-xs font-bold ${textMuted}`}>{t('highlightLength')}</label>
                     <span className={`text-xs ${textMuted}`}>{settings.highlightOptions.minLength} chars</span>
                </div>
                <input 
                    type="range" 
                    min="50" 
                    max="500" 
                    step="10"
                    value={settings.highlightOptions.minLength}
                    onChange={(e) => updateHighlight('minLength', parseInt(e.target.value))}
                    className="w-full accent-green-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
            </div>

            <div className="mb-4">
                <input 
                    type="text" 
                    value={settings.highlightOptions.keywords.join(', ')}
                    onChange={(e) => updateHighlight('keywords', e.target.value.split(',').map(s => s.trim()))}
                    placeholder={t('keywordsPlaceholder')}
                    className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-green-600 ${inputBg} transition-colors`}
                />
            </div>

            <div className="mb-4">
                 <div className={`text-xs font-bold ${textMuted} mb-1`}>{t('customFocus')}</div>
                 <textarea
                    value={settings.customPrompt || ''}
                    onChange={(e) => onChange({ ...settings, customPrompt: e.target.value })}
                    placeholder={t('customFocusPlaceholder')}
                    className={`w-full border rounded px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:border-green-600 ${inputBg}`}
                 />
            </div>

            <div className="flex gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => updateHighlight('color', c.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.highlightOptions.color === c.value ? 'border-gray-500 scale-110 shadow-sm' : 'border-transparent'}`}
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