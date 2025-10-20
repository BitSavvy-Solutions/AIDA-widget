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
        const base = firstUser ? firstUser.text.trim() : 'Untitled Chat';
        return base.length > 60 ? `${base.slice(0, 57)}…` : base;
    }, []);

    // --- Session Management ---
    const createNewSession = useCallback((currentMsgs) => {
        const id = `chat-${Date.now()}`;
        const title = buildTitleFromMessages(currentMsgs);
        const newSession = { id, title, createdAt: Date.now(), messages: currentMsgs };
        persistHistory([newSession, ...historyItems].slice(0, 200));
        setCurrentSessionId(id);
        try { sessionStorage.setItem(CURRENT_SESSION_KEY, id); } catch { }
    }, [historyItems, buildTitleFromMessages]);
    
    const updateCurrentSession = useCallback((currentMsgs) => {
        if (!currentSessionId) return;
        const title = buildTitleFromMessages(currentMsgs);
        const updatedItems = historyItems.map(h =>
            h.id === currentSessionId ? { ...h, title, messages: currentMsgs } : h
        );
        persistHistory(updatedItems);
    }, [currentSessionId, historyItems, buildTitleFromMessages]);

    const saveCurrentChatToHistory = useCallback(() => {
        const msgs = getSanitizedMessages();
        if (!msgs || msgs.length === 0) return;

        // If there's an active session, update it. Otherwise, create a new one.
        if (currentSessionId && historyItems.some(h => h.id === currentSessionId)) {
            updateCurrentSession(msgs);
        } else {
            const id = `chat-${Date.now()}`;
            const title = buildTitleFromMessages(msgs);
            const newSession = { id, title, createdAt: Date.now(), messages: msgs };
            persistHistory([newSession, ...historyItems].slice(0, 200));
            // Don't set this as the current session, it's a "save as new" action.
        }
    }, [getSanitizedMessages, currentSessionId, historyItems, buildTitleFromMessages, updateCurrentSession]);


    // --- Handlers for ChatHistoryPanel ---
    const handlers = useMemo(() => ({
        onDelete: (chatId) => {
            persistHistory(historyItems.filter(h => h.id !== chatId));
            persistProjects(projects.map(p => ({
                ...p,
                chatIds: (p.chatIds || []).filter(id => id !== chatId),
            })));
        },
        onRename: (id, newTitle) => {
            persistHistory(historyItems.map(item => item.id === id ? { ...item, title: newTitle.trim() || 'Untitled Chat' } : item));
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
        onShare: async (session) => { /* Share logic remains the same */ }
    }), [historyItems, projects]);

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
