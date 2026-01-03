/* src/AidaWidget/ChatDisplay.jsx */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HiSpeakerWave, HiPlay, HiPause, HiPaperClip, HiChevronDown, HiChevronUp, HiClipboard, HiCheck, HiPencilSquare } from 'react-icons/hi2';
import ReasoningDisplay from './ReasoningDisplay';

import ShikiHighlighter, { isInlineCode } from 'react-shiki';

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
    
    const lineCount = code.split('\n').length;
    const COLLAPSE_THRESHOLD = 15;
    const isLongCode = lineCount > COLLAPSE_THRESHOLD;
    const [isCollapsed, setIsCollapsed] = useState(isLongCode);

    useEffect(() => {
        if (isLongCode) {
            setIsCollapsed(true);
        } else {
            setIsCollapsed(false);
        }
    }, [isLongCode]);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch (_) {
            // ignore
        }
    };
    
    const rawFilename = className ? className.replace('language-', '') : '';

    const getLangFromFilename = (filename) => {
        if (!filename) return 'text';
        const parts = filename.split('.');
        const lang = parts.length > 1 ? parts[parts.length - 1] : filename;
        return lang ? lang.toLowerCase() : 'text';
    };

    const rawLang = getLangFromFilename(rawFilename);

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
        <div className="relative group my-4 rounded-lg border border-white/10 bg-[#1e1e1e] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
                <span className="text-xs text-gray-400 font-mono truncate mr-4">
                    {rawFilename || language} 
                </span>
                <button
                    type="button"
                    onClick={onCopy}
                    aria-label="Copy code"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                    {copied ? (
                        <>
                            <HiCheck className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400">Copied</span>
                        </>
                    ) : (
                        <>
                            <HiClipboard className="w-3.5 h-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <div className={`relative transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-[320px] overflow-hidden' : ''}`}>
                <ShikiHighlighter
                    language={language}
                    theme="github-dark"
                    addDefaultStyles={false}
                    showLanguage = {false}
                    {...props}
                >
                    {code}
                </ShikiHighlighter>
                {isCollapsed && (
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none z-10" />
                )}
            </div>
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
    editingMessageId,
    editDraft,
    setEditDraft,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onScrollStateChange,
    onUserScrollAway,
    programmaticScrollRef,
    shouldAutoScroll = true,
    theme = 'dark',
    onImagePreview,
    onRetryBotMessage,
    onRegenerateResponse,
    isLoading = false,
    liveReasoning,
    onViewAttachments,
}) => {
    const [copiedId, setCopiedId] = useState(null);
    const containerRef = useRef(null);
    const messageBodyRefs = useRef(new Map());
    const editInputRef = useRef(null);

    const [speakingMessageId, setSpeakingMessageId] = useState(null);
    const [speechStatus, setSpeechStatus] = useState('idle');
    const utteranceRef = useRef(null);

    const [finalReasoningDurations, setFinalReasoningDurations] = useState({});
    const [liveReasoningInfo, setLiveReasoningInfo] = useState({ botId: null, startTime: null });

    const speechApiSupported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);

    useEffect(() => {
        if (editingMessageId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.style.height = 'auto';
            editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`;
        }
    }, [editingMessageId]);

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
                const isEditing = editingMessageId === message.id;

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
                                className={`${message.sender === 'user' ? 'user-message rounded-l-xl' : 'bot-message'} ${isEditing ? 'w-full' : ''}`}
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
                                
                                {isEditing ? (
                                    <div className="w-full">
                                        <textarea
                                            ref={editInputRef}
                                            value={editDraft}
                                            onChange={(e) => {
                                                setEditDraft(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = `${e.target.scrollHeight}px`;
                                            }}
                                            // ✅ ADDED: Keyboard shortcuts for Save (Ctrl/Cmd+Enter) and Cancel (Esc)
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    onCancelEdit();
                                                } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                    e.preventDefault();
                                                    onSaveEdit();
                                                }
                                            }}
                                            className={`w-full p-2 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 edit-textarea ${
                                                isDark ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'
                                            }`}
                                            rows={1}
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button
                                                onClick={onCancelEdit}
                                                className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                                                    isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={onSaveEdit}
                                                className="px-3 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    trimmedText !== '' ? (
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
                                    )
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

                            {!isBotLoading && !isEditing && (
                                <div className="mt-3 flex items-center gap-2 select-none">
                                    {/* 1. Copy Button */}
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

                                    {/* Speech Button (Optional, kept near copy) */}
                                    {speechApiSupported && trimmedText !== '' && (
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

                                    {/* 2. Retry / Regenerate Button */}
                                    {/* For User: Regenerate Response */}
                                    {message.sender === 'user' && onRegenerateResponse && (
                                        <button
                                            type="button"
                                            onClick={() => onRegenerateResponse(message.id)}
                                            disabled={isLoading}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Regenerate response"
                                            title="Regenerate response"
                                        >
                                            {/* Same SVG as Bot Retry */}
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 1.01-.3 1.95-.82 2.73l1.46 1.46C18.54 15.77 19 14.44 19 13c0-3.87-3.13-7-7-7zm-6.64.64L3.9 8.1C3.27 9.36 3 10.66 3 12c0 3.87 3.13 7 7 7v3l4-4-4-4v3c-2.76 0-5-2.24-5-5 0-1.01.3-1.95.82-2.73L5.36 6.64z"/>
                                            </svg>
                                        </button>
                                    )}

                                    {/* For Bot: Retry Response */}
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

                                    {/* 3. Edit Button */}
                                    {onStartEdit && (
                                        <button
                                            type="button"
                                            onClick={() => onStartEdit(message)}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                            aria-label="Edit message"
                                            title="Edit message"
                                        >
                                            <HiPencilSquare className="w-4 h-4" />
                                        </button>
                                    )}

                                    {copiedId === message.id && (
                                        <span className="text-xs text-green-600">Copied</span>
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