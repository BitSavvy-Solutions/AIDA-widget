/* src/AidaWidget/hooks/useChatMessages.js */
import { useState, useEffect, useCallback } from 'react';

// Helper to remove heavy data (like base64 image strings and large text attachments) before storage.
const sanitizeMessagesForStorage = (msgs) => {
    if (!Array.isArray(msgs)) return [];
    // ✅ MODIFIED: Explicitly destructure and discard 'attachments', 'images', and 'reasoning'
    return msgs.map(msg => {
        const { images, reasoning, attachments, ...safeMessage } = msg;
        return safeMessage;
    });
};

/**
 * Manages the messages array for the current chat session,
 * syncing it with sessionStorage.
 * @returns An object with the messages array, its setter, and the sanitization utility.
 */
export const useChatMessages = () => {
    const [messages, setMessages] = useState(() => {
        try {
            const storedMessages = sessionStorage.getItem('chatMessages');
            return storedMessages ? JSON.parse(storedMessages) : [];
        } catch (e) {
            console.warn('Could not parse messages from sessionStorage:', e);
            return [];
        }
    });

    // Effect to persist messages to sessionStorage whenever they change.
    useEffect(() => {
        try {
            const sanitized = sanitizeMessagesForStorage(messages);
            sessionStorage.setItem('chatMessages', JSON.stringify(sanitized));
        } catch (e) {
            console.warn('Skipping chatMessages persist, likely due to storage limits:', e);
        }
    }, [messages]);

    // We also return the sanitizer function because useChatHistory will need it.
    const getSanitizedMessages = useCallback(() => {
        return sanitizeMessagesForStorage(messages);
    }, [messages]);

    return { messages, setMessages, getSanitizedMessages };
};