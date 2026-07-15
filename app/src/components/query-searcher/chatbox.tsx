// src/components/query-searcher/chatbox.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useQuerySearcher } from '../../state/providers/query-searcher-context';
import type { QuerySearcherMode } from '../../state/providers/query-searcher-context';

const MODES: { key: QuerySearcherMode; label: string; icon?: React.ReactNode }[] = [
  { key: 'conversation', label: 'Conversation' },
  { key: 'job-search',   label: 'Job Search', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 21L16.65 16.65M11 6C13.7614 6 16 8.23858 16 11M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
];

const PLACEHOLDERS: Record<QuerySearcherMode, string> = {
  'conversation': "What's on your mind?",
  'job-search':   'Enter the job title you\'re seeking',
};

const getScrollContainer = () =>
  document.querySelector('.Scroll') as HTMLElement | null;

export default function ChatBox() {
  const { mode, setMode, sendMessage, isStreaming } = useQuerySearcher();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea — restore outer scroll after browser's async scroll-into-view fires
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const scroller = getScrollContainer();
    const saved = scroller?.scrollTop ?? 0;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (scroller) requestAnimationFrame(() => { scroller.scrollTop = saved; });
  }, [input]);

  // Prevent outer scroll container from jumping when textarea receives focus
  const handleFocus = () => {
    const scroller = getScrollContainer();
    if (!scroller) return;
    const saved = scroller.scrollTop;
    requestAnimationFrame(() => { scroller.scrollTop = saved; });
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const switcherModes = MODES.slice(1);

  return (
    <div className="at-card">
      <textarea
        ref={textareaRef}
        className="at-input"
        id="form-field"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={PLACEHOLDERS[mode]}
        rows={1}
      />
      <div className="at-footer-row">
        <div className="at-mode-row">
          <span
            className={`at-conversation-label${mode === 'conversation' ? ' active' : ''}`}
            onClick={() => setMode('conversation')}
          >
            {MODES[0].label}
          </span>
          <div className="at-mode-switcher">
            {switcherModes.map(m => (
              <button
                key={m.key}
                className={`at-mode-btn${mode === m.key ? ' active' : ''}`}
                onClick={() => setMode(mode === m.key ? 'conversation' : m.key)}
              >
                {m.icon}
                {m.label}
                {mode === m.key && (
                  <span className="at-mode-close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 7L7 17M7 7L17 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button
          className="at-send-btn"
          onClick={handleSubmit}
          disabled={!input.trim() || isStreaming}
          aria-label="Send"
        >
          Send
        </button>
      </div>
    </div>
  );
}
