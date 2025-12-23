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

// ✅ NEW: Helper to strip heavy data before saving to History
const sanitizeForHistory = (msgs) => {
    if (!Array.isArray(msgs)) return [];
    return msgs.map(msg => {
        // Destructure out the heavy fields we don't want in LocalStorage
        const { attachments, images, reasoning, ...safeMessage } = msg;
        return safeMessage;
    });
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

    // Initialize from Session Storage. This will be null if the browser window was closed.
    const [currentSessionId, _setCurrentSessionIdState] = useState(() => {
        if (typeof window === 'undefined') return null;
        return sessionStorage.getItem(CURRENT_SESSION_KEY) || null;
    });

    const setCurrentSessionId = useCallback((id) => {
        _setCurrentSessionIdState(id);
        if (id) {
            sessionStorage.setItem(CURRENT_SESSION_KEY, id);
        } else {
            sessionStorage.removeItem(CURRENT_SESSION_KEY);
        }
    }, []);

    const persistHistory = (items) => {
        setHistoryItems(items);
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
        } catch (e) {
            console.warn("LocalStorage History Save Failed (Quota Exceeded)", e);
        }
    };
    
    const persistProjects = (items) => {
        const normalized = (items || []).map(ensureProjectDefaults);
        setProjects(normalized);
        try {
            localStorage.setItem(HISTORY_PROJECTS_KEY, JSON.stringify(normalized));
        } catch (e) {
            console.warn("LocalStorage Projects Save Failed", e);
        }
    };

    const buildTitleFromMessages = useCallback((msgs) => {
        const firstUser = (msgs || []).find(m => m.sender === 'user' && (m.text || '').trim());
        const base = firstUser ? firstUser.text.trim() : 'New Chat';
        return base.length > 60 ? `${base.slice(0, 57)}…` : base;
    }, []);

    const createNewSession = useCallback((currentMsgs) => {
        const id = `chat-${Date.now()}`;
        const title = buildTitleFromMessages(currentMsgs);
        
        // ✅ FIX: Sanitize messages before creating the session object for storage
        const safeMessages = sanitizeForHistory(currentMsgs);
        
        const newSession = { id, title, createdAt: Date.now(), messages: safeMessages, customTitle: false };
        
        // Save to History immediately
        setHistoryItems(prev => {
            const updated = [newSession, ...prev].slice(0, 200);
            try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch (e) { console.warn("History save failed", e); }
            return updated;
        });

        setCurrentSessionId(id);
        return id;
    }, [buildTitleFromMessages, setCurrentSessionId]);
    
    const updateCurrentSession = useCallback((currentMsgs, explicitId = null) => {
        const targetId = explicitId || currentSessionId;
        if (!targetId) return;
        
        const autoTitle = buildTitleFromMessages(currentMsgs);
        
        // ✅ FIX: Sanitize messages before updating storage
        const safeMessages = sanitizeForHistory(currentMsgs);
        
        setHistoryItems(prevItems => {
            const exists = prevItems.some(h => h.id === targetId);
            let updatedItems;

            if (!exists) {
                const newSession = { id: targetId, title: autoTitle, createdAt: Date.now(), messages: safeMessages, customTitle: false };
                updatedItems = [newSession, ...prevItems].slice(0, 200);
            } else {
                updatedItems = prevItems.map(h => {
                    if (h.id === targetId) {
                        const finalTitle = h.customTitle ? h.title : autoTitle;
                        return { ...h, title: finalTitle, messages: safeMessages };
                    }
                    return h;
                });
            }
            
            try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedItems)); } catch (e) { console.warn("History update failed", e); }
            return updatedItems;
        });
    }, [currentSessionId, buildTitleFromMessages]);

    const saveCurrentChatToHistory = useCallback(() => {
        // getSanitizedMessages comes from useChatMessages, which we also need to ensure is strict
        const msgs = getSanitizedMessages(); 
        if (!msgs || msgs.length === 0) return;
        
        if (currentSessionId) {
            updateCurrentSession(msgs);
        } else {
            createNewSession(msgs);
        }
    }, [getSanitizedMessages, currentSessionId, createNewSession, updateCurrentSession]);

    const handlers = useMemo(() => ({
        onDelete: (chatId) => {
            const newItems = historyItems.filter(h => h.id !== chatId);
            persistHistory(newItems);
            persistProjects(projects.map(p => ({ ...p, chatIds: (p.chatIds || []).filter(id => id !== chatId) })));
            if (chatId === currentSessionId) setCurrentSessionId(null);
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
            const lines = [(session.title || 'Untitled Chat'), ''];
            (session.messages || []).forEach(m => {
                lines.push(`${m.sender === 'bot' ? 'Aida' : 'User'}: ${m.text || ''}\n`);
            });
            try {
                await navigator.clipboard.writeText(lines.join('\n'));
                return true;
            } catch { return false; }
        }
    }), [historyItems, projects, currentSessionId, setCurrentSessionId]);

    return {
        isPanelOpen,
        openPanel: () => setIsPanelOpen(true),
        closePanel: () => setIsPanelOpen(false),
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