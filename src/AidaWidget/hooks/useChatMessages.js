/* src/AidaWidget/hooks/useChatMessages.js */
import { useState, useCallback } from 'react';

export const useChatMessages = (adapter) => {
    const [messages, setMessages] = useState([]);

    const loadMessagesForSession = useCallback(async (sessionId) => {
        if (!adapter || !sessionId) {
            setMessages([]);
            return;
        }

        try {
            const msgs = await adapter.getMessages(sessionId);
            setMessages(msgs || []);
        } catch (e) {
            console.error('Error loading messages via memory adapter:', e);
            setMessages([]);
        }
    }, [adapter]);

    const getSanitizedMessages = useCallback(() => messages, [messages]);

    return {
        messages,
        setMessages,
        getSanitizedMessages,
        loadMessagesForSession,
    };
};