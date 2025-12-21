import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HiSpeakerWave, HiPlay, HiPause, HiPaperClip, HiChevronDown, HiChevronUp } from 'react-icons/hi2';
import ReasoningDisplay from './ReasoningDisplay';

import ShikiHighlighter, { isInlineCode } from 'react-shiki';

// ✅ ADDED: Whitelist of languages Shiki is guaranteed to support.
const SUPPORTED_LANGUAGES = new Set([
    'javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx',
    'json', 'jsonc', 'html', 'css', 'scss', 'less',
    'python', 'py', 'bash', 'sh', 'shell', 'zsh',
    'markdown', 'md', 'yaml', 'yml', 'xml', 'svg',
    'sql', 'java', 'c', 'cpp', 'c++', 'c#', 'cs', 'csharp',
    'go', 'rust', 'php', 'ruby', 'rb', 'lua',
    'docker', 'dockerfile', 'makefile', 'ini', 'toml',
    'diff', 'text', 'txt'
]);

const CodeBlock = ({ className, children, node, ...props }) => {
    const isInline = node ? isInlineCode(node) : !String(children).includes('\n');

    if (isInline) {
        return <code className={className} {...props}>{children}</code>;
    }

    const [copied, setCopied] = useState(false);
    const code = String(children).replace(/\n$/, '');
    
    // ✅ NEW: Logic for collapsing long code blocks
    const lineCount = code.split('\n').length;
    const COLLAPSE_THRESHOLD = 15;
    const isLongCode = lineCount > COLLAPSE_THRESHOLD;
    const [isCollapsed, setIsCollapsed] = useState(isLongCode); // Initialize based on current length

    // ✅ MODIFIED: Use useEffect to automatically collapse if it becomes long
    useEffect(() => {
        if (isLongCode) {
            setIsCollapsed(true);
        } else {
            setIsCollapsed(false); // Ensure it's not collapsed if it's short
        }
    }, [isLongCode]); // Re-evaluate when the code content (and thus lineCount) changes

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch (_) {
            // ignore
        }
    };
    
    const getLangFromClassName = (cn) => {
        if (!cn || !cn.startsWith('language-')) {
            return 'text';
        }
        const specifier = cn.substring('language-'.length);
        const parts = specifier.split('.');
        const lang = parts[parts.length - 1];
        return lang ? lang.toLowerCase() : 'text';
    };

    const rawLang = getLangFromClassName(className);

    const languageMap = {
      js: 'jsx',
      javascript: 'jsx',
      ts: 'tsx',
      typescript: 'tsx',
    };

    let language = languageMap[rawLang] || rawLang;

    if (!SUPPORTED_LANGUAGES.has(language)) {
        if (code.trim().startsWith('{') || code.trim().startsWith('[')) {
            language = 'json';
        } else {
            language = 'text';
        }
    }

    return (
        <div className="relative group my-3 rounded-lg border border-white/10 bg-[#1e1e1e] overflow-hidden">
            {/* Copy Button - Positioned absolutely */}
            <button
                type="button"
                onClick={onCopy}
                aria-label="Copy code"
                title={copied ? 'Copied' : 'Copy code'}
                className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 rounded-md bg-gray-800/80 text-gray-200 px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700 border border-white/10"
            >
                {copied ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-400">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-green-400">Copied</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        <span>Copy</span>
                    </>
                )}
            </button>

            {/* Code Content Container */}
            <div className={`relative transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-[320px] overflow-hidden' : ''}`}>
                <ShikiHighlighter
                    language={language}
                    theme="github-dark"
                    addDefaultStyles={false}
                    {...props}
                >
                    {code}
                </ShikiHighlighter>

                {/* Gradient Overlay for collapsed state */}
                {isCollapsed && (
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none z-10" />
                )}
            </div>

            {/* Expand/Collapse Footer */}
            {isLongCode && (
                <button
                    type="button"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors border-t border-white/5 bg-[#1e1e1e] relative z-20"
                >
                    {isCollapsed ? (
                        <>
                            <HiChevronDown className="w-4 h-4" />
                            <span>Show {lineCount - COLLAPSE_THRESHOLD} more lines</span>
                        </>
                    ) : (
                        <>
                            <HiChevronUp className="w-4 h-4" />
                            <span>Collapse code</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

const cleanTextForSpeech = (text) => {
    if (!text) return '';
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
    liveReasoning,
    onViewAttachments,
}) => {
    const [copiedId, setCopiedId] = useState(null);
    const containerRef = useRef(null);
    const messageBodyRefs = useRef(new Map());

    const [speakingMessageId, setSpeakingMessageId] = useState(null);
    const [speechStatus, setSpeechStatus] = useState('idle');
    const utteranceRef = useRef(null);

    const [finalReasoningDurations, setFinalReasoningDurations] = useState({});
    const [liveReasoningInfo, setLiveReasoningInfo] = useState({ botId: null, startTime: null });

    const speechApiSupported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);

    useEffect(() => {
        const isTimerTicking = isLoading &&
                              liveReasoning?.botId &&
                              liveReasoning.text.trim().length > 0 &&
                              !liveReasoning.contentHasStarted;

        const currentLiveBotId = liveReasoning?.botId;

        if (isTimerTicking) {
            if (currentLiveBotId && currentLiveBotId !== liveReasoningInfo.botId) {
                setLiveReasoningInfo({ botId: currentLiveBotId, startTime: Date.now() });
            }
        } else {
            if (liveReasoningInfo.startTime) {
                const finalDuration = (Date.now() - liveReasoningInfo.startTime) / 1000;
                setFinalReasoningDurations(prev => ({
                    ...prev,
                    [liveReasoningInfo.botId]: finalDuration,
                }));
                setLiveReasoningInfo({ botId: null, startTime: null });
            }
        }
    }, [isLoading, liveReasoning, liveReasoningInfo.botId, liveReasoningInfo.startTime]);
    
    useEffect(() => {
        return () => {
            if (speechApiSupported) {
                window.speechSynthesis.cancel();
            }
        };
    }, [speechApiSupported]);

    const handleToggleSpeech = useCallback((message) => {
        if (!speechApiSupported) return;

        const isCurrentMessage = message.id === speakingMessageId;

        if (isCurrentMessage) {
            if (speechStatus === 'speaking') {
                window.speechSynthesis.pause();
            } else if (speechStatus === 'paused') {
                window.speechSynthesis.resume();
            }
            return;
        }

        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        const messageNode = messageBodyRefs.current.get(message.id);
        const rawText = messageNode?.innerText || message.text;
        const textToSpeak = cleanTextForSpeech(rawText);

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
        utterance.onend = () => {
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

    useEffect(() => {
        if (!shouldAutoScroll) return;
        const el = containerRef.current;
        if (!el) return;
        if (programmaticScrollRef) programmaticScrollRef.current = true;
        el.scrollTop = el.scrollHeight;
        if (onScrollStateChange) onScrollStateChange(true);
        requestAnimationFrame(() => {
            if (programmaticScrollRef) programmaticScrollRef.current = false;
        });
    }, [messages, shouldAutoScroll, programmaticScrollRef]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !onUserScrollAway) return;
        let prevDistance = 0;
        const threshold = 24;
        const onScroll = () => {
            if (programmaticScrollRef && programmaticScrollRef.current) return;
            const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
            if (distance - prevDistance > threshold) onUserScrollAway();
            prevDistance = distance;
        };
        prevDistance = el.scrollHeight - el.scrollTop - el.clientHeight;
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [onUserScrollAway, programmaticScrollRef]);

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

    const isDark = theme === 'dark';

    return (
        <div ref={containerRef} className={`relative flex-1 overflow-y-auto p-4 space-y-4 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
            {messages.map((message, index) => {
                const messageText = typeof message.text === 'string' ? message.text : '';
                const trimmedText = messageText.trim();
                const hasImages = Array.isArray(message.images) && message.images.length > 0;
                const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;
                const isBot = message.sender === 'bot';

                const isLastMessage = index === messages.length - 1;
                const isBotLoading = isBot && isLastMessage && isLoading;
                
                const hasBakedInReasoning = message.reasoning && message.reasoning.trim().length > 0;
                
                const isLiveReasoningActive = isBotLoading && liveReasoning?.botId === message.id && liveReasoning.text.trim().length > 0;
                const isTimerDisplayLive = isLiveReasoningActive && !liveReasoning.contentHasStarted;

                const showReasoning = hasBakedInReasoning || isLiveReasoningActive;
                const reasoningTextToShow = hasBakedInReasoning ? message.reasoning : (liveReasoning?.text || '');
                
                const showThinkingDots = isBotLoading && !showReasoning && trimmedText === '' && !hasImages;
                const hideBotMessage = isBot && !isBotLoading && trimmedText === '' && !hasImages && !hasBakedInReasoning;
                
                let canRetry = false;
                if (isBot && onRetryBotMessage) {
                    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
                        const candidate = messages[cursor];
                        if (candidate.sender !== 'user') continue;
                        if ((candidate.text || '').trim() === '' && (!candidate.attachments || candidate.attachments.length === 0)) continue;
                        canRetry = true;
                        break;
                    }
                }

                if (hideBotMessage) return null;

                return (
                    <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end pl-10' : 'justify-start'}`}>
                        <div className={`flex flex-col w-full ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            {showReasoning && (
                                <ReasoningDisplay
                                    text={reasoningTextToShow}
                                    theme={theme}
                                    isLive={isTimerDisplayLive}
                                    startTime={isTimerDisplayLive ? liveReasoningInfo.startTime : null}
                                    finalDuration={finalReasoningDurations[message.id] ?? null}
                                />
                            )}
                            <div
                                ref={(el) => {
                                    if (el) messageBodyRefs.current.set(message.id, el);
                                    else messageBodyRefs.current.delete(message.id);
                                }}
                                className={`${message.sender === 'user' ? 'user-message rounded-l-xl' : 'bot-message'}`}
                                dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'}
                            >
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
                           
                            {message.sender === 'user' && hasAttachments && onViewAttachments && (
                                <div className="mt-2">
                                    <button
                                        type="button"
                                        onClick={() => onViewAttachments(message)}
                                        className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                                            isDark 
                                                ? 'bg-gray-800/80 border-gray-700/70 text-gray-300 hover:bg-gray-700/80 hover:border-gray-600'
                                                : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 hover:border-gray-300'
                                        }`}
                                        title="View attachments"
                                    >
                                        <HiPaperClip className="w-4 h-4" />
                                        <span>{message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}</span>
                                    </button>
                                </div>
                            )}

                            {!isBotLoading && (
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
                                            onClick={() => onStartEdit && onStartEdit(message.id)}
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