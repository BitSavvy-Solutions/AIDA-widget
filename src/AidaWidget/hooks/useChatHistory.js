/* src/AidaWidget/hooks/useChatHistory.js */
import { useState, useCallback, useEffect, useMemo } from 'react';

const CURRENT_SESSION_KEY = 'aida-current-session-id';

const buildTitleFromMessages = (msgs) => {
    const firstUser = (msgs || []).find(
        (m) => m.sender === 'user' && (m.text || '').trim(),
    );
    const base = firstUser ? firstUser.text.trim() : 'New Chat';
    return base.length > 60 ? `${base.slice(0, 57)}…` : base;
};

/**
 * Chat history backed by a host-provided memory adapter.
 * If no adapter is supplied, all history functionality is disabled.
 */
export const useChatHistory = (adapter, getSanitizedMessages) => {
    const [currentSessionId, _setCurrentSessionId] = useState(() => {
        if (typeof window === 'undefined') return null;
        return sessionStorage.getItem(CURRENT_SESSION_KEY) || null;
    });

    const [sessions, setSessions] = useState([]);
    const [tags, setTags] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);

    const setCurrentSessionId = useCallback((id) => {
        _setCurrentSessionId(id);
        if (id) sessionStorage.setItem(CURRENT_SESSION_KEY, id);
        else sessionStorage.removeItem(CURRENT_SESSION_KEY);
    }, []);

    const loadMeta = useCallback(async () => {
        if (!adapter) {
            setSessions([]);
            setTags([]);
            setCurrentSession(null);
            return;
        }

        try {
            const [sessionsList, tagsList] = await Promise.all([
                adapter.listSessions(),
                adapter.listTags(),
            ]);
            setSessions(sessionsList || []);
            setTags(tagsList || []);
        } catch (e) {
            console.error('Failed to load chat history meta:', e);
        }
    }, [adapter]);

    // Subscribe to adapter changes when available.
    useEffect(() => {
        if (!adapter || !adapter.subscribe) return undefined;
        const unsubscribe = adapter.subscribe(() => {
            loadMeta();
        });
        return unsubscribe;
    }, [adapter, loadMeta]);

    useEffect(() => {
        loadMeta();
    }, [loadMeta]);

    // Load current session metadata (title, tagIds) only, never full messages.
    useEffect(() => {
        if (!adapter || !currentSessionId) {
            setCurrentSession(null);
            return;
        }

        let cancelled = false;
        adapter.getSessionMeta(currentSessionId)
            .then((meta) => {
                if (!cancelled) setCurrentSession(meta || null);
            })
            .catch(() => {
                if (!cancelled) setCurrentSession(null);
            });

        return () => {
            cancelled = true;
        };
    }, [adapter, currentSessionId, sessions]);

    const createNewSession = useCallback(async (currentMsgs) => {
        if (!adapter) return null;

        const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        try {
            await adapter.createSession({
                id,
                title: buildTitleFromMessages(currentMsgs),
                messages: currentMsgs,
            });
            setCurrentSessionId(id);
            loadMeta();
            return id;
        } catch (e) {
            console.error('Failed to create session via memory adapter:', e);
            return null;
        }
    }, [adapter, setCurrentSessionId, loadMeta]);

    const updateCurrentSession = useCallback(async (currentMsgs, explicitId = null) => {
        if (!adapter) return;
        const targetId = explicitId || currentSessionId;
        if (!targetId) return;
    
        try {
            // Only update messages – title stays as it is
            await adapter.updateSession(targetId, {
                messages: currentMsgs,
            });
            loadMeta();
        } catch (e) {
            console.error('Failed to update session via memory adapter:', e);
        }
    }, [adapter, currentSessionId, loadMeta]);

    const saveCurrentChatToHistory = useCallback(() => {
        const msgs = getSanitizedMessages();
        if (!msgs || msgs.length === 0) return;

        if (currentSessionId) {
            updateCurrentSession(msgs);
        } else if (adapter && msgs.some((m) => m.sender === 'user')) {
            createNewSession(msgs);
        }
    }, [
        getSanitizedMessages,
        currentSessionId,
        updateCurrentSession,
        createNewSession,
        adapter,
    ]);

    const historyHandlers = useMemo(() => {
        if (!adapter) {
            return {
                onRename: null,
                onDelete: null,
                onCreateProject: null,
                onAssignChatToProject: null,
                onRemoveChatFromProject: null,
                onUpdateProjectAppearance: null,
                onDeleteProject: null,
            };
        }

        return {
            onRename: (id, newTitle) => adapter.renameSession(id, newTitle),
            onDelete: (id) => adapter.deleteSession(id),
            onCreateProject: async (name, initialChatId = null) => {
                const tagId = await adapter.createTag(name);
                if (tagId && initialChatId) {
                    await adapter.assignTag(initialChatId, tagId);
                }
                loadMeta();
                return tagId;
            },
            onAssignChatToProject: (tagId, chatId) => adapter.assignTag(chatId, tagId),
            onRemoveChatFromProject: (tagId, chatId) => adapter.removeTag(chatId, tagId),
            onUpdateProjectAppearance: (tagId, updates) => adapter.updateTag(tagId, updates),
            onDeleteProject: (tagId) => {
                if (typeof adapter.deleteTag === 'function') {
                    return adapter.deleteTag(tagId);
                }
                return null;
            },
        };
    }, [adapter, loadMeta]);

    return {
        historyItems: sessions,
        projects: tags,
        currentSession,
        currentSessionId,
        setCurrentSessionId,
        createNewSession,
        updateCurrentSession,
        saveCurrentChatToHistory,
        historyHandlers,
    };
};