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
    const [liveReasoning, setLiveReasoning] = useState({ text: '', botId: null, contentHasStarted: false });
    const [apiError, setApiError] = useState(null);
    
    const liveReasoningTextRef = useRef('');
    const streamAbortControllerRef = useRef(null);

    const langMap = { eng: "en", fra: "fr", ara: "ar", hin: "hi", tgl: "tl", ukr: "uk", san: "sa", nya: "ny" };
    const supportedLanguages = Object.values(langMap);

    const formatMessageContent = useCallback((message) => {
        if (!message) return '';
        let content = message.text || '';

        if (Array.isArray(message.attachments) && message.attachments.length > 0) {
            const textAndUrlAttachments = message.attachments.filter(att => att.type === 'text' || att.type === 'url');

            if (textAndUrlAttachments.length > 0) {
                let attachmentContent = '';
                textAndUrlAttachments.forEach(att => {
                    if (att.type === 'text' && att.content) {
                        attachmentContent = `\n\`\`\`${att.name}\n${att.content}\n\`\`\`\n` + attachmentContent;
                    } else if (att.type === 'url') {
                        attachmentContent += `\n[url: ${att.url}]\n`;
                    }
                });

                if (content.trim()) {
                    content = attachmentContent + content;
                } else {
                    content = attachmentContent.trim();
                }
            }
        }
        return content;
    }, []);

    const buildMessageHistoryPayload = useCallback((history = []) => {
        const messageHistory = [];
        if (pageContext && Object.keys(pageContext).length > 0) {
            messageHistory.push({ type: 'ai', content: `<PageContext>\n${JSON.stringify(pageContext, null, 2)}\n</PageContext>` });
        }
        if ((customPrompt || '').trim()) {
            messageHistory.push({ type: 'human', content: customPrompt.trim() });
        }
        (history || []).forEach(m => {
            const messagePayload = {
                type: m.sender === 'user' ? 'human' : 'ai',
                content: formatMessageContent(m)
            };
            if (m.sender === 'user' && Array.isArray(m.images) && m.images.length > 0) {
                const imageUrls = m.images.map(img => img.src).filter(Boolean);
                if (imageUrls.length > 0) {
                    messagePayload.image_data_urls = imageUrls;
                }
            }
            messageHistory.push(messagePayload);
        });

        return messageHistory;
    }, [customPrompt, pageContext, formatMessageContent]);

    const streamResponse = async ({ userMessage, botMessageId, historyForPayload, sessionId }) => {
        setIsLoading(true);
        setLastCost(0);
        setLiveReasoning({ text: '', botId: botMessageId, contentHasStarted: false });
        setApiError(null); 
        liveReasoningTextRef.current = '';

        const abortController = new AbortController();
        streamAbortControllerRef.current = abortController;

        // We still calculate this for language detection, but we don't send it as user_input anymore
        const currentUserInput = formatMessageContent(userMessage);
        const detectedLang = franc(currentUserInput);
        const detectedLanguageCode = supportedLanguages.includes(langMap[detectedLang]) ? langMap[detectedLang] : "en";
        const imageAttachments = (userMessage.attachments || []).filter(att => att.type === 'image');
        const imageUrls = imageAttachments.map(img => img.src).filter(Boolean);

        try {
            const payload = {
                // ✅ REMOVED: user_input: currentUserInput,
                message_history: buildMessageHistoryPayload(historyForPayload),
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

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData._HttpResponse__body) {
                        try {
                            const nestedBody = JSON.parse(errorData._HttpResponse__body);
                            errorMessage = nestedBody.error || nestedBody.message || errorMessage;
                        } catch (e) {
                            errorMessage = errorData._HttpResponse__body;
                        }
                    } else {
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    }
                } catch (e) {
                    console.warn("Could not parse error response JSON", e);
                }

                const errorObj = { message: errorMessage, status: response.status };
                setApiError(errorObj);
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: "An error occurred. Please check the details." } : m));
                throw new Error(errorMessage);
            }

            if (!response.body) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let finalMessages;

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
                            
                            // 1. Handle Text Content
                            if (data.delta_content) {
                                setMessages(prev => {
                                    const updated = prev.map(m => m.id === botMessageId ? { ...m, text: m.text + data.delta_content } : m);
                                    finalMessages = updated; 
                                    return updated;
                                });
                                setLiveReasoning(prev => {
                                    if (!prev.contentHasStarted) {
                                        return { ...prev, contentHasStarted: true };
                                    }
                                    return prev;
                                });
                            }

                            // 2. Handle Generated Images
                            if (data.images && Array.isArray(data.images)) {
                                const newImages = data.images.map(img => ({
                                    src: img.image_url.url, // Extract the base64 URL
                                    id: `gen-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    name: 'Generated Image'
                                }));

                                setMessages(prev => {
                                    const updated = prev.map(m => {
                                        if (m.id === botMessageId) {
                                            const currentImages = m.images || [];
                                            return { ...m, images: [...currentImages, ...newImages] };
                                        }
                                        return m;
                                    });
                                    finalMessages = updated;
                                    return updated;
                                });
                            }

                            // 3. Handle Reasoning
                            if (data.reasoning_content) {
                                liveReasoningTextRef.current += data.reasoning_content;
                                setLiveReasoning(prev => ({ ...prev, text: liveReasoningTextRef.current }));
                            }

                            // 4. Handle Cost
                            if (data.cost !== undefined) setLastCost(data.cost);

                        } catch (e) { console.error("Stream parse error:", part, e); }
                    }
                }
            }

            if (liveReasoningTextRef.current) {
                setMessages(prev => prev.map(m =>
                    m.id === botMessageId
                        ? { ...m, reasoning: liveReasoningTextRef.current }
                        : m
                ));
            }
            
            const targetSessionId = sessionId || currentSessionId;
            if (targetSessionId && finalMessages) {
                updateCurrentSession(finalMessages, targetSessionId);
            }

        } catch (error) {
            if (error?.name === 'AbortError') {
                console.info("Chat streaming was stopped by the user.");
            } else {
                console.error("Chatbot API error:", error);
                setApiError(prev => prev || { message: error.message || "Network error or API unreachable." });
            }
        } finally {
            if (streamAbortControllerRef.current === abortController) {
                streamAbortControllerRef.current = null;
            }
            setIsLoading(false);
            setLiveReasoning({ text: '', botId: null, contentHasStarted: false });
        }
    };
    
    const stopStreaming = useCallback(() => {
        if (streamAbortControllerRef.current) {
            streamAbortControllerRef.current.abort();
            setMessages(prev => {
                let finalMessagesOnStop = prev;
                if (currentSessionId) {
                    updateCurrentSession(finalMessagesOnStop);
                }
                return finalMessagesOnStop;
            });
        }
    }, [setMessages, updateCurrentSession, currentSessionId]);

    return { 
        isLoading, 
        lastCost, 
        liveReasoning, 
        streamResponse, 
        stopStreaming, 
        apiError, 
        clearApiError: () => setApiError(null) 
    };
};