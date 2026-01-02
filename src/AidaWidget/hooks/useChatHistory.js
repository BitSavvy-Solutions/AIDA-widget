/* src/AidaWidget/hooks/useChatHistory.js */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, migrateFromLocalStorage } from '../db';

const CURRENT_SESSION_KEY = 'aida-current-session-id';

const DEFAULT_PROJECT_ICON_KEY = 'notebook';
const DEFAULT_PROJECT_ICON_COLOR = '#9CA3AF';

const ensureProjectDefaults = (project = {}) => {
    const {
        iconKey = DEFAULT_PROJECT_ICON_KEY,
        iconColor = DEFAULT_PROJECT_ICON_COLOR,
    } = project;

    return { ...project, iconKey, iconColor };
};

// We can be less aggressive with sanitization now that we have IndexedDB capacity,
// but it's still good practice to strip derived state if not needed.
const sanitizeForHistory = (msgs) => {
    if (!Array.isArray(msgs)) return [];
    return msgs.map(msg => {
        // We keep attachments/images now! IndexedDB can handle blobs/base64 better.
        // We might strip 'reasoning' if it's huge and not needed for history.
        const { ...safeMessage } = msg; 
        return safeMessage;
    });
};

export const useChatHistory = (getSanitizedMessages) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Run migration once on mount
    useEffect(() => {
        migrateFromLocalStorage();
    }, []);

    // ✅ DEXIE: Automatically keeps 'historyItems' in sync with DB
    const historyItems = useLiveQuery(
        () => db.chats.orderBy('createdAt').reverse().toArray(),
        []
    ) || [];

    // ✅ DEXIE: Automatically keeps 'projects' in sync with DB
    const projects = useLiveQuery(
        () => db.projects.toArray(),
        []
    ) || [];

    // Initialize from Session Storage. 
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

    const buildTitleFromMessages = useCallback((msgs) => {
        const firstUser = (msgs || []).find(m => m.sender === 'user' && (m.text || '').trim());
        const base = firstUser ? firstUser.text.trim() : 'New Chat';
        return base.length > 60 ? `${base.slice(0, 57)}…` : base;
    }, []);

    const createNewSession = useCallback(async (currentMsgs) => {
        const id = `chat-${Date.now()}`;
        const title = buildTitleFromMessages(currentMsgs);
        const safeMessages = sanitizeForHistory(currentMsgs);
        
        const newSession = { 
            id, 
            title, 
            createdAt: Date.now(), 
            messages: safeMessages, 
            customTitle: false 
        };
        
        try {
            await db.chats.add(newSession);
            setCurrentSessionId(id);
            return id;
        } catch (e) {
            console.error("Failed to create session in DB", e);
            return null;
        }
    }, [buildTitleFromMessages, setCurrentSessionId]);
    
    const updateCurrentSession = useCallback(async (currentMsgs, explicitId = null) => {
        const targetId = explicitId || currentSessionId;
        if (!targetId) return;
        
        const autoTitle = buildTitleFromMessages(currentMsgs);
        const safeMessages = sanitizeForHistory(currentMsgs);
        
        try {
            const existing = await db.chats.get(targetId);
            
            if (!existing) {
                // If it doesn't exist (edge case), create it
                await db.chats.put({
                    id: targetId,
                    title: autoTitle,
                    createdAt: Date.now(),
                    messages: safeMessages,
                    customTitle: false
                });
            } else {
                // Update existing
                const finalTitle = existing.customTitle ? existing.title : autoTitle;
                await db.chats.update(targetId, {
                    title: finalTitle,
                    messages: safeMessages
                });
            }
        } catch (e) {
            console.error("Failed to update session in DB", e);
        }
    }, [currentSessionId, buildTitleFromMessages]);

    const saveCurrentChatToHistory = useCallback(() => {
        const msgs = getSanitizedMessages(); 
        if (!msgs || msgs.length === 0) return;
        
        if (currentSessionId) {
            updateCurrentSession(msgs);
        } else {
            createNewSession(msgs);
        }
    }, [getSanitizedMessages, currentSessionId, createNewSession, updateCurrentSession]);

    const handlers = useMemo(() => ({
        onDelete: async (chatId) => {
            try {
                await db.chats.delete(chatId);
                // Also remove this chat ID from any projects
                const projectsToUpdate = projects.filter(p => (p.chatIds || []).includes(chatId));
                for (const p of projectsToUpdate) {
                    const newChatIds = p.chatIds.filter(id => id !== chatId);
                    await db.projects.update(p.id, { chatIds: newChatIds });
                }
                if (chatId === currentSessionId) setCurrentSessionId(null);
            } catch (e) {
                console.error("Delete failed", e);
            }
        },
        onRename: async (id, newTitle) => {
            try {
                await db.chats.update(id, { 
                    title: newTitle.trim() || 'Untitled Chat', 
                    customTitle: true 
                });
            } catch (e) { console.error("Rename failed", e); }
        },
        onCreateProject: async (projectName, initialChatId = null) => {
            const trimmed = projectName.trim();
            if (!trimmed) return null;
            
            // Check for duplicates (simple check)
            const exists = projects.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
            if (exists) return null;

            const newId = `project-${Date.now()}`;
            const chatIds = initialChatId ? [initialChatId] : [];
            const newProject = ensureProjectDefaults({ id: newId, name: trimmed, chatIds });
            
            try {
                await db.projects.add(newProject);
                return newId;
            } catch (e) { console.error("Create project failed", e); return null; }
        },
        onDeleteProject: async (projectId) => {
            try { await db.projects.delete(projectId); } catch (e) { console.error(e); }
        },
        onAssignChatToProject: async (projectId, chatId) => {
            try {
                const project = await db.projects.get(projectId);
                if (project && !(project.chatIds || []).includes(chatId)) {
                    await db.projects.update(projectId, {
                        chatIds: [...(project.chatIds || []), chatId]
                    });
                }
            } catch (e) { console.error(e); }
        },
        onRemoveChatFromProject: async (projectId, chatId) => {
            try {
                const project = await db.projects.get(projectId);
                if (project) {
                    await db.projects.update(projectId, {
                        chatIds: (project.chatIds || []).filter(id => id !== chatId)
                    });
                }
            } catch (e) { console.error(e); }
        },
        onRenameProject: async (projectId, name) => {
            const trimmed = (name || '').trim();
            if (!trimmed) return;
            try { await db.projects.update(projectId, { name: trimmed }); } catch (e) { console.error(e); }
        },
        onUpdateProjectAppearance: async (projectId, updates = {}) => {
            if (!projectId || !updates) return;
            try { await db.projects.update(projectId, updates); } catch (e) { console.error(e); }
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
    }), [projects, currentSessionId, setCurrentSessionId]);

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