/* src/AidaWidget/hooks/useChatAPI.js */
import { useState, useCallback, useRef } from 'react';
import { franc } from 'franc-min';

// Helper to extract a clean, human-readable error message from various error formats
const extractCleanErrorMessage = (rawError) => {
    if (!rawError) return 'An unknown error occurred.';

    // If it's already an object, try to extract the message
    if (typeof rawError === 'object') {
        if (rawError.message) return rawError.message;
        if (rawError.error?.message) return rawError.error.message;
        try { return JSON.stringify(rawError); } catch { return 'An unknown error occurred.'; }
    }

    // Try to extract message from Python-style dict: 'message': "..."
    const msgMatch = rawError.match(/'message':\s*"((?:[^"\\]|\\.)*)"/);
    if (msgMatch) return msgMatch[1].replace(/\\"/g, '"');

    // Try: 'message': '...'
    const msgMatch2 = rawError.match(/'message':\s*'([^']+)'/);
    if (msgMatch2) return msgMatch2[1];

    // Try standard JSON: "message": "..."
    const msgMatch3 = rawError.match(/"message":\s*"((?:[^"\\]|\\.)*)"/);
    if (msgMatch3) return msgMatch3[1].replace(/\\"/g, '"');

    return rawError;
};

// --- Ollama helpers ---------------------------------------------------------
const THINK_OPEN = '';
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

// Ollama expects raw base64, not data URLs
const stripDataUrlPrefix = (dataUrl) => {
    const str = String(dataUrl || '');
    const idx = str.indexOf(',');
    return idx >= 0 ? str.slice(idx + 1) : str;
};

// Detects a trailing partial tag so it never flashes in the UI
const longestPartialTagSuffix = (str) => {
    for (const tag of [THINK_OPEN, THINK_CLOSE]) {
        const max = Math.min(tag.length - 1, str.length);
        for (let len = max; len > 0; len--) {
            if (str.endsWith(tag.slice(0, len))) return len;
        }
    }
    return 0;
};

// Splits accumulated model output into reasoning (think blocks) and visible content.
// Re-parsing the full string on every chunk keeps the result idempotent.
const parseThinkContent = (raw) => {
    let reasoning = '';
    let content = '';
    let rest = raw;
    let guard = 0;
    while (rest && guard++ < 200) {
        const start = rest.indexOf(THINK_OPEN);
        if (start === -1) { content += rest; break; }
        content += rest.slice(0, start);
        const end = rest.indexOf(THINK_CLOSE, start + THINK_OPEN.length);
        if (end === -1) {
            reasoning += rest.slice(start + THINK_OPEN.length);
            break;
        }
        reasoning += rest.slice(start + THINK_OPEN.length, end);
        rest = rest.slice(end + THINK_CLOSE.length);
    }
    const holdback = longestPartialTagSuffix(content);
    if (holdback > 0) content = content.slice(0, -holdback);
    return { reasoning: reasoning.trim(), content };
};

// --- Chrome Built-in AI (Prompt API) helpers --------------------------------
// Converts a data URL (how image attachments are stored) into a Blob, which is
// one of the accepted image value types for the Prompt API.
const dataUrlToBlob = async (dataUrl) => {
    const res = await fetch(dataUrl);
    return await res.blob();
};
// ----------------------------------------------------------------------------

export const useChatAPI = ({
    apiConfig,
    messages,
    setMessages,
    currentSessionId,
    updateCurrentSession,
    user,
    pageContext,
    customPrompt,
    ollama = null,
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

    // Builds the message array Ollama expects: system + user/assistant pairs.
    const buildOllamaMessages = useCallback((history = []) => {
        const result = [];
        const systemParts = [];
        if (pageContext && Object.keys(pageContext).length > 0) {
            systemParts.push(`<PageContext>\n${JSON.stringify(pageContext, null, 2)}\n</PageContext>`);
        }
        if ((customPrompt || '').trim()) {
            systemParts.push(customPrompt.trim());
        }
        if (systemParts.length > 0) {
            result.push({ role: 'system', content: systemParts.join('\n\n') });
        }

        (history || []).forEach(m => {
            const content = formatMessageContent(m);
            if (m.sender === 'user') {
                const msg = { role: 'user', content };
                const images = (m.images || []).map(img => stripDataUrlPrefix(img.src)).filter(Boolean);
                if (images.length > 0) msg.images = images;
                result.push(msg);
            } else if ((content || '').trim()) {
                result.push({ role: 'assistant', content });
            }
        });
        return result;
    }, [pageContext, customPrompt, formatMessageContent]);

    // Builds Prompt API content for a message: a plain string for text-only
    // messages, or a multimodal content array when a user message has images.
    // Assistant messages stay text-only (the API rejects non-text assistant content).
    const buildChromeContent = useCallback(async (m) => {
        const text = formatMessageContent(m);
        const images = m.sender === 'user' ? (m.images || []).filter(img => img?.src) : [];
        if (images.length === 0) return text;

        const parts = [];
        if (text.trim()) parts.push({ type: 'text', value: text });
        for (const img of images) {
            try {
                parts.push({ type: 'image', value: await dataUrlToBlob(img.src) });
            } catch (e) {
                console.warn('Skipping unreadable image for Chrome AI:', e);
            }
        }
        return parts.length > 0 ? parts : text;
    }, [formatMessageContent]);

    // Streams a chat completion from an Ollama server (NDJSON over /api/chat).
    const streamOllamaResponse = async ({ userMessage, botMessageId, historyForPayload, sessionId, contextLimit = 10 }) => {
        setIsLoading(true);
        setLastCost(0);
        setLiveReasoning({ text: '', botId: botMessageId, contentHasStarted: false });
        setApiError(null);
        liveReasoningTextRef.current = '';

        const modelName = userMessage.model.replace(/^ollama:/, '');
        const ollamaBase = (ollama?.baseUrl || DEFAULT_OLLAMA_URL).replace(/\/+$/, '');

        const abortController = new AbortController();
        streamAbortControllerRef.current = abortController;

        let limitedHistory = historyForPayload;
        if (typeof contextLimit === 'number' && contextLimit > 0) {
            limitedHistory = historyForPayload.slice(-contextLimit);
        }

        let localTokenUsage = null;
        let accumulated = '';
        let finalMessages = null;
        let streamError = false;

        try {
            const response = await fetch(`${ollamaBase}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    messages: buildOllamaMessages(limitedHistory),
                    stream: true,
                }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                let errorMessage = `Ollama request failed (HTTP ${response.status})`;
                try {
                    const errData = await response.json();
                    if (errData?.error) errorMessage = errData.error;
                } catch { /* ignore */ }
                if (response.status === 404) {
                    errorMessage = `Model "${modelName}" was not found on this Ollama server. Pull it or refresh the model list.`;
                }
                const errorObj = { message: errorMessage, status: response.status };
                setApiError(errorObj);
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: '', error: errorMessage } : m));
                throw new Error(errorMessage);
            }

            if (!response.body) {
                throw new Error('Ollama returned an empty response body.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const data = JSON.parse(trimmed);

                        if (data.error) {
                            const msg = typeof data.error === 'string' ? data.error : 'Ollama stream error';
                            setApiError({ message: msg });
                            ollama?.reportRuntimeError?.(msg);
                            setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, error: msg } : m));
                            streamError = true;
                            break;
                        }

                        const contentChunk = data?.message?.content || '';
                        const thinkingChunk = data?.message?.thinking || '';

                        if (thinkingChunk) {
                            liveReasoningTextRef.current += thinkingChunk;
                        }

                        if (contentChunk) {
                            accumulated += contentChunk;
                        }

                        if (contentChunk || thinkingChunk) {
                            const { reasoning: embeddedReasoning, content } = parseThinkContent(accumulated);
                            const combinedReasoning = (
                                liveReasoningTextRef.current +
                                (embeddedReasoning ? '\n\n' + embeddedReasoning : '')
                            ).trim();

                            setLiveReasoning(prev => ({
                                text: combinedReasoning,
                                botId: botMessageId,
                                contentHasStarted: prev.contentHasStarted || content.length > 0,
                            }));
                            setMessages(prev => {
                                const updated = prev.map(m =>
                                    m.id === botMessageId ? { ...m, text: content } : m
                                );
                                finalMessages = updated;
                                return updated;
                            });
                        }

                        if (data.done) {
                            const input = data.prompt_eval_count ?? 0;
                            const output = data.eval_count ?? 0;
                            if (input || output) {
                                localTokenUsage = {
                                    input_tokens: input,
                                    output_tokens: output,
                                    total_tokens: input + output,
                                };
                            }
                        }
                    } catch (e) {
                        console.error('Ollama stream parse error:', trimmed, e);
                    }
                }
                if (streamError) break;
            }

            const finalMeta = {
                model: userMessage.model,
                webSearchEnabled: false,
                tokenUsage: localTokenUsage,
                cost: null,
            };

            setMessages(prev => {
                const updated = prev.map(m => {
                    if (m.id !== botMessageId) return m;
                    return {
                        ...m,
                        ...(liveReasoningTextRef.current ? { reasoning: liveReasoningTextRef.current } : {}),
                        meta: finalMeta,
                    };
                });
                finalMessages = updated;
                return updated;
            });

            const targetSessionId = sessionId || currentSessionId;
            if (targetSessionId && finalMessages) {
                updateCurrentSession(finalMessages, targetSessionId);
            }
        } catch (error) {
            if (error?.name === 'AbortError') {
                console.info('Ollama streaming was stopped by the user.');
            } else {
                console.error('Ollama API error:', error);
                const friendly = /failed to fetch|networkerror/i.test(error?.message || '')
                    ? `Cannot reach Ollama at ${ollamaBase}. Make sure it is running and allows this origin.`
                    : (error.message || 'Ollama request failed.');
                setApiError(prev => prev || { message: friendly });
                if (!streamError) ollama?.reportRuntimeError?.(friendly);
            }
        } finally {
            if (streamAbortControllerRef.current === abortController) {
                streamAbortControllerRef.current = null;
            }
            setIsLoading(false);
            setLiveReasoning({ text: '', botId: null, contentHasStarted: false });
        }
    };

    // Streams a completion from Chrome's built-in Browser Local AI (Prompt API).
    // Multimodal: text input always, image input when the on-device model
    // reports it as available and the conversation actually carries images.
    const streamChromeResponse = async ({ userMessage, botMessageId, historyForPayload, sessionId, contextLimit = 10 }) => {
        setIsLoading(true);
        setLastCost(0);
        setLiveReasoning({ text: '', botId: botMessageId, contentHasStarted: false });
        setApiError(null);
        liveReasoningTextRef.current = '';

        const abortController = new AbortController();
        streamAbortControllerRef.current = abortController;

        let finalMessages = null;
        let lmSession = null;

        try {
            if (!('LanguageModel' in window)) {
                throw new Error('Chromium Local AI is not available in this browser.');
            }

            let limitedHistory = historyForPayload;
            if (typeof contextLimit === 'number' && contextLimit > 0) {
                limitedHistory = historyForPayload.slice(-contextLimit);
            }

            // Declare image input only when a message in scope actually has images
            const hasImages = limitedHistory.some(m => (m.images || []).length > 0);
            const expectedInputs = [{ type: 'text', languages: ['en'] }];
            if (hasImages) expectedInputs.push({ type: 'image' });

            const availability = hasImages
                ? await LanguageModel.availability({ expectedInputs })
                : await LanguageModel.availability();

            if (availability !== 'available' && availability !== 'readily') {
                throw new Error(hasImages
                    ? `Browser Local AI with image input is not ready (status: ${availability}). This browser build may not support multimodal prompts, or the model needs to be enabled from Local Models, Chromium tab.`
                    : `Browser Local AI is not ready (status: ${availability}). Enable it from Local Models, Chromium tab.`);
            }

            const systemParts = [];
            if (pageContext && Object.keys(pageContext).length > 0) {
                systemParts.push(`<PageContext>\n${JSON.stringify(pageContext, null, 2)}\n</PageContext>`);
            }
            if ((customPrompt || '').trim()) {
                systemParts.push(customPrompt.trim());
            }

            const initialPrompts = [];
            if (systemParts.length > 0) {
                initialPrompts.push({ role: 'system', content: systemParts.join('\n\n') });
            }
            // Everything except the latest user message becomes session context
            for (const m of limitedHistory.slice(0, -1)) {
                const content = await buildChromeContent(m);
                const isEmpty = typeof content === 'string' ? !content.trim() : content.length === 0;
                if (isEmpty) continue;
                initialPrompts.push({ role: m.sender === 'user' ? 'user' : 'assistant', content });
            }

            lmSession = await LanguageModel.create({
                initialPrompts,
                expectedInputs,
                expectedOutputs: [{ type: 'text', languages: ['en'] }],
                signal: abortController.signal,
            });

            const currentUserContent = await buildChromeContent(userMessage);
            // A bare array is parsed as LanguageModelMessage[], so multimodal
            // parts must be wrapped in a message object with role + content.
            const promptInput = Array.isArray(currentUserContent)
                ? [{ role: 'user', content: currentUserContent }]
                : currentUserContent;
            const stream = await lmSession.promptStreaming(promptInput, { signal: abortController.signal });
            
            let fullText = '';
            for await (const chunk of stream) {
                const piece = String(chunk ?? '');
                // Some Chrome builds stream deltas, others cumulative snapshots
                fullText = piece.startsWith(fullText) ? piece : fullText + piece;

                setMessages(prev => {
                    const updated = prev.map(m => m.id === botMessageId ? { ...m, text: fullText } : m);
                    finalMessages = updated;
                    return updated;
                });
                setLiveReasoning(prev => prev.contentHasStarted ? prev : { ...prev, contentHasStarted: true });
            }

            const tokenUsage =
                (typeof lmSession.inputUsage === 'number' && lmSession.inputUsage > 0)
                    ? { input_tokens: lmSession.inputUsage, total_tokens: lmSession.inputUsage }
                    : null;

            const finalMeta = {
                model: userMessage.model,
                webSearchEnabled: false,
                tokenUsage,
                cost: null,
            };

            setMessages(prev => {
                const updated = prev.map(m => m.id === botMessageId ? { ...m, meta: finalMeta } : m);
                finalMessages = updated;
                return updated;
            });

            const targetSessionId = sessionId || currentSessionId;
            if (targetSessionId && finalMessages) {
                updateCurrentSession(finalMessages, targetSessionId);
            }
        } catch (error) {
            if (error?.name === 'AbortError') {
                console.info('Chrome AI streaming was stopped by the user.');
            } else {
                console.error('Chrome AI error:', error);
                const message = error?.message || 'Browser Local AI request failed.';
                setApiError(prev => prev || { message });
                setMessages(prev => prev.map(m =>
                    m.id === botMessageId && !m.text ? { ...m, error: message } : m
                ));
            }
        } finally {
            try { lmSession?.destroy?.(); } catch { /* ignore */ }
            if (streamAbortControllerRef.current === abortController) {
                streamAbortControllerRef.current = null;
            }
            setIsLoading(false);
            setLiveReasoning({ text: '', botId: null, contentHasStarted: false });
        }
    };

    const streamResponse = async ({ userMessage, botMessageId, historyForPayload, sessionId, contextLimit = 10 }) => {
        // Local Ollama models use a completely different API shape
        if (userMessage?.model?.startsWith('ollama:')) {
            return streamOllamaResponse({ userMessage, botMessageId, historyForPayload, sessionId, contextLimit });
        }

        // Chrome built-in Browser Local AI uses the LanguageModel API
        if (userMessage?.model?.startsWith('chrome:')) {
            return streamChromeResponse({ userMessage, botMessageId, historyForPayload, sessionId, contextLimit });
        }

        setIsLoading(true);
        setLastCost(0);
        setLiveReasoning({ text: '', botId: botMessageId, contentHasStarted: false });
        setApiError(null);
        liveReasoningTextRef.current = '';

        let localCost = 0;
        let localTokenUsage = null;
        let streamError = false;

        const abortController = new AbortController();
        streamAbortControllerRef.current = abortController;

        const currentUserInput = formatMessageContent(userMessage);
        const detectedLang = franc(currentUserInput);
        const detectedLanguageCode = supportedLanguages.includes(langMap[detectedLang]) ? langMap[detectedLang] : "en";
        const imageAttachments = (userMessage.attachments || []).filter(att => att.type === 'image');
        const imageUrls = imageAttachments.map(img => img.src).filter(Boolean);

        let limitedHistory = historyForPayload;
        if (typeof contextLimit === 'number' && contextLimit > 0) {
            limitedHistory = historyForPayload.slice(-contextLimit);
        }

        const apiToken = user?.apiToken || localStorage.getItem('aidaToken') || null;

        const requestHeaders = { 'Content-Type': 'application/json' };
        if (apiToken) {
            requestHeaders['Authorization'] = `Bearer ${apiToken}`;
        }

        try {
            const payload = {
                message_history: buildMessageHistoryPayload(limitedHistory),
                email: user.email,
                page_path: window.location.pathname,
                language: detectedLanguageCode,
                model: userMessage.model,
            };

            if (!apiToken) {
                payload.user_id = user.id;
            }

            if (imageUrls.length > 0) {
                payload.image_data_urls = imageUrls;
            }

            const response = await fetch(apiConfig.chatUrl, {
                method: 'POST',
                headers: requestHeaders,
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
                            errorMessage = nestedBody.error || nestedBody.message || nestedBody.detail || errorMessage;
                        } catch (e) {
                            errorMessage = errorData._HttpResponse__body;
                        }
                    } else {
                        errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
                    }
                } catch (e) {
                    console.warn("Could not parse error response JSON", e);
                }

                const errorObj = { message: errorMessage, status: response.status };
                setApiError(errorObj);
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: "An error occurred. Please check the details.", error: errorMessage } : m));
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

                            // Handle stream errors sent by the backend
                            if (data.error) {
                                const cleanMessage = extractCleanErrorMessage(data.error);
                                setApiError({ message: cleanMessage, status: null });
                                setMessages(prev => prev.map(m =>
                                    m.id === botMessageId
                                        ? { ...m, text: m.text || '', error: cleanMessage }
                                        : m
                                ));
                                streamError = true;
                                break; // Break the for loop
                            }

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

                            if (data.images && Array.isArray(data.images)) {
                                const newImages = data.images.map(img => ({
                                    src: img.image_url.url,
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

                            if (data.reasoning_content) {
                                liveReasoningTextRef.current += data.reasoning_content;
                                setLiveReasoning(prev => ({ ...prev, text: liveReasoningTextRef.current }));
                            }

                            if (data.cost !== undefined) {
                                localCost = data.cost;
                                setLastCost(data.cost);
                            }
                            if (data.token_usage) {
                                localTokenUsage = data.token_usage;
                            }

                        } catch (e) { console.error("Stream parse error:", part, e); }
                    }
                }
                if (streamError) break; // Break the while loop
            }

            const finalMeta = {
                model: userMessage.model,
                webSearchEnabled: userMessage.webSearchEnabled || false,
                tokenUsage: localTokenUsage,
                cost: localCost > 0 ? localCost : null,
            };

            setMessages(prev => {
                const updated = prev.map(m => {
                    if (m.id !== botMessageId) return m;
                    return {
                        ...m,
                        ...(liveReasoningTextRef.current ? { reasoning: liveReasoningTextRef.current } : {}),
                        meta: finalMeta,
                    };
                });
                finalMessages = updated;
                return updated;
            });

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