import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { HiSpeakerWave, HiPlay, HiPause } from 'react-icons/hi2';

const CodeBlock = ({ inline, className, children, ...props }) => {
    // If react-markdown says it's inline, great! But if it's being dramatic,
    // we'll add a check: if there are no newlines, it's definitely inline. Period. 💅
    if (inline || !String(children).includes('\n')) {
        return <code className={className} {...props}>{children}</code>;
    }

    // The rest of this is for your actual, multi-line, block-level code parties.
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch (_) {
            // ignore
        }
    };

    return (
        <div className="relative group">
            <button
                type="button"
                onClick={onCopy}
                aria-label="Copy code"
                title={copied ? 'Copied' : 'Copy code'}
                className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-gray-800/80 text-gray-200 px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                {copied ? 'Copied' : 'Copy'}
            </button>
            <SyntaxHighlighter
                style={oneDark}
                language={match ? match[1] : 'text'}
                PreTag="div"
                {...props}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

// ✅ ADDED: Function to remove emojis and other non-speakable symbols.
const cleanTextForSpeech = (text) => {
    if (!text) return '';
    // This regex covers most emojis, symbols, and pictographs.
    const EMOJI_REGEX = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
    return text.replace(EMOJI_REGEX, '').replace(/\s+/g, ' ').trim();
};


const ChatDisplay = ({
    messages,
    messagesEndRef,
    siteLanguage,
    onStartEdit,
    onScrollStateChange,
    onUserScrollAway,
    programmaticScrollRef,
    shouldAutoScroll = true,
    theme = 'dark',
    onImagePreview,
    onRetryBotMessage,
    isLoading = false,
}) => {
    const [copiedId, setCopiedId] = useState(null);
    const containerRef = useRef(null);
    const messageBodyRefs = useRef(new Map());

    // State and handlers for Text-to-Speech functionality
    const [speakingMessageId, setSpeakingMessageId] = useState(null);
    const [speechStatus, setSpeechStatus] = useState('idle'); // 'idle', 'speaking', 'paused'
    const utteranceRef = useRef(null);

    // Check for browser support just once.
    const speechApiSupported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);

    // Cleanup speech synthesis on component unmount
    useEffect(() => {
        return () => {
            if (speechApiSupported) {
                window.speechSynthesis.cancel();
            }
        };
    }, [speechApiSupported]);

    // The main handler for starting, pausing, and resuming speech
    const handleToggleSpeech = useCallback((message) => {
        if (!speechApiSupported) return;

        const isCurrentMessage = message.id === speakingMessageId;

        // If it's the current message, toggle pause/resume
        if (isCurrentMessage) {
            if (speechStatus === 'speaking') {
                window.speechSynthesis.pause();
            } else if (speechStatus === 'paused') {
                window.speechSynthesis.resume();
            }
            return;
        }

        // If it's a new message, stop any previous speech and start the new one.
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        const messageNode = messageBodyRefs.current.get(message.id);
        const rawText = messageNode?.innerText || message.text;
        // ✅ MODIFIED: Use the cleaning function
        const textToSpeak = cleanTextForSpeech(rawText);

        // Don't try to speak if the message was only emojis/symbols
        if (!textToSpeak) {
            console.warn("No speakable content found in the message.");
            return;
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = siteLanguage;

        utterance.onstart = () => {
            setSpeakingMessageId(message.id);
            setSpeechStatus('speaking');
        };
        utterance.onend = () => { // Fired on completion or cancellation
            setSpeakingMessageId(null);
            setSpeechStatus('idle');
            utteranceRef.current = null;
        };
        utterance.onpause = () => { if (window.speechSynthesis.paused) setSpeechStatus('paused'); };
        utterance.onresume = () => setSpeechStatus('speaking');
        utterance.onerror = (e) => { console.error("Speech synthesis error:", e); setSpeakingMessageId(null); setSpeechStatus('idle'); };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [speechApiSupported, speakingMessageId, speechStatus, siteLanguage]);

    // Observe the anchor at the bottom; when it's visible at all, we are at-bottom
    useEffect(() => {
        const root = containerRef.current;
        const target = messagesEndRef?.current;
        if (!root || !target || !onScrollStateChange) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                onScrollStateChange(Boolean(entry && entry.isIntersecting));
            },
            { root, threshold: 0 }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [messagesEndRef, onScrollStateChange]);

    // Ensure we remain pinned to the bottom while streaming if allowed
    useEffect(() => {
        if (!shouldAutoScroll) return;
        const el = containerRef.current;
        if (!el) return;
        if (programmaticScrollRef) programmaticScrollRef.current = true;
        // Jump to bottom to keep up with streaming content
        el.scrollTop = el.scrollHeight;
        // Inform parent that we're at bottom after programmatic scroll
        if (onScrollStateChange) onScrollStateChange(true);
        // Clear programmatic flag on next frame
        requestAnimationFrame(() => {
            if (programmaticScrollRef) programmaticScrollRef.current = false;
        });
    }, [messages, shouldAutoScroll, programmaticScrollRef]);

    // Detect user scrolling away from bottom to signal parent to pause auto-scroll while streaming
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !onUserScrollAway) return;
        let prevDistance = 0;
        const threshold = 24; // px increase away from bottom counts as intent
        const onScroll = () => {
            if (programmaticScrollRef && programmaticScrollRef.current) return;
            const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
            if (distance - prevDistance > threshold) onUserScrollAway();
            prevDistance = distance;
        };
        // initialize distance
        prevDistance = el.scrollHeight - el.scrollTop - el.clientHeight;
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [onUserScrollAway, programmaticScrollRef]);

    // No manual-scroll override listener in this version

    const handleCopy = async (text, id) => {
        try {
            await navigator.clipboard.writeText(text || '');
            setCopiedId(id);
        } catch (e) {
            // noop
        }
    };

    useEffect(() => {
        if (!copiedId) return;
        const t = setTimeout(() => setCopiedId(null), 1200);
        return () => clearTimeout(t);
    }, [copiedId]);

    return (
        <div ref={containerRef} className={`relative flex-1 overflow-y-auto p-4 space-y-4 ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
            {messages.map((message, index) => {
                const messageText = typeof message.text === 'string' ? message.text : '';
                const trimmedText = messageText.trim();
                const hasImages = Array.isArray(message.images) && message.images.length > 0;
                const isBot = message.sender === 'bot';
                const showThinkingDots = isBot && !hasImages && trimmedText === '' && isLoading;
                const hideBotMessage = isBot && !hasImages && trimmedText === '' && !isLoading;
                let canRetry = false;
                if (isBot && onRetryBotMessage) {
                    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
                        const candidate = messages[cursor];
                        if (candidate.sender !== 'user') continue;
                        if ((candidate.text || '').trim() === '') continue;
                        canRetry = true;
                        break;
                    }
                }

                if (hideBotMessage) return null;

                return (
                    <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end pl-10' : 'justify-start'}`}>
                        <div className={`flex flex-col w-full ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            <div
                                ref={(el) => {
                                    if (el) messageBodyRefs.current.set(message.id, el);
                                    else messageBodyRefs.current.delete(message.id);
                                }}
                                className={`${message.sender === 'user' ? 'user-message rounded-l-xl' : 'bot-message'}`}
                                dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'}
                            >
                                {/* Attached images (if any) */}
                                {hasImages && (
                                    <div className="space-y-2 mb-2">
                                        {message.images.map((img) => (
                                            <button
                                                key={img.id || img.src}
                                                type="button"
                                                onClick={() => onImagePreview && onImagePreview({ ...img, messageId: message.id })}
                                                className="block"
                                                aria-label="Open image"
                                            >
                                                <img
                                                    src={img.src}
                                                    alt={img.name || 'uploaded'}
                                                    className="rounded-lg border border-gray-200 max-w-full max-h-64 object-contain transition-transform hover:scale-[1.02]"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {trimmedText !== '' ? (
                                    // Replace literal <br> tags with Markdown line breaks so they render
                                    // correctly inside tables and paragraphs when parsed by ReactMarkdown.
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code: CodeBlock,
                                            a({ href, children }) {
                                                return (
                                                    <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
                                                        {children}
                                                    </a>
                                                );
                                            }
                                        }}
                                    >
                                        {String(messageText).replace(/<br\s*\/?>(?=\s*)/gi, '  \n')}
                                    </ReactMarkdown>
                                ) : (
                                    showThinkingDots ? (
                                        <div className="thinking-dots" role="status" aria-live="polite" aria-label="Assistant is thinking">
                                            <span className="dot" />
                                            <span className="dot" />
                                            <span className="dot" />
                                        </div>
                                    ) : null
                                )}
                            </div>
                            {!showThinkingDots && (
                                <div className="mt-3 flex items-center gap-2 select-none">
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(messageText, message.id)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                        aria-label="Copy message"
                                        title="Copy message"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                            <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                        </svg>
                                    </button>
                                    {/* Text to Speech Button */}
                                    {isBot && speechApiSupported && trimmedText !== '' && (
                                        <button
                                            type="button"
                                            onClick={() => handleToggleSpeech(message)}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                            aria-label={
                                                speakingMessageId === message.id && speechStatus === 'speaking' ? 'Pause speech'
                                                : speakingMessageId === message.id && speechStatus === 'paused' ? 'Resume speech'
                                                : 'Read message aloud'
                                            }
                                            title={
                                                speakingMessageId === message.id && speechStatus === 'speaking' ? 'Pause speech'
                                                : speakingMessageId === message.id && speechStatus === 'paused' ? 'Resume speech'
                                                : 'Read message aloud'
                                            }
                                        >
                                            {speakingMessageId === message.id && speechStatus !== 'idle' ? (
                                                speechStatus === 'speaking' ? <HiPause className="w-4 h-4" /> : <HiPlay className="w-4 h-4" />
                                            ) : (
                                                <HiSpeakerWave className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                    {message.sender === 'bot' && onRetryBotMessage && canRetry && (
                                        <button
                                            type="button"
                                            onClick={() => onRetryBotMessage(message.id)}
                                            disabled={isLoading}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Retry response"
                                            title="Retry response"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 1.01-.3 1.95-.82 2.73l1.46 1.46C18.54 15.77 19 14.44 19 13c0-3.87-3.13-7-7-7zm-6.64.64L3.9 8.1C3.27 9.36 3 10.66 3 12c0 3.87 3.13 7 7 7v3l4-4-4-4v3c-2.76 0-5-2.24-5-5 0-1.01.3-1.95.82-2.73L5.36 6.64z"/>
                                            </svg>
                                        </button>
                                    )}
                                    {message.sender === 'user' && (
                                        <button
                                            type="button"
                                            onClick={() => onStartEdit && onStartEdit(message.id, message.text)}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                            aria-label="Edit message"
                                            title="Edit message"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-0.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                            </svg>
                                        </button>
                                    )}
                                    {copiedId === message.id && (
                                        <span className="text-xs text-green-600">Copied</span>
                                    )}
                                    {message.sender === 'user' && message.edited && (
                                        <span className="text-xs text-gray-400">Edited</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default ChatDisplay;