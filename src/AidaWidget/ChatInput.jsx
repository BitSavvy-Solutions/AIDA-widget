/* src/AidaWidget/ChatInput.jsx */
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
    HiPaperAirplane, HiOutlineMicrophone, HiStop, HiArrowPath, HiXMark, 
    HiChevronDown, HiOutlineGlobeAlt, HiLightBulb, HiPhoto, HiChatBubbleLeftRight,
    HiArrowTopRightOnSquare, HiPaperClip, HiEye, HiMagnifyingGlass
} from 'react-icons/hi2';
import AttachmentButton from './AttachmentButton';
import ContextSelector from './ContextSelector';

const extractUrls = (text) => {
    if (!text) return [];
    const matches = text.match(/https?:\/\/[^\s<>"{}|\\^\[\]`]+/g) || [];
    return [...new Set(matches)];
};

const getHostname = (url) => {
    try {
        return new URL(url).hostname;
    } catch {
        return url.length > 32 ? `${url.slice(0, 29)}...` : url;
    }
};

const ChatInput = ({
    currentMessage,
    setCurrentMessage,
    handleSendMessage,
    handleKeyDown,
    handleRecordButtonClick,
    inputRef,
    isLoading,
    isTranscribing,
    isRecording,
    elapsedTime,
    siteLanguage,
    theme = 'dark',
    autoSendCountdown,
    cancelAutoSendTimer,
    setIsSendTimerPaused,
    autoRecordCountdown,
    cancelAutoRecordTimer,
    setIsRecordTimerPaused,
    selectedModel,
    setSelectedModel,
    availableModels = [],
    translations,
    attachmentCount = 0,
    onOpenAttachments,
    isWebSearchEnabled,
    setIsWebSearchEnabled,
    onStopStreaming,
    onCancelTranscription,
    features,
    transcriptionError,
    onRetryTranscription,
    onClearFailedTranscription,
    isNearingTimeLimit,
    onAddImages,
    contextLimit,
    setContextLimit,
    onScrapeUrl,
    onEmbedUrl,
}) => {
    const [isHoveringSend, setIsHoveringSend] = useState(false);
    const [isHoveringRecord, setIsHoveringRecord] = useState(false);
    const [isHoveringCancel, setIsHoveringCancel] = useState(false);

    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [modelSearchQuery, setModelSearchQuery] = useState('');
    const [focusedModelIndex, setFocusedModelIndex] = useState(-1);

    const modelMenuRef   = useRef(null);
    const modelSearchRef = useRef(null);
    const modelItemRefs  = useRef([]);

    const isDark     = theme === 'dark';
    const isPillMode = autoRecordCountdown !== null || transcriptionError || isRecording || isTranscribing;

    const filteredModels = useMemo(() => {
        const seen = new Set();
        const unique = availableModels.filter((m) => {
            if (seen.has(m.value)) return false;
            seen.add(m.value);
            return true;
        });
    
        const q = modelSearchQuery.trim().toLowerCase();
        if (!q) return unique;
    
        const words = q.split(/\s+/).filter(Boolean);
    
        return unique.filter((m) => {
            const searchable = `${m.label} ${m.category || ''}`.toLowerCase();
            return words.every((word) => searchable.includes(word));
        });
    }, [availableModels, modelSearchQuery]);

    const openModelMenu = useCallback(() => {
        modelItemRefs.current = [];
        setModelSearchQuery('');
        setFocusedModelIndex(-1);
        setIsModelMenuOpen(true);
    }, []);

    const closeModelMenu = useCallback(() => {
        setIsModelMenuOpen(false);
        setModelSearchQuery('');
        setFocusedModelIndex(-1);
        
        setTimeout(() => {
            inputRef.current?.focus();
        }, 10);
    }, [inputRef]);

    const selectModel = useCallback(
        (value) => {
            setSelectedModel(value);
            closeModelMenu();
        },
        [setSelectedModel, closeModelMenu]
    );

    const modelSelectionEnabled = Boolean(features?.modelSelection);

    useEffect(() => {
        if (!modelSelectionEnabled) return;

        const onKeyDown = (e) => {
            if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const isInputFocused = document.activeElement === inputRef.current;
                const isSearchFocused = document.activeElement === modelSearchRef.current;

                if (isInputFocused || isSearchFocused || isModelMenuOpen) {
                    e.preventDefault();
                    if (isModelMenuOpen) {
                        closeModelMenu();
                    } else {
                        openModelMenu();
                    }
                }
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [modelSelectionEnabled, isModelMenuOpen, openModelMenu, closeModelMenu, inputRef]);

    useEffect(() => {
        if (!isModelMenuOpen) return;
        const onPointerDown = (e) => {
            if (!modelMenuRef.current?.contains(e.target)) closeModelMenu();
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [isModelMenuOpen, closeModelMenu]);

    useEffect(() => {
        if (!isModelMenuOpen) return;
        const t = setTimeout(() => modelSearchRef.current?.focus(), 40);
        return () => clearTimeout(t);
    }, [isModelMenuOpen]);

    useEffect(() => {
        setFocusedModelIndex(-1);
    }, [modelSearchQuery]);

    useEffect(() => {
        const el = modelItemRefs.current[focusedModelIndex];
        if (el) el.scrollIntoView({ block: 'nearest' });
    }, [focusedModelIndex]);

    const handleModelSearchKeyDown = useCallback(
        (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedModelIndex((prev) =>
                        prev < filteredModels.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedModelIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredModels.length - 1
                    );
                    break;
                case 'Enter': {
                    e.preventDefault();
                    const target =
                        focusedModelIndex >= 0
                            ? filteredModels[focusedModelIndex]
                            : filteredModels.length === 1
                            ? filteredModels[0]
                            : null;
                    if (target) selectModel(target.value);
                    break;
                }
                case 'Escape':
                    e.preventDefault();
                    closeModelMenu();
                    break;
                default:
                    break;
            }
        },
        [filteredModels, focusedModelIndex, selectModel, closeModelMenu]
    );

    const detectedUrls = useMemo(() => {
        if (!onScrapeUrl || !currentMessage?.trim()) return [];
        return extractUrls(currentMessage).slice(0, 5);
    }, [currentMessage, onScrapeUrl]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const getModelVisuals = (category) => {
        switch (category) {
            case 'reasoning':
                return {
                    icon: HiLightBulb,
                    colorClass: 'text-purple-500',
                    bgClass: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
                    borderClass: 'border-purple-500/30',
                };
            case 'vision':
                return {
                    icon: HiPhoto,
                    colorClass: 'text-pink-500',
                    bgClass: isDark ? 'bg-pink-500/10' : 'bg-pink-50',
                    borderClass: 'border-pink-500/30',
                };
            case 'chat':
            default:
                return {
                    icon: HiChatBubbleLeftRight,
                    colorClass: 'text-blue-500',
                    bgClass: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
                    borderClass: 'border-blue-500/30',
                };
        }
    };

    const currentModelObj   = availableModels.find((m) => m.value === selectedModel);
    const selectedModelLabel = currentModelObj?.label || selectedModel;
    const currentVisuals     = getModelVisuals(currentModelObj?.category || 'chat');
    const CurrentIcon        = currentVisuals.icon;

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) imageFiles.push(file);
            }
        }
        if (imageFiles.length > 0 && features.imageUpload && onAddImages) {
            e.preventDefault();
            onAddImages(imageFiles);
        }
    };

    const renderSendButton = () => {
        const visibilityClass = isPillMode ? 'invisible pointer-events-none opacity-0' : '';

        if (isLoading) {
            return (
                <button
                    type="button"
                    onClick={onStopStreaming}
                    className={`ml-2 p-2 rounded-full bg-[#2f3645] hover:bg-[#3a4254] ${visibilityClass}`}
                    aria-label="Stop response generation"
                >
                    <HiStop className="w-5 h-5 text-[#ff6bbd]" />
                </button>
            );
        }

        if (autoSendCountdown !== null) {
            return (
                <button
                    onClick={cancelAutoSendTimer}
                    onMouseEnter={() => { setIsHoveringSend(true); setIsSendTimerPaused(true); }}
                    onMouseLeave={() => { setIsHoveringSend(false); setIsSendTimerPaused(false); }}
                    className={`ml-2 flex items-center justify-center timer-button !w-9 !h-9 ${visibilityClass}`}
                    style={{ animationPlayState: isHoveringSend ? 'paused' : 'running' }}
                    aria-label="Cancel auto-send"
                >
                    {isHoveringSend ? (
                        <HiXMark className="h-5 w-5 text-white" />
                    ) : (
                        <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-base`}>
                            {autoSendCountdown}
                        </span>
                    )}
                </button>
            );
        }

        const isDisabled = isRecording || (!currentMessage.trim() && attachmentCount === 0);

        return (
            <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isDisabled}
                className={`ml-2 p-2 rounded-full transition-opacity disabled:opacity-50 ${
                    isDark
                        ? isDisabled ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'
                        : isDisabled ? 'bg-gray-300' : 'bg-gray-900 hover:bg-gray-700'
                } ${visibilityClass}`}
                aria-label="Send Message"
            >
                <HiPaperAirplane
                    className={`w-5 h-5 ${
                        isDisabled
                            ? isDark ? 'text-gray-300' : 'text-gray-500'
                            : 'text-white'
                    }`}
                />
            </button>
        );
    };

    const renderRecordButton = () => {
        const pillBaseClass = 'absolute right-0 z-20 flex items-center whitespace-nowrap';
        let pillContent = null;

        if (autoRecordCountdown !== null) {
            pillContent = (
                <button
                    onClick={cancelAutoRecordTimer}
                    onMouseEnter={() => { setIsHoveringRecord(true); setIsRecordTimerPaused(true); }}
                    onMouseLeave={() => { setIsHoveringRecord(false); setIsRecordTimerPaused(false); }}
                    className={`${pillBaseClass} justify-center record-timer-button !w-9 !h-9`}
                    style={{ animationPlayState: isHoveringRecord ? 'paused' : 'running' }}
                    aria-label="Cancel auto-record"
                >
                    {isHoveringRecord ? (
                        <HiXMark className="h-5 w-5 text-white" />
                    ) : (
                        <span className="text-white font-bold text-base">{autoRecordCountdown}</span>
                    )}
                </button>
            );
        } else if (transcriptionError) {
            pillContent = (
                <div
                    className={`${pillBaseClass} gap-1 rounded-full px-1 h-9 w-auto shadow-md transition-all duration-200 ${
                        isDark ? 'bg-red-800' : 'bg-red-100 border border-red-200'
                    }`}
                    title={`Error: ${transcriptionError}`}
                >
                    <button
                        onClick={onRetryTranscription}
                        className={`p-1.5 rounded-full transition-colors !w-auto !h-auto ${
                            isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-gray-100'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                        aria-label="Retry transcription"
                        title="Retry"
                    >
                        <HiArrowPath className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onClearFailedTranscription}
                        className={`p-1.5 rounded-full transition-colors !w-auto !h-auto ${
                            isDark ? 'text-red-300 hover:bg-red-500/30' : 'text-red-500 hover:bg-red-500/10'
                        }`}
                        aria-label="Cancel failed transcription"
                        title="Cancel"
                    >
                        <HiXMark className="h-4 w-4" />
                    </button>
                </div>
            );
        } else if (isRecording || isTranscribing) {
            const isCancelHover = isTranscribing && isHoveringCancel;
            const pillBgColor = isRecording
                ? `bg-red-600 hover:bg-red-700 ${isNearingTimeLimit ? 'animate-pulse' : ''}`
                : isCancelHover
                ? 'bg-red-600 hover:bg-red-700'
                : isDark
                ? 'bg-gray-700'
                : 'bg-gray-900';

            pillContent = (
                <button
                    onClick={isRecording ? handleRecordButtonClick : onCancelTranscription}
                    onMouseEnter={isTranscribing ? () => setIsHoveringCancel(true) : undefined}
                    onMouseLeave={isTranscribing ? () => setIsHoveringCancel(false) : undefined}
                    className={`${pillBaseClass} gap-2 !rounded-full !px-3 !py-2 !w-auto !h-auto text-white shadow-md transition-all duration-200 ${pillBgColor} ${isTranscribing ? 'cursor-pointer' : ''}`}
                    aria-label={
                        isRecording
                            ? 'Stop Recording'
                            : isCancelHover
                            ? 'Cancel transcription'
                            : 'Transcribing...'
                    }
                >
                    {isRecording ? (
                        <>
                            <HiStop className="h-5 w-5 flex-shrink-0" />
                            <span className="font-mono text-sm font-medium tracking-wider">
                                {formatTime(elapsedTime)}
                            </span>
                        </>
                    ) : (
                        <>
                            <HiArrowPath className="h-5 w-5 flex-shrink-0 animate-spin" />
                            {isCancelHover ? (
                                <span className="font-sans text-sm font-medium">Cancel</span>
                            ) : (
                                <span className="font-mono text-sm font-medium tracking-wider">
                                    {formatTime(elapsedTime)}
                                </span>
                            )}
                        </>
                    )}
                </button>
            );
        }

        const micVisibilityClass = isPillMode ? 'invisible pointer-events-none opacity-0' : '';
        const marginClass        = isPillMode ? '!ml-4' : 'ml-2';

        return (
            <>
                {pillContent}
                <button
                    onClick={handleRecordButtonClick}
                    disabled={autoSendCountdown !== null}
                    className={`${marginClass} p-2 rounded-full text-white transition-all duration-200 disabled:opacity-50 ${
                        isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-900 hover:bg-gray-700'
                    } ${micVisibilityClass}`}
                    aria-label="Start Recording"
                >
                    <HiOutlineMicrophone className="w-5 h-5" />
                </button>
            </>
        );
    };

    return (
        <div
            className="relative p-2 rounded-none transition-colors border-t"
            style={{ backgroundColor: 'var(--aida-body-bg)', borderColor: 'var(--aida-card-border)', color: 'var(--aida-body-text)' }}
        >
            <div
                className={`flex items-end rounded-lg px-3 py-1 mb-2 transition-colors ${
                    isDark ? 'border border-gray-700 bg-gray-800' : 'border border-gray-300 bg-gray-50'
                }`}
            >
                <textarea
                    ref={inputRef}
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={translations.inputPlaceholder || 'Type your message...'}
                    dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'}
                    rows={1}
                    className={`aida-input-textarea flex-1 bg-transparent px-0 py-1 resize-none focus:outline-none custom-scrollbar overflow-y-auto whitespace-pre-wrap leading-tight ${
                        isDark ? 'text-gray-100 placeholder-gray-400' : ''
                    } min-h-[32px] max-h-[200px]`}
                    style={{ overflowY: 'auto', overflowX: 'hidden' }}
                />
            </div>

            {detectedUrls.length > 0 && (
                <div
                    className={`flex items-center gap-1.5 px-1 pb-2 flex-wrap border-b mb-2 ${
                        isDark ? 'border-gray-700/50' : 'border-gray-200'
                    }`}
                >
                    <span
                        className={`text-[10px] font-medium flex-shrink-0 ${
                            isDark ? 'text-gray-500' : 'text-gray-400'
                        }`}
                    >
                        Links detected:
                    </span>
                    {detectedUrls.map((url) => (
                        <div
                            key={url}
                            className={`flex items-center gap-0 rounded-full border text-[10px] overflow-hidden flex-shrink-0 max-w-[220px] ${
                                isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300'
                            }`}
                            title={url}
                        >
                            <span
                                className={`px-2 py-1 truncate max-w-[110px] ${
                                    isDark ? 'text-gray-300' : 'text-gray-600'
                                }`}
                            >
                                {getHostname(url)}
                            </span>

                            {onEmbedUrl && (
                                <button
                                    type="button"
                                    onClick={() => onEmbedUrl(url)}
                                    className={`px-1.5 py-1 border-l flex-shrink-0 transition-colors ${
                                        isDark
                                            ? 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-100'
                                            : 'border-gray-300 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                                    }`}
                                    title="Open here"
                                    aria-label={`Open ${url} here`}
                                >
                                    <HiEye className="w-3 h-3" />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                className={`px-1.5 py-1 border-l flex-shrink-0 transition-colors ${
                                    isDark
                                        ? 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-100'
                                        : 'border-gray-300 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                                }`}
                                title="Open in new tab"
                                aria-label={`Open ${url} in new tab`}
                            >
                                <HiArrowTopRightOnSquare className="w-3 h-3" />
                            </button>

                            <button
                                type="button"
                                onClick={() => onScrapeUrl(url)}
                                className={`px-1.5 py-1 border-l flex-shrink-0 transition-colors ${
                                    isDark
                                        ? 'border-gray-600 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300'
                                        : 'border-gray-300 text-blue-500 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                                title="Fetch & attach content"
                                aria-label={`Fetch content from ${url}`}
                            >
                                <HiPaperClip className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="relative flex items-center min-w-0 flex-1 mr-2 gap-2">

                    {features.webSearch && (
                        <button
                            type="button"
                            onClick={() => setIsWebSearchEnabled((p) => !p)}
                            className={`p-2 rounded-full disabled:opacity-50 transition-colors flex-shrink-0 ${
                                isWebSearchEnabled
                                    ? isDark
                                        ? 'bg-blue-500/30 text-blue-300'
                                        : 'bg-blue-100 text-blue-600'
                                    : isDark
                                    ? 'text-gray-300 hover:bg-gray-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            aria-pressed={isWebSearchEnabled}
                            aria-label="Toggle web search"
                            title="Toggle web search"
                        >
                            <HiOutlineGlobeAlt className="h-6 w-6" />
                        </button>
                    )}

                    {features.modelSelection && (
                        <div className="relative min-w-0" ref={modelMenuRef}>
                            <button
                                type="button"
                                onClick={() => (isModelMenuOpen ? closeModelMenu() : openModelMenu())}
                                className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm disabled:opacity-50 transition-colors max-w-full border ${
                                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                } ${currentVisuals.colorClass} ${currentVisuals.borderClass} ${currentVisuals.bgClass}`}
                                aria-haspopup="listbox"
                                aria-expanded={isModelMenuOpen}
                                aria-label={`Select AI model. Current: ${selectedModelLabel}. Press Tab to open.`}
                                title={`${selectedModelLabel} (Tab)`}
                            >
                                <CurrentIcon className="h-4 w-4 flex-shrink-0" />
                                <span className={`truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                    {selectedModelLabel}
                                </span>
                                <HiChevronDown
                                    className={`h-3 w-3 flex-shrink-0 opacity-70 transition-transform duration-200 ${
                                        isModelMenuOpen ? 'rotate-180' : ''
                                    } ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                />
                            </button>

                            {isModelMenuOpen && (
                                <div
                                    className={`absolute z-50 left-0 bottom-full mb-2 w-64 rounded-xl shadow-2xl overflow-hidden border flex flex-col ${
                                        isDark
                                            ? 'bg-gray-800 border-gray-700 text-gray-100'
                                            : 'bg-white border-gray-200 text-gray-900'
                                    }`}
                                    role="listbox"
                                    aria-label="Choose AI model"
                                >
                                    <div
                                        className={`flex items-center gap-2 px-3 py-2 border-b ${
                                            isDark
                                                ? 'border-gray-700/80 bg-gray-900/40'
                                                : 'border-gray-100 bg-gray-50'
                                        }`}
                                    >
                                        <HiMagnifyingGlass
                                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                                                isDark ? 'text-gray-500' : 'text-gray-400'
                                            }`}
                                        />
                                        <input
                                            ref={modelSearchRef}
                                            type="text"
                                            value={modelSearchQuery}
                                            onChange={(e) => setModelSearchQuery(e.target.value)}
                                            onKeyDown={handleModelSearchKeyDown}
                                            placeholder="Search models..."
                                            autoComplete="off"
                                            className={`flex-1 bg-transparent text-xs outline-none placeholder-gray-500 ${
                                                isDark ? 'text-gray-200' : 'text-gray-800'
                                            }`}
                                            aria-label="Search AI models"
                                        />
                                        {modelSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModelSearchQuery('');
                                                    modelSearchRef.current?.focus();
                                                }}
                                                className={`flex-shrink-0 p-0.5 rounded transition-colors ${
                                                    isDark
                                                        ? 'text-gray-500 hover:text-gray-300'
                                                        : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                                aria-label="Clear search"
                                            >
                                                <HiXMark className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="overflow-y-auto custom-scrollbar p-1 max-h-60">
                                        {filteredModels.length === 0 ? (
                                            <p
                                                className={`px-3 py-5 text-xs text-center ${
                                                    isDark ? 'text-gray-500' : 'text-gray-400'
                                                }`}
                                            >
                                                No models match your search
                                            </p>
                                        ) : (
                                            filteredModels.map((opt, idx) => {
                                                const visuals   = getModelVisuals(opt.category || 'chat');
                                                const Icon      = visuals.icon;
                                                const isSelected = selectedModel === opt.value;
                                                const isFocused  = focusedModelIndex === idx;

                                                let rowClass =
                                                    'w-full text-left px-3 py-2.5 text-sm rounded-lg flex items-center gap-3 transition-colors outline-none ';

                                                if (isFocused) {
                                                    rowClass += isDark
                                                        ? 'bg-white/10 ring-1 ring-inset ring-brand-coral/50 '
                                                        : 'bg-blue-50 ring-1 ring-inset ring-blue-300 ';
                                                } else if (isSelected) {
                                                    rowClass += isDark ? 'bg-gray-700 ' : 'bg-gray-100 ';
                                                } else {
                                                    rowClass += isDark
                                                        ? 'hover:bg-gray-700/50 '
                                                        : 'hover:bg-gray-50 ';
                                                }

                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        ref={(el) => { modelItemRefs.current[idx] = el; }}
                                                        role="option"
                                                        aria-selected={isSelected}
                                                        onClick={() => selectModel(opt.value)}
                                                        className={rowClass}
                                                    >
                                                        <div
                                                            className={`p-1.5 rounded-md flex-shrink-0 ${visuals.bgClass} ${visuals.colorClass}`}
                                                        >
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span
                                                                className={`font-medium truncate ${
                                                                    isSelected
                                                                        ? isDark ? 'text-white' : 'text-gray-900'
                                                                        : isDark ? 'text-gray-300' : 'text-gray-700'
                                                                }`}
                                                            >
                                                                {opt.label}
                                                            </span>
                                                            <span className="text-[10px] opacity-50 uppercase tracking-wider font-semibold">
                                                                {opt.category || 'Chat'}
                                                            </span>
                                                        </div>
                                                        {isSelected && (
                                                            <span
                                                                className="w-1.5 h-1.5 rounded-full bg-brand-coral flex-shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div
                                        className={`px-3 py-1.5 border-t flex items-center justify-between gap-2 shrink-0 ${
                                            isDark
                                                ? 'border-gray-700/80 bg-gray-900/30'
                                                : 'border-gray-100 bg-gray-50'
                                        }`}
                                    >
                                        <span
                                            className={`text-[10px] font-mono font-bold ${
                                                isDark ? 'text-gray-500' : 'text-gray-500'
                                            }`}
                                        >
                                            Tab
                                        </span>
                                        <span
                                            className={`text-[10px] ${
                                                isDark ? 'text-gray-600' : 'text-gray-400'
                                            }`}
                                        >
                                            arrows to navigate, Enter to pick
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <ContextSelector
                        value={contextLimit}
                        onChange={setContextLimit}
                        theme={theme}
                    />
                </div>

                <div className="flex items-center chat-action-buttons relative flex-shrink-0">
                    {features.imageUpload && (
                        <AttachmentButton
                            count={attachmentCount}
                            onClick={onOpenAttachments}
                            theme={theme}
                        />
                    )}
                    {features.voiceInput && renderRecordButton()}
                    {renderSendButton()}
                </div>
            </div>
        </div>
    );
};

export default ChatInput;