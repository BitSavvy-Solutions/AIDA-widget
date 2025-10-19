import { useState, useCallback, useRef } from 'react';
import { franc } from 'franc';

/**
 * The core engine for communicating with the chat API.
 * Manages sending, retrying, and stopping messages.
 * @param {object} config - Configuration object.
 * @returns An object with API status and control functions.
 */
export const useChatAPI = ({
    apiConfig,
    messages,
    setMessages,
    currentSessionId,
    updateCurrentSession,
    user,
    pageContext,
    customPrompt
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [lastCost, setLastCost] = useState(0);
    const streamAbortControllerRef = useRef(null);

    const langMap = { eng: "en", fra: "fr", ara: "ar", hin: "hi", tgl: "tl", ukr: "uk", san: "sa", nya: "ny" };
    const supportedLanguages = Object.values(langMap);

    const buildMessageHistoryPayload = useCallback((history = []) => {
        const messageHistory = [];
        if (pageContext && Object.keys(pageContext).length > 0) {
            messageHistory.push({ type: 'ai', content: `<PageContext>\n${JSON.stringify(pageContext, null, 2)}\n</PageContext>` });
        }
        if ((customPrompt || '').trim()) {
            messageHistory.push({ type: 'human', content: customPrompt.trim() });
        }
        messageHistory.push(...(history || []).map(m => ({
            type: m.sender === 'user' ? 'human' : 'ai',
            content: m.text || ''
        })));
        return messageHistory;
    }, [customPrompt, pageContext]);


    /**
     * The main function to send a message payload to the chat API and stream the response.
     * @param {object} userMessage - The full user message object.
     * @param {string} botMessageId - The ID for the upcoming bot response message.
     * @param {Array} historyForPayload - The message history to send to the API.
     */
    const streamResponse = async ({ userMessage, botMessageId, historyForPayload }) => {
        setIsLoading(true);
        setLastCost(0);

        const abortController = new AbortController();
        streamAbortControllerRef.current = abortController;

        const detectedLang = franc(userMessage.text);
        const detectedLanguageCode = supportedLanguages.includes(langMap[detectedLang]) ? langMap[detectedLang] : "en";
        const imageUrls = (userMessage.images || []).map(img => img.src).filter(Boolean);

        try {
            const payload = {
                user_input: userMessage.text,
                message_history: buildMessageHistoryPayload(historyForPayload, pageContext),
                user_id: user.id,
                email: user.email,
                page_path: window.location.pathname,
                language: detectedLanguageCode,
                model: userMessage.model, // The model is now part of the userMessage object
            };
            if (imageUrls.length > 0) {
                payload.image_data_urls = imageUrls;
            }

            const response = await fetch(apiConfig.chatUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: abortController.signal,
            });

            if (!response.ok || !response.body) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop(); // Keep incomplete part for the next chunk

                for (const part of parts) {
                    if (part.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(part.substring(6));
                            if (data.delta_content) {
                                setMessages(prev => {
                                    const updated = prev.map(m => m.id === botMessageId ? { ...m, text: m.text + data.delta_content } : m);
                                    if (currentSessionId) {
                                        // This is a "live" update, don't need sanitized messages yet
                                        updateCurrentSession(updated);
                                    }
                                    return updated;
                                });
                            }
                            if (data.cost !== undefined) {
                                setLastCost(data.cost);
                            }
                        } catch (e) {
                            console.error("Stream parse error:", part, e);
                        }
                    }
                }
            }
        } catch (error) {
            if (error?.name === 'AbortError') {
                console.info("Chat streaming was stopped by the user.");
            } else {
                console.error("Chatbot API error:", error);
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: "Oops! I couldn't connect. Please try again." } : m));
            }
        } finally {
            if (streamAbortControllerRef.current === abortController) {
                streamAbortControllerRef.current = null;
            }
            setIsLoading(false);
        }
    };
    
    /**
     * Stops the current streaming response, if one is in progress.
     */
    const stopStreaming = useCallback(() => {
        if (streamAbortControllerRef.current) {
            streamAbortControllerRef.current.abort();
            
            // Clean up empty bot message placeholder
            setMessages(prev => {
                 for (let i = prev.length - 1; i >= 0; i--) {
                    if (prev[i].sender === 'bot' && prev[i].text.trim() === '') {
                        const next = [...prev.slice(0, i)];
                        updateCurrentSession(next);
                        return next;
                    }
                    if (prev[i].sender !== 'bot') break;
                }
                return prev;
            });
        }
    }, [setMessages, updateCurrentSession]);

    return {
        isLoading,
        lastCost,
        streamResponse,
        stopStreaming,
    };
};