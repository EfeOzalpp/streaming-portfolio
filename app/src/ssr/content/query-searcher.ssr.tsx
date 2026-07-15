// src/ssr/content/query-searcher.ssr.tsx
import type { SsrDescriptor } from '../types';

export const querySearcherSSR: SsrDescriptor = {
  fetch: async () => null,

  render: (_data) => (
    <section
      className="query-searcher"
      id="no-ssr"
      data-ssr-shell="query-searcher"
      style={{
        position: 'relative',
        width: '100%',
        height: '96dvh',
        overflow: 'hidden',
        overflowAnchor: 'none',
      }}
    >
      <div className="at-surface tooltip-query-searcher">
        {/* Greeting — matches initial conversation mode */}
        <p className="at-greeting">
          Hello{' '}
          <svg style={{ display: 'inline', verticalAlign: 'middle', marginBottom: '0.1em' }} width="0.9em" height="0.9em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 15.2422C21.206 14.435 22 13.0602 22 11.5C22 9.15643 20.2085 7.23129 17.9203 7.01937C17.4522 4.17213 14.9798 2 12 2C9.02024 2 6.54781 4.17213 6.07974 7.01937C3.79151 7.23129 2 9.15643 2 11.5C2 13.0602 2.79401 14.435 4 15.2422M12.25 15L9.44995 22M17.05 13L14.25 20M9.05 13L6.25 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {' '}, how's everything?
        </p>

        {/* Static chatbox shell */}
        <div className="at-card">
          <textarea
            className="at-input"
            placeholder="What's on your mind?"
            rows={1}
            readOnly
          />
          <div className="at-footer-row">
            <div className="at-mode-row">
              <span className="at-conversation-label active">Conversation</span>
              <div className="at-mode-switcher">
                <button className="at-mode-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L16.65 16.65M11 6C13.7614 6 16 8.23858 16 11M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Job Search
                </button>
              </div>
            </div>
            <button className="at-send-btn" disabled>Send</button>
          </div>
        </div>
      </div>
    </section>
  ),

  criticalCssFiles: ['src/styles/block-type-t.css'],
};
