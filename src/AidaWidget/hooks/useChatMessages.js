/* src/AidaWidget/hooks/useChatMessages.js */
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';

// Helper to remove heavy data if we still want to use sessionStorage as a backup/cache
const sanitizeMessagesForStorage = (msgs) => {
    if (!Array.isArray(msgs)) return [];
    return msgs.map(msg => {
        // We can keep images in memory, but maybe strip them for sessionStorage if we use it
        const { ...safeMessage } = msg;
        return safeMessage;
    });
};

export const useChatMessages = () => {
    const [messages, setMessages] = useState([]);

    // We expose a method to load messages specifically for a session ID
    // This is called by AidaWidget when currentSessionId changes
    const loadMessagesForSession = useCallback(async (sessionId) => {
        if (!sessionId) {
            setMessages([]);
            return;
        }
        try {
            const session = await db.chats.get(sessionId);
            if (session && session.messages) {
                setMessages(session.messages);
            } else {
                setMessages([]);
            }
        } catch (e) {
            console.error("Error loading messages from DB:", e);
            setMessages([]);
        }
    }, []);

    // We still return getSanitizedMessages for the history hook to use when saving
    const getSanitizedMessages = useCallback(() => {
        return sanitizeMessagesForStorage(messages);
    }, [messages]);

    return { 
        messages, 
        setMessages, 
        getSanitizedMessages,
        loadMessagesForSession 
    };
};