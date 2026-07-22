import React, { useRef } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

interface CodeEditorWithHighlightProps {
  value: string;
  onChange: (val: string) => void;
  language: 'javascript' | 'css';
  placeholder?: string;
}

export const CodeEditorWithHighlight: React.FC<CodeEditorWithHighlightProps> = ({
  value,
  onChange,
  language,
  placeholder,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const syncScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const getHighlightedHtml = () => {
    if (!value) return '<span class="text-zinc-600">' + (placeholder || '') + '</span>';
    try {
      const validLang = hljs.getLanguage(language) ? language : 'plaintext';
      const result = hljs.highlight(value, { language: validLang });
      return result.value + '\n';
    } catch {
      return value;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="relative w-full h-full bg-zinc-950 font-mono text-xs overflow-hidden">
      {/* Background Highlighted Syntax Layer */}
      <pre
        ref={preRef}
        className="absolute inset-0 p-6 pointer-events-none overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap break-words m-0 bg-transparent text-zinc-100 selection:bg-transparent"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: getHighlightedHtml() }}
      />

      {/* Foreground Transparent Caret & Input Layer */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="absolute inset-0 w-full h-full p-6 font-mono text-xs leading-relaxed bg-transparent text-transparent caret-white outline-none resize-none selection:bg-blue-600/40 selection:text-transparent overflow-auto whitespace-pre-wrap break-words m-0 border-none"
        spellCheck={false}
      />
    </div>
  );
};
