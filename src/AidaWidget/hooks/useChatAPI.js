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
    // ✨ MODIFIED: Added `contentHasStarted` to the state shape.
    const [liveReasoning, setLiveReasoning] = useState({ text: '', botId: null, contentHasStarted: false });
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
            messageHistory.push({
                type: m.sender === 'user' ? 'human' : 'ai',
                // ✅ FIX: Use formatMessageContent for historical messages.
                // This ensures that text/URL attachment content from previous user
                // messages is included in the context for subsequent API calls.
                content: formatMessageContent(m)
            });
        });

        return messageHistory;
    }, [customPrompt, pageContext, formatMessageContent]);

    const streamResponse = async ({ userMessage, botMessageId, historyForPayload }) => {
        setIsLoading(true);
        setLastCost(0);
        // ✨ MODIFIED: Reset the full liveReasoning state object.
        setLiveReasoning({ text: '', botId: botMessageId, contentHasStarted: false });
        liveReasoningTextRef.current = '';

        const abortController = new AbortController();
        streamAbortControllerRef.current = abortController;

        const currentUserInput = formatMessageContent(userMessage);
        const detectedLang = franc(currentUserInput);
        const detectedLanguageCode = supportedLanguages.includes(langMap[detectedLang]) ? langMap[detectedLang] : "en";
        const imageAttachments = (userMessage.attachments || []).filter(att => att.type === 'image');
        const imageUrls = imageAttachments.map(img => img.src).filter(Boolean);

        try {
            const payload = {
                user_input: currentUserInput,
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

            if (!response.ok || !response.body) {
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
                            if (data.delta_content) {
                                setMessages(prev => {
                                    const updated = prev.map(m => m.id === botMessageId ? { ...m, text: m.text + data.delta_content } : m);
                                    finalMessages = updated; 
                                    return updated;
                                });
                                // ✅ NEW: Signal that the main content stream has started.
                                setLiveReasoning(prev => {
                                    if (!prev.contentHasStarted) {
                                        return { ...prev, contentHasStarted: true };
                                    }
                                    return prev; // No state change needed if already started.
                                });
                            }
                            if (data.reasoning_content) {
                                liveReasoningTextRef.current += data.reasoning_content;
                                // ✨ MODIFIED: Update only the text, preserving other flags.
                                setLiveReasoning(prev => ({ ...prev, text: liveReasoningTextRef.current }));
                            }
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
            
            if (currentSessionId && finalMessages) {
                updateCurrentSession(finalMessages);
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
            // ✨ MODIFIED: Reset the full reasoning state.
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

    return { isLoading, lastCost, liveReasoning, streamResponse, stopStreaming };
};