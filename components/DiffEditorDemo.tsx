import React, { useState } from 'react';

interface DiffEditorDemoProps {
  isDarkMode: boolean;
  onNavigateToDiff: (original: string, improved: string) => void;
}

export const DiffEditorDemo: React.FC<DiffEditorDemoProps> = ({
  isDarkMode,
  onNavigateToDiff,
}) => {
  const [original, setOriginal] = useState(
    'The quick brown fox jumps over the lazy dog. This is a sample text.'
  );
  const [improved, setImproved] = useState(
    'The quick brown fox gracefully leaps over the extremely lazy sleeping dog. This is an excellent sample text with improved clarity.'
  );

  return (
    <div
      className={`p-8 rounded-lg border-2 mb-8 shadow-md transition-all ${
        isDarkMode
          ? 'bg-[#1a1a1b] border-purple-900/30'
          : 'bg-purple-50/30 border-purple-100'
      }`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 ${
        isDarkMode ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-600'
      }`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </div>

      <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Text Diff Editor
      </h2>
      <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Compare and selectively accept AI-generated text improvements. Keep full control over your edits.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Original Text
          </label>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="Enter original text..."
            className={`w-full h-24 p-3 rounded border outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-black'
            }`}
          />
        </div>
        <div>
          <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Improved Text
          </label>
          <textarea
            value={improved}
            onChange={(e) => setImproved(e.target.value)}
            placeholder="Enter improved text..."
            className={`w-full h-24 p-3 rounded border outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-black'
            }`}
          />
        </div>
      </div>

      <button
        onClick={() => onNavigateToDiff(original, improved)}
        className="w-full px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-all shadow-md active:scale-95"
      >
        Open Diff Editor
      </button>
    </div>
  );
};

export default DiffEditorDemo;
