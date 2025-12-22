/* src/AidaWidget/hooks/useChatHistory.js */
import { useState, useCallback, useMemo } from 'react';

const HISTORY_KEY = 'aida-chat-history';
const HISTORY_PROJECTS_KEY = 'aida-history-projects';
const CURRENT_SESSION_KEY = 'aida-current-session-id'; // sessionStorage key
const LAST_ACTIVE_SESSION_KEY = 'aida-last-active-session-id'; // localStorage key (persistence)

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

export const useChatHistory = (getSanitizedMessages) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [historyItems, setHistoryItems] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch {
            return [];
        }
    });
    
    const [projects, setProjects] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(HISTORY_PROJECTS_KEY)) || [];
            return stored.map(ensureProjectDefaults);
        } catch {
            return [];
        }
    });

    // Initialize from Session Storage first, fallback to null
    const [currentSessionId, _setCurrentSessionIdState] = useState(() => {
        if (typeof window === 'undefined') return null;
        return sessionStorage.getItem(CURRENT_SESSION_KEY) || null;
    });

    // ✅ NEW: Wrapper to ensure we save ID to both Session (tab) and Local (persistence) storage
    const setCurrentSessionId = useCallback((id) => {
        _setCurrentSessionIdState(id);
        if (id) {
            try {
                sessionStorage.setItem(CURRENT_SESSION_KEY, id);
                localStorage.setItem(LAST_ACTIVE_SESSION_KEY, id);
            } catch (e) { console.warn('Storage error', e); }
        } else {
            try {
                sessionStorage.removeItem(CURRENT_SESSION_KEY);
                localStorage.removeItem(LAST_ACTIVE_SESSION_KEY);
            } catch (e) { console.warn('Storage error', e); }
        }
    }, []);

    const persistHistory = (items) => {
        setHistoryItems(items);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch { }
    };
    
    const persistProjects = (items) => {
        const normalized = (items || []).map(ensureProjectDefaults);
        setProjects(normalized);
        try { localStorage.setItem(HISTORY_PROJECTS_KEY, JSON.stringify(normalized)); } catch { }
    };

    const buildTitleFromMessages = useCallback((msgs) => {
        const firstUser = (msgs || []).find(m => m.sender === 'user' && (m.text || '').trim());
        const base = firstUser ? firstUser.text.trim() : 'New Chat';
        return base.length > 60 ? `${base.slice(0, 57)}…` : base;
    }, []);

    const createNewSession = useCallback((currentMsgs) => {
        const id = `chat-${Date.now()}`;
        const title = buildTitleFromMessages(currentMsgs);
        const newSession = { id, title, createdAt: Date.now(), messages: currentMsgs, customTitle: false };
        
        // ✅ Save to History immediately
        setHistoryItems(prev => {
            const updated = [newSession, ...prev].slice(0, 200);
            try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { }
            return updated;
        });

        // ✅ Set as active immediately in both storages
        setCurrentSessionId(id);
        
        return id;
    }, [buildTitleFromMessages, setCurrentSessionId]);
    
    const updateCurrentSession = useCallback((currentMsgs, explicitId = null) => {
        const targetId = explicitId || currentSessionId;
        if (!targetId) return;
        
        const autoTitle = buildTitleFromMessages(currentMsgs);
        
        setHistoryItems(prevItems => {
            // Check if session exists, if not (rare race condition), create it
            const exists = prevItems.some(h => h.id === targetId);
            if (!exists) {
                const newSession = { id: targetId, title: autoTitle, createdAt: Date.now(), messages: currentMsgs, customTitle: false };
                const updated = [newSession, ...prevItems].slice(0, 200);
                try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { }
                return updated;
            }

            const updatedItems = prevItems.map(h => {
                if (h.id === targetId) {
                    const finalTitle = h.customTitle ? h.title : autoTitle;
                    return { ...h, title: finalTitle, messages: currentMsgs };
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
            createNewSession(msgs);
        }
    }, [getSanitizedMessages, currentSessionId, historyItems, createNewSession, updateCurrentSession]);

    const copyTextToClipboard = useCallback(async (text) => {
        if (typeof text !== 'string' || text.length === 0) return false;
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            try { await navigator.clipboard.writeText(text); return true; } catch (_) { }
        }
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        let success = false;
        try { success = document.execCommand('copy'); } catch (_) { } 
        document.body.removeChild(textarea);
        return success;
    }, []);

    const formatChatForShare = useCallback((session) => {
        if (!session) return '';
        const { title, createdAt, messages } = session;
        const lines = [];
        const trimmedTitle = (title || '').trim();
        if (trimmedTitle) lines.push(`Title: ${trimmedTitle}`);
        if (createdAt) lines.push(`Created: ${new Date(createdAt).toLocaleString()}`);
        lines.push('');
        
        (messages || []).forEach((message) => {
            const sender = message.sender === 'bot' ? 'Aida' : 'User';
            const content = message.text || '';
            lines.push(`${sender}: ${content}`);
            lines.push('');
        });
        return lines.join('\n');
    }, []);

    const handlers = useMemo(() => ({
        onDelete: (chatId) => {
            const newItems = historyItems.filter(h => h.id !== chatId);
            persistHistory(newItems);
            persistProjects(projects.map(p => ({ ...p, chatIds: (p.chatIds || []).filter(id => id !== chatId) })));
            
            // If we deleted the active chat, clear the ID
            if (chatId === currentSessionId) {
                setCurrentSessionId(null);
            }
        },
        onRename: (id, newTitle) => {
            const newItems = historyItems.map(item => item.id === id ? { ...item, title: newTitle.trim() || 'Untitled Chat', customTitle: true } : item);
            persistHistory(newItems);
        },
        onCreateProject: (projectName, initialChatId = null) => {
            const trimmed = projectName.trim();
            if (!trimmed || projects.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return null;
            const newId = `project-${Date.now()}`;
            const chatIds = initialChatId ? [initialChatId] : [];
            const newProject = ensureProjectDefaults({ id: newId, name: trimmed, chatIds });
            persistProjects([newProject, ...projects]);
            return newId;
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
    }), [historyItems, projects, currentSessionId, copyTextToClipboard, formatChatForShare, setCurrentSessionId]);

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