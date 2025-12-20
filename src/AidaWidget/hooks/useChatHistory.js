/* src/AidaWidget/hooks/useChatHistory.js */
import { useState, useCallback, useMemo } from 'react';

const HISTORY_KEY = 'aida-chat-history';
const HISTORY_PROJECTS_KEY = 'aida-history-projects';
const CURRENT_SESSION_KEY = 'aida-current-session-id';
const DEFAULT_PROJECT_ICON_KEY = 'notebook';
const DEFAULT_PROJECT_ICON_COLOR = '#9CA3AF';

const ensureProjectDefaults = (project = {}) => {
    const {
        iconKey = DEFAULT_PROJECT_ICON_KEY,
        iconColor = DEFAULT_PROJECT_ICON_COLOR,
    } = project;

    return {
        ...project,
        iconKey,
        iconColor,
    };
};

/**
 * Manages long-term chat history and projects stored in localStorage.
 * @param {Function} getSanitizedMessages - A function that returns the current message thread, sanitized for storage.
 * @returns An object with history state, panel state, and handler functions.
 */
export const useChatHistory = (getSanitizedMessages) => {
    // --- State ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [historyItems, setHistoryItems] = useState(() => JSON.parse(localStorage.getItem(HISTORY_KEY)) || []);
    const [projects, setProjects] = useState(() => {
        const stored = JSON.parse(localStorage.getItem(HISTORY_PROJECTS_KEY)) || [];
        return stored.map(ensureProjectDefaults);
    });
    const [currentSessionId, setCurrentSessionId] = useState(() => sessionStorage.getItem(CURRENT_SESSION_KEY) || null);

    // --- Persistence Wrappers ---
    const persistHistory = (items) => {
        setHistoryItems(items);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch { }
    };
    const persistProjects = (items) => {
        const normalized = (items || []).map(ensureProjectDefaults);
        setProjects(normalized);
        try { localStorage.setItem(HISTORY_PROJECTS_KEY, JSON.stringify(normalized)); } catch { }
    };

    // --- Utility ---
    const buildTitleFromMessages = useCallback((msgs) => {
        const firstUser = (msgs || []).find(m => m.sender === 'user' && (m.text || '').trim());
        const base = firstUser ? firstUser.text.trim() : 'New Chat';
        return base.length > 60 ? `${base.slice(0, 57)}…` : base;
    }, []);

    // --- Session Management ---
    const createNewSession = useCallback((currentMsgs) => {
        const id = `chat-${Date.now()}`;
        const title = buildTitleFromMessages(currentMsgs);
        // ✅ FIX: Initialize customTitle as false
        const newSession = { 
            id, 
            title, 
            createdAt: Date.now(), 
            messages: currentMsgs,
            customTitle: false 
        };
        
        setHistoryItems(prev => {
            const updated = [newSession, ...prev].slice(0, 200);
            try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { }
            return updated;
        });
        
        setCurrentSessionId(id);
        try { sessionStorage.setItem(CURRENT_SESSION_KEY, id); } catch { }
        
        return id;
    }, [buildTitleFromMessages]);
    
    const updateCurrentSession = useCallback((currentMsgs, explicitId = null) => {
        const targetId = explicitId || currentSessionId;
        
        if (!targetId) return;
        
        // Calculate what the auto-title *would* be
        const autoTitle = buildTitleFromMessages(currentMsgs);

        setHistoryItems(prevItems => {
            const updatedItems = prevItems.map(h => {
                if (h.id === targetId) {
                    // ✅ FIX: If the user manually renamed it (customTitle is true), keep the existing title.
                    // Otherwise, update the title based on the new messages.
                    const finalTitle = h.customTitle ? h.title : autoTitle;
                    
                    return { 
                        ...h, 
                        title: finalTitle, 
                        messages: currentMsgs 
                    };
                }
                return h;
            });
            
            try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedItems)); } catch { }
            
            return updatedItems;
        });
    }, [currentSessionId, buildTitleFromMessages]);

    const saveCurrentChatToHistory = useCallback(() => {
        const msgs = getSanitizedMessages();
        if (!msgs || msgs.length === 0) return;

        if (currentSessionId && historyItems.some(h => h.id === currentSessionId)) {
            updateCurrentSession(msgs);
        } else {
            const id = `chat-${Date.now()}`;
            const title = buildTitleFromMessages(msgs);
            const newSession = { id, title, createdAt: Date.now(), messages: msgs, customTitle: false };
            
            setHistoryItems(prev => {
                const updated = [newSession, ...prev].slice(0, 200);
                try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { }
                return updated;
            });
        }
    }, [getSanitizedMessages, currentSessionId, historyItems, buildTitleFromMessages, updateCurrentSession]);

    const copyTextToClipboard = useCallback(async (text) => {
        if (typeof text !== 'string' || text.length === 0) return false;

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {
                // Fall through to legacy fallback
            }
        }

        if (typeof document === 'undefined') return false;

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        let success = false;
        try {
            success = document.execCommand('copy');
        } catch (_) {
            success = false;
        } finally {
            document.body.removeChild(textarea);
        }

        return success;
    }, []);

    const formatChatForShare = useCallback((session) => {
        if (!session) return '';
        const { title, createdAt, messages } = session;
        const lines = [];
        const trimmedTitle = (title || '').trim();

        if (trimmedTitle) {
            lines.push(`Title: ${trimmedTitle}`);
        }

        if (createdAt) {
            const date = new Date(createdAt);
            if (!Number.isNaN(date.getTime())) {
                lines.push(`Created: ${date.toLocaleString()}`);
            }
        }

        if (lines.length) {
            lines.push('');
        }

        if (!Array.isArray(messages) || messages.length === 0) {
            lines.push('No messages available.');
        } else {
            messages.forEach((message, index) => {
                const rawSender = (message && (message.sender || message.role)) || 'user';
                const sender = typeof rawSender === 'string' && rawSender.trim()
                    ? rawSender.trim()
                    : 'user';
                const label = sender === 'bot'
                    ? 'Aida'
                    : sender.charAt(0).toUpperCase() + sender.slice(1);
                const content = typeof message?.text === 'string' ? message.text : '';
                const hasContent = content.trim().length > 0;

                if (hasContent) {
                    lines.push(`${label}: ${content}`);
                } else {
                    lines.push(`${label}:`);
                }

                if (index !== messages.length - 1) {
                    lines.push('');
                }
            });
        }

        while (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }

        return lines.join('\n');
    }, []);


    // --- Handlers for ChatHistoryPanel ---
    const handlers = useMemo(() => ({
        onDelete: (chatId) => {
            const newItems = historyItems.filter(h => h.id !== chatId);
            persistHistory(newItems);
            persistProjects(projects.map(p => ({
                ...p,
                chatIds: (p.chatIds || []).filter(id => id !== chatId),
            })));
        },
        onRename: (id, newTitle) => {
            // ✅ FIX: When renaming, set customTitle to true so updateCurrentSession doesn't overwrite it
            const newItems = historyItems.map(item => 
                item.id === id 
                    ? { ...item, title: newTitle.trim() || 'Untitled Chat', customTitle: true } 
                    : item
            );
            persistHistory(newItems);
        },
        onCreateProject: (projectName) => {
            const trimmed = projectName.trim();
            if (!trimmed || projects.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return false;
            const newProject = ensureProjectDefaults({ id: `project-${Date.now()}`, name: trimmed, chatIds: [] });
            persistProjects([newProject, ...projects]);
            return true;
        },
        onDeleteProject: (projectId) => {
            persistProjects(projects.filter(p => p.id !== projectId));
        },
        onAssignChatToProject: (projectId, chatId) => {
            persistProjects(projects.map(p => {
                if (p.id !== projectId || (p.chatIds || []).includes(chatId)) return p;
                return { ...p, chatIds: [...p.chatIds, chatId] };
            }));
        },
        onRemoveChatFromProject: (projectId, chatId) => {
            persistProjects(projects.map(p => {
                if (p.id !== projectId) return p;
                return { ...p, chatIds: (p.chatIds || []).filter(id => id !== chatId) };
            }));
        },
        onRenameProject: (projectId, name) => {
            const trimmed = (name || '').trim();
            if (!trimmed) return;
            persistProjects(projects.map(p => p.id === projectId ? { ...p, name: trimmed } : p));
        },
        onUpdateProjectAppearance: (projectId, updates = {}) => {
            if (!projectId || !updates) return;
            persistProjects(projects.map(p => p.id === projectId ? ensureProjectDefaults({ ...p, ...updates }) : p));
        },
        onShare: async (session) => {
            const transcript = formatChatForShare(session);
            if (!transcript) return false;
            return copyTextToClipboard(transcript);
        }
    }), [historyItems, projects, copyTextToClipboard, formatChatForShare]);

    const openPanel = useCallback(() => setIsPanelOpen(true), []);
    const closePanel = useCallback(() => setIsPanelOpen(false), []);

    return {
        isPanelOpen,
        openPanel,
        closePanel,
        historyItems,
        projects,
        currentSessionId,
        setCurrentSessionId,
        createNewSession,
        updateCurrentSession,
        saveCurrentChatToHistory,
        historyHandlers: handlers,
    };
};