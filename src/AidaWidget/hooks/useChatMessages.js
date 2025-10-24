/* src/AidaWidget/hooks/useChatMessages.js */
import { useState, useEffect, useCallback } from 'react';

// Helper to remove heavy data (like base64 image strings) before storage.
// This function is kept local as it's only used here and by the hook's return.
const sanitizeMessagesForStorage = (msgs) => {
    if (!Array.isArray(msgs)) return [];
    // ✨ MODIFIED: Also remove 'attachments' to prevent large data from bloating localStorage.
    return msgs.map(({ images, reasoning, attachments, ...m }) => m);
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