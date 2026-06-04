import React, { useState, useMemo } from 'react';
import '../styles/TextDiffEditor.css';

interface Diff {
  type: 'add' | 'remove' | 'keep';
  content: string;
  id: string;
}

interface TextDiffEditorProps {
  originalText: string;
  improvedText: string;
  onApply?: (updatedText: string) => void;
}

const computeDiff = (original: string, improved: string): Diff[] => {
  const origWords = original.split(/(\s+)/);
  const impWords = improved.split(/(\s+)/);

  const diffs: Diff[] = [];
  let i = 0, j = 0;

  while (i < origWords.length || j < impWords.length) {
    if (i < origWords.length && j < impWords.length && origWords[i] === impWords[j]) {
      diffs.push({
        type: 'keep',
        content: origWords[i],
        id: `keep-${i}-${j}`,
      });
      i++;
      j++;
    } else if (j < impWords.length) {
      diffs.push({
        type: 'add',
        content: impWords[j],
        id: `add-${j}`,
      });
      j++;
    } else if (i < origWords.length) {
      diffs.push({
        type: 'remove',
        content: origWords[i],
        id: `remove-${i}`,
      });
      i++;
    }
  }

  return diffs;
};

export const TextDiffEditor: React.FC<TextDiffEditorProps> = ({
  originalText,
  improvedText,
  onApply,
}) => {
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [editedText, setEditedText] = useState(originalText);

  const diffs = useMemo(() => computeDiff(originalText, improvedText), [originalText, improvedText]);

  const toggleChange = (id: string) => {
    const newSelected = new Set(selectedChanges);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedChanges(newSelected);
  };

  const applySelectedChanges = () => {
    const result = diffs
      .filter((diff) => diff.type === 'keep' || selectedChanges.has(diff.id))
      .map((diff) => diff.content)
      .join('');

    setEditedText(result);
    if (onApply) onApply(result);
    setSelectedChanges(new Set());
  };

  const acceptAll = () => {
    setEditedText(improvedText);
    if (onApply) onApply(improvedText);
    setSelectedChanges(new Set());
  };

  const rejectAll = () => {
    setEditedText(originalText);
    if (onApply) onApply(originalText);
    setSelectedChanges(new Set());
  };

  return (
    <div className="text-diff-editor">
      <div className="diff-header">
        <h2>Text Diff Editor</h2>
        <div className="header-buttons">
          <button className="btn btn-success" onClick={acceptAll}>
            Accept All
          </button>
          <button className="btn btn-danger" onClick={rejectAll}>
            Reject All
          </button>
        </div>
      </div>

      <div className="diff-container">
        <div className="diff-column original">
          <h3>Original Text</h3>
          <div className="text-display">
            {editedText}
          </div>
        </div>

        <div className="diff-column improved">
          <h3>Improved Text</h3>
          <div className="diff-text">
            {diffs.map((diff) => {
              const isSelected = selectedChanges.has(diff.id);
              const isChange = diff.type !== 'keep';

              if (diff.type === 'keep') {
                return (
                  <span key={diff.id} className="diff-keep">
                    {diff.content}
                  </span>
                );
              }

              return (
                <span
                  key={diff.id}
                  className={`diff-token diff-${diff.type} ${isSelected ? 'selected' : ''}`}
                  onClick={() => isChange && toggleChange(diff.id)}
                  role="button"
                  tabIndex={0}
                >
                  {diff.content}
                  {isChange && (
                    <span className="change-indicator">
                      {isSelected ? '✓' : '+'}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="diff-footer">
        <div className="change-stats">
          {Array.from(selectedChanges).length > 0 && (
            <span className="stat">
              {Array.from(selectedChanges).length} changes selected
            </span>
          )}
        </div>
        <button className="btn btn-primary" onClick={applySelectedChanges}>
          Apply Selected Changes
        </button>
      </div>
    </div>
  );
};

export default TextDiffEditor;
