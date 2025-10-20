/* src/AidaWidget/hooks/useChatAPI.js */
import { useState, useCallback, useRef } from 'react';
import { franc } from 'franc';

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

    const buildMessageHistoryPayload = useCallback((history = [], attachments = []) => {
        const messageHistory = [];
        if (pageContext && Object.keys(pageContext).length > 0) {
            messageHistory.push({ type: 'ai', content: `<PageContext>\n${JSON.stringify(pageContext, null, 2)}\n</PageContext>` });
        }
        if ((customPrompt || '').trim()) {
            messageHistory.push({ type: 'human', content: customPrompt.trim() });
        }

        const textAndUrlAttachments = attachments.filter(att => att.type === 'text' || att.type === 'url');
        if (textAndUrlAttachments.length > 0) {
            let attachmentContext = '<Attachments>\n';
            textAndUrlAttachments.forEach((att, idx) => {
                if (att.type === 'text') {
                    attachmentContext += `\n[Text File ${idx + 1}: ${att.name}]\n${att.content}\n`;
                } else if (att.type === 'url') {
                    attachmentContext += `\n[URL ${idx + 1}]: ${att.url}\n`;
                }
            });
            attachmentContext += '\n</Attachments>';
            messageHistory.push({ type: 'human', content: attachmentContext });
        }

        messageHistory.push(...(history || []).map(m => ({
            type: m.sender === 'user' ? 'human' : 'ai',
            content: m.text || ''
        })));
        return messageHistory;
    }, [customPrompt, pageContext]);

    const streamResponse = async ({ userMessage, botMessageId, historyForPayload, attachments = [] }) => {
        setIsLoading(true);
        setLastCost(0);

        const abortController = new AbortController();
        streamAbortControllerRef.current = abortController;

        const detectedLang = franc(userMessage.text);
        const detectedLanguageCode = supportedLanguages.includes(langMap[detectedLang]) ? langMap[detectedLang] : "en";
        const imageAttachments = attachments.filter(att => att.type === 'image');
        const imageUrls = imageAttachments.map(img => img.src).filter(Boolean);

        try {
            const payload = {
                user_input: userMessage.text,
                message_history: buildMessageHistoryPayload(historyForPayload, attachments),
                user_id: user.id,
                email: user.email,
                page_path: window.location.pathname,
                language: detectedLanguageCode,
                model: userMessage.model,
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
                buffer = parts.pop();
                for (const part of parts) {
                    if (part.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(part.substring(6));
                            if (data.delta_content) {
                                setMessages(prev => {
                                    const updated = prev.map(m => m.id === botMessageId ? { ...m, text: m.text + data.delta_content } : m);
                                    if (currentSessionId) {
                                        updateCurrentSession(updated);
                                    }
                                    return updated;
                                });
                            }
                            if (data.cost !== undefined) setLastCost(data.cost);
                        } catch (e) { console.error("Stream parse error:", part, e); }
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
    
    const stopStreaming = useCallback(() => {
        if (streamAbortControllerRef.current) {
            streamAbortControllerRef.current.abort();
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

    return { isLoading, lastCost, streamResponse, stopStreaming };
};