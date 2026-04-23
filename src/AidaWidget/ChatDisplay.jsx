import React, { memo, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HiSpeakerWave, HiPlay, HiPause, HiPaperClip, HiChevronDown, HiChevronUp, HiClipboard, HiCheck, HiPencilSquare, HiInformationCircle, HiTrash } from 'react-icons/hi2';
import ReasoningDisplay from './ReasoningDisplay';
import ShikiHighlighter, { isInlineCode } from 'react-shiki';
import LinkPopover from './LinkPopover';

const MemoizedMarkdown = memo(({ content, components }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
    >
        {content.replace(/<br\s*\/?>(?=\s*)/gi, '  \n')}
    </ReactMarkdown>
));


// --- 1. SIMPLIFIED HOOK: Handles the typing logic ---
const useSmoothTyping = (targetText, isActive) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        if (!isActive) {
            setDisplayedText(targetText);
            return;
        }

        let animationFrameId;

        const animate = () => {
            setDisplayedText((prev) => {
                if (prev.length >= targetText.length) return prev;
                const distance = targetText.length - prev.length;
                const speed = Math.max(1, Math.floor(distance / 10));
                return targetText.slice(0, prev.length + speed);
            });
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [targetText, isActive]);

    return displayedText;
};

// --- 2. Helper Component ---
const SmoothMessage = ({ text, isStreaming, components }) => {
    const typedText = useSmoothTyping(text, isStreaming);

    return (
        <div className={isStreaming ? "streaming-active" : ""}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {String(typedText).replace(/<br\s*\/?>(?=\s*)/gi, '  \n')}
            </ReactMarkdown>
        </div>
    );
};

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
        } catch (_) { }
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
                    showLanguage={false}
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

// ─────────────────────────────────────────────────────────────────────────────
// Response metadata info popover
// ─────────────────────────────────────────────────────────────────────────────
const formatCost = (cost) => {
    if (!cost || cost <= 0) return null;
    if (cost < 0.001) return `$${cost.toFixed(6)}`;
    if (cost < 0.01) return `$${cost.toFixed(5)}`;
    return `$${cost.toFixed(4)}`;
};

const MessageInfoPopover = ({ meta, theme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const isDark = theme === 'dark';

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e) => {
            if (!containerRef.current?.contains(e.target)) setIsOpen(false);
        };
        const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        window.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            window.removeEventListener('keydown', handleKey);
        };
    }, [isOpen]);

    if (!meta) return null;

    const rawModel = meta.model || '';
    const modelDisplay = rawModel.replace(':online', '').split('/').pop() || null;
    const isWebSearch = meta.webSearchEnabled || rawModel.includes(':online');

    const tu = meta.tokenUsage;
    const hasTokens = tu && ((tu.total_tokens ?? 0) > 0 || (tu.input_tokens ?? 0) > 0);
    const reasoningTokens = tu?.output_token_details?.reasoning ?? 0;
    const costDisplay = formatCost(meta.cost);

    const hasAnything = modelDisplay || hasTokens || costDisplay || isWebSearch;
    if (!hasAnything) return null;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(p => !p)}
                className={`transition-colors p-1 ${isWebSearch
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                title={isWebSearch ? 'Response info (web search used)' : 'Response info'}
                aria-label="View response metadata"
                aria-expanded={isOpen}
            >
                <HiInformationCircle className="w-4 h-4" />
            </button>

            {isOpen && (
                <div
                    className={`absolute z-50 bottom-full mb-2 left-0 min-w-[210px] rounded-xl shadow-2xl border p-3 text-xs ${isDark
                        ? 'bg-gray-800 border-gray-700 text-gray-200'
                        : 'bg-white border-gray-200 text-gray-700'
                        }`}
                    role="tooltip"
                    aria-label="Response metadata"
                >
                    <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Response Info
                    </p>

                    {modelDisplay && (
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                            <span className="opacity-60 shrink-0">Model</span>
                            <span
                                className="font-mono font-medium truncate text-right max-w-[130px]"
                                title={rawModel.replace(':online', '')}
                            >
                                {modelDisplay}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                        <span className="opacity-60">Web Search</span>
                        <span className={`font-medium ${isWebSearch
                            ? 'text-blue-400'
                            : (isDark ? 'text-gray-500' : 'text-gray-400')
                            }`}>
                            {isWebSearch ? '● On' : '○ Off'}
                        </span>
                    </div>

                    {hasTokens && (
                        <>
                            <div className={`my-2.5 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />

                            {tu.input_tokens !== undefined && (
                                <div className="flex items-center justify-between gap-3 mb-1.5">
                                    <span className="opacity-60">Input</span>
                                    <span className="font-mono">
                                        {tu.input_tokens.toLocaleString()}
                                        <span className="opacity-40"> tok</span>
                                    </span>
                                </div>
                            )}

                            {tu.output_tokens !== undefined && (
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <span className="opacity-60">Output</span>
                                    <span className="font-mono">
                                        {tu.output_tokens.toLocaleString()}
                                        <span className="opacity-40"> tok</span>
                                    </span>
                                </div>
                            )}

                            {reasoningTokens > 0 && (
                                <div className="flex items-center justify-between gap-3 mb-1.5 pl-3">
                                    <span className="opacity-50 text-[10px]">↳ Reasoning</span>
                                    <span className="font-mono text-purple-400">
                                        {reasoningTokens.toLocaleString()}
                                        <span className="opacity-40"> tok</span>
                                    </span>
                                </div>
                            )}

                            {tu.total_tokens !== undefined && (
                                <div className={`flex items-center justify-between gap-3 font-semibold pt-1.5 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <span className="opacity-80">Total</span>
                                    <span className="font-mono">
                                        {tu.total_tokens.toLocaleString()}
                                        <span className="opacity-40 font-normal"> tok</span>
                                    </span>
                                </div>
                            )}
                        </>
                    )}

                    {costDisplay && (
                        <>
                            <div className={`my-2.5 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
                            <div className="flex items-center justify-between gap-3">
                                <span className="opacity-60">Cost</span>
                                <span className="font-mono text-green-400">{costDisplay}</span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────


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
    contextLimit = 10,
    onScrapeUrl,
    onEmbedUrl,
    onDeleteMessage,
}) => {
    const [copiedId, setCopiedId] = useState(null);
    const containerRef = useRef(null);
    const messageBodyRefs = useRef(new Map());
    const editInputRef = useRef(null);

    // ── Two-click delete confirmation ─────────────────────────────────────────
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    // Auto-reset pending state after 3 seconds of inactivity
    useEffect(() => {
        if (!pendingDeleteId) return;
        const t = setTimeout(() => setPendingDeleteId(null), 3000);
        return () => clearTimeout(t);
    }, [pendingDeleteId]);

    // Reset pending delete when the user clicks anywhere outside the message list
    useEffect(() => {
        if (!pendingDeleteId) return;
        const handlePointerDown = (e) => {
            if (!containerRef.current?.contains(e.target)) {
                setPendingDeleteId(null);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [pendingDeleteId]);
    // ─────────────────────────────────────────────────────────────────────────

    const [speakingMessageId, setSpeakingMessageId] = useState(null);
    const [speechStatus, setSpeechStatus] = useState('idle');
    const utteranceRef = useRef(null);

    const [finalReasoningDurations, setFinalReasoningDurations] = useState({});
    const [liveReasoningInfo, setLiveReasoningInfo] = useState({ botId: null, startTime: null });

    const speechApiSupported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);

    const markdownComponents = useMemo(() => ({
        code: CodeBlock,
        a({ href, children }) {
            if (!href) return <span>{children}</span>;
            return (
                <LinkPopover
                    url={href}
                    onScrape={onScrapeUrl}
                    onEmbed={onEmbedUrl}
                    theme={theme}
                >
                    {children}
                </LinkPopover>
            );
        },
    }), [theme, onScrapeUrl, onEmbedUrl]);

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
    const activeStartIndex = Math.max(0, messages.length - contextLimit);

    return (
        <div ref={containerRef} className="relative flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: 'var(--aida-body-bg)', color: 'var(--aida-body-text)' }}>
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

                const isMessageActive = index >= activeStartIndex;
                const opacityClass = isMessageActive ? 'opacity-100' : 'opacity-40 grayscale transition-all duration-500';

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

                // ── Delete button state for this message ───────────────────
                const isPendingDelete = pendingDeleteId === message.id;

                return (
                    <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end pl-10' : 'justify-start'} ${opacityClass}`}>
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
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    onCancelEdit();
                                                } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                    e.preventDefault();
                                                    onSaveEdit();
                                                }
                                            }}
                                            className={`w-full p-2 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 edit-textarea ${isDark ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-300'
                                                }`}
                                            rows={1}
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button
                                                onClick={onCancelEdit}
                                                className={`px-3 py-1 text-xs rounded-md border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-600'
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
                                        isBotLoading ? (
                                            <SmoothMessage
                                                text={messageText}
                                                isStreaming={true}
                                                components={markdownComponents}
                                            />
                                        ) : (
                                            <MemoizedMarkdown 
                                                content={String(messageText)} 
                                                components={markdownComponents} 
                                            />
                                        )
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
                                        className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${isDark
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
                                    {/* Copy */}
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(messageText, message.id)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                        aria-label="Copy message"
                                        title="Copy message"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                            <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                                        </svg>
                                    </button>

                                    {/* Speech */}
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

                                    {/* Retry / Regenerate (user messages) */}
                                    {message.sender === 'user' && onRegenerateResponse && (
                                        <button
                                            type="button"
                                            onClick={() => onRegenerateResponse(message.id)}
                                            disabled={isLoading}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Regenerate response"
                                            title="Regenerate response"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 1.01-.3 1.95-.82 2.73l1.46 1.46C18.54 15.77 19 14.44 19 13c0-3.87-3.13-7-7-7zm-6.64.64L3.9 8.1C3.27 9.36 3 10.66 3 12c0 3.87 3.13 7 7 7v3l4-4-4-4v3c-2.76 0-5-2.24-5-5 0-1.01.3-1.95.82-2.73L5.36 6.64z" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Retry (bot messages) */}
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
                                                <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 1.01-.3 1.95-.82 2.73l1.46 1.46C18.54 15.77 19 14.44 19 13c0-3.87-3.13-7-7-7zm-6.64.64L3.9 8.1C3.27 9.36 3 10.66 3 12c0 3.87 3.13 7 7 7v3l4-4-4-4v3c-2.76 0-5-2.24-5-5 0-1.01.3-1.95.82-2.73L5.36 6.64z" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Edit */}
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

                                    {/* ── Delete: two-click confirmation ───────────────── */}
                                    {onDeleteMessage && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isPendingDelete) {
                                                    // Second click → actually delete
                                                    onDeleteMessage(message.id);
                                                    setPendingDeleteId(null);
                                                } else {
                                                    // First click → arm the button
                                                    setPendingDeleteId(message.id);
                                                }
                                            }}
                                            disabled={isLoading}
                                            className={`transition-all p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed ${isPendingDelete
                                                ? 'text-red-500 bg-red-500/15 ring-1 ring-red-500/40 scale-110'
                                                : 'text-gray-400 hover:text-red-400'
                                                }`}
                                            aria-label={isPendingDelete ? 'Click again to confirm delete' : 'Delete message'}
                                            title={isPendingDelete ? 'Click again to confirm delete' : 'Delete message'}
                                        >
                                            <HiTrash className="w-4 h-4" />
                                        </button>
                                    )}
                                    {/* ─────────────────────────────────────────────────── */}

                                    {/* Response metadata info (bot messages only) */}
                                    {message.sender === 'bot' && message.meta && (
                                        <MessageInfoPopover meta={message.meta} theme={theme} />
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