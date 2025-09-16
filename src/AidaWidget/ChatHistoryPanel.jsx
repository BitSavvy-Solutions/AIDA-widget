import React, { useEffect, useMemo, useState } from 'react';

const ChatHistoryPanel = ({ theme = 'dark', open = false, onClose, sessions = [], onSelect, onDelete }) => {
  const isDark = theme === 'dark';
  const [query, setQuery] = useState('');
  const tokens = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const isMatch = useMemo(() => (
    (s) => {
      if (tokens.length === 0) return false;
      const hay = `${s.title || ''} ${(s.messages || []).map(m => m.text || '').join(' ')}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    }
  ), [tokens]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
      {/* Dim background; clickable only when open */}
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${open ? 'opacity-40 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-black' : 'bg-black'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 bottom-0 w-64 sm:w-72 transform transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'} ${isDark ? 'bg-gray-900 text-gray-100 border-l border-gray-800' : 'bg-white text-gray-900 border-l border-gray-200'} shadow-xl pointer-events-auto`}>
        <div className="px-3 py-2 border-b border-gray-700/40">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Chat History</h3>
            <button onClick={onClose} className={`p-1 rounded ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`} aria-label="Close history">✕</button>
          </div>
          <div className="mt-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles and content..."
              className={`w-full text-sm px-2 py-1 rounded border outline-none ${isDark ? 'bg-gray-800 border-gray-700 placeholder-gray-400 text-gray-100' : 'bg-white border-gray-300 placeholder-gray-400 text-gray-900'}`}
              aria-label="Search chat history"
            />
          </div>
        </div>
        <div className="h-full overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <div className="text-xs opacity-70 px-2 py-3">No saved chats yet.</div>
          )}
          {sessions.map((s) => {
            const matched = isMatch(s);
            return (
            <div key={s.id} className={`group rounded-md px-2 py-2 cursor-pointer ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} ${matched ? 'ring-2 ring-amber-400' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <button
                  className="flex-1 text-left truncate text-sm"
                  onClick={() => onSelect && onSelect(s)}
                  title={s.title}
                >
                  {s.title || 'Untitled chat'}
                </button>
                {onDelete && (
                  <button
                    className={`text-xs opacity-70 ${isDark ? 'hover:text-red-400' : 'hover:text-red-600'}`}
                    onClick={() => onDelete(s.id)}
                    aria-label="Delete chat"
                    title="Delete chat"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="text-[11px] opacity-60 mt-0.5">{new Date(s.createdAt).toLocaleString()}</div>
            </div>
          );})}
        </div>
      </aside>
    </div>
  );
};

export default ChatHistoryPanel;
