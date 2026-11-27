// src/AidaWidget/ChatInput.jsx
import React, { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import {
    HiPaperAirplane, HiOutlineMicrophone, HiStop, HiArrowPath, HiXMark,
    HiChevronDown, HiOutlineGlobeAlt, HiLightBulb, HiPhoto, HiChatBubbleLeftRight,
    HiMagnifyingGlass, HiOutlineDocument, HiOutlineRectangleStack, HiPlay, HiPause,
    HiArrowDownTray, HiOutlineCpuChip, HiOutlineCog6Tooth, HiChevronUp,
    HiOutlineArrowsUpDown, HiInformationCircle,
} from 'react-icons/hi2';
import AttachmentButton from './AttachmentButton';
import ContextSelector from './ContextSelector';
import ReasoningSelector from './ReasoningSelector';
import ToolbarModal from './ToolbarModal';

const TOOLBAR_GAP = 8;
const MODEL_MAX_CHARS_MEDIUM = 20;
const MODEL_MAX_CHARS_MIN = 10;

// Models render in pages instead of all at once. Mounting 300+ rich rows in
// one go is what made the picker slow to open on low-end devices. The page
// grows as the user scrolls (see handleModelListScroll).
const MODEL_PAGE_SIZE = 40;

// Sort orders for the model list. The header button cycles through these.
const SORT_MODES = [
    { key: 'cost-asc', label: 'Price: low to high', short: 'Price ↑' },
    { key: 'cost-desc', label: 'Price: high to low', short: 'Price ↓' },
    { key: 'alpha-asc', label: 'Name: A to Z', short: 'A to Z' },
    { key: 'alpha-desc', label: 'Name: Z to A', short: 'Z to A' },
];

const formatPrice = (priceValue) => {
    if (priceValue === undefined || priceValue === null) return null;
    const n = parseFloat(priceValue);
    if (Number.isNaN(n) || n === 0) return null;
    if (n < 0.001) {
        const perM = n * 1_000_000;
        return `$${perM.toFixed(2)}/M`;
    }
    return `$${n.toFixed(2)}/M`;
};

const formatContextSize = (contextLength) => {
    const value = Number(contextLength);

    if (!Number.isFinite(value) || value <= 0) {
        return null;
    }

    return new Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);
};

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const AudioCapsule = ({ recording, onDownload, onRetranscribe, onRemove }) => {
    const { url, duration, isTranscribing, error } = recording;
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    const handlePlay = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio(url);
            audioRef.current.onended = () => setIsPlaying(false);
        }
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <span className="audio-capsule">
            <button onClick={handlePlay} className="capsule-btn" title="Play">
                {isPlaying ? <HiPause className="w-3 h-3" /> : <HiPlay className="w-3 h-3" />}
            </button>
            <span className="capsule-duration">{formatTime(duration)}</span>
            <button onClick={onDownload} className="capsule-btn" title="Download">
                <HiArrowDownTray className="w-3 h-3" />
            </button>
            <button onClick={onRetranscribe} disabled={isTranscribing} className="capsule-btn" title="Retranscribe">
                <HiArrowPath className={`w-3 h-3 ${isTranscribing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onRemove} className="capsule-btn" title="Remove">
                <HiXMark className="w-3 h-3" />
            </button>
            {error && <span className="capsule-error">{error}</span>}
        </span>
    );
};

// Memoized: badges only re-render when the modality string actually changes.
const ModularBadges = memo(function ModularBadges({ modality }) {
    if (!modality) return null;
    const parts = modality.split('->');
    if (parts.length !== 2) return <span className="text-xs opacity-60">{modality}</span>;
    const [inputsRaw, outputsRaw] = parts;

    const getIcon = (type) => {
        if (type.includes('text')) return { Icon: HiOutlineDocument, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/25', label: 'Text' };
        if (type.includes('image')) return { Icon: HiPhoto, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25', label: 'Image' };
        if (type.includes('audio')) return { Icon: HiOutlineMicrophone, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/25', label: 'Audio' };
        if (type.includes('video')) return { Icon: HiOutlineRectangleStack, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25', label: 'Video' };
        if (type.includes('file')) return { Icon: HiOutlineDocument, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/25', label: 'File' };
        return { Icon: HiOutlineDocument, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/25', label: type };
    };

    const inputTypes = inputsRaw.split('+').filter(Boolean);
    const outputTypes = outputsRaw.split('+').filter(Boolean);

    const renderBadge = (type) => {
        const { Icon, color, bg, border, label } = getIcon(type);
        return (
            <div key={type} className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${bg} border ${border} ${color}`}>
                <Icon className="w-3 h-3" />
                <span className="text-[10px] font-semibold">{label}</span>
            </div>
        );
    };

    return (
        <div className="flex items-center gap-1 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
                {inputTypes.map(renderBadge)}
            </div>
            <span className="text-[10px] opacity-40 px-0.5">→</span>
            <div className="flex items-center gap-1 flex-wrap">
                {outputTypes.map(renderBadge)}
            </div>
        </div>
    );
});

// Moved to module scope so ModelOption can use it without prop drilling.
const getModelVisuals = (category, isDark) => {
    switch (category) {
        case 'reasoning':
            return { icon: HiLightBulb, colorClass: 'text-purple-500', bgClass: isDark ? 'bg-purple-500/10' : 'bg-purple-50', borderClass: 'border-purple-500/30' };
        case 'vision':
            return { icon: HiPhoto, colorClass: 'text-pink-500', bgClass: isDark ? 'bg-pink-500/10' : 'bg-pink-50', borderClass: 'border-pink-500/30' };
        case 'audio':
            return { icon: HiOutlineMicrophone, colorClass: 'text-green-500', bgClass: isDark ? 'bg-green-500/10' : 'bg-green-50', borderClass: 'border-green-500/30' };
        case 'local':
            return { icon: HiOutlineCpuChip, colorClass: 'text-teal-400', bgClass: isDark ? 'bg-teal-500/10' : 'bg-teal-50', borderClass: 'border-teal-500/30' };
        case 'chat':
        default:
            return { icon: HiChatBubbleLeftRight, colorClass: 'text-blue-500', bgClass: isDark ? 'bg-blue-500/10' : 'bg-blue-50', borderClass: 'border-blue-500/30' };
    }
};

/**
 * One row in the model picker. Memoized so a keystroke in the search box or
 * an arrow-key focus change only re-renders the rows whose props changed
 * (usually two), not the whole list.
 *
 * The row is a div with role="option" rather than a button, because it now
 * contains a nested eye button that opens the model details page. Nested
 * buttons are invalid HTML, so selection is handled via onClick and
 * Enter/Space on the row itself.
 */
const ModelOption = memo(function ModelOption({
    opt,
    type,
    idx,
    isSelected,
    isFocused,
    isDark,
    onSelect,
    onOpenModelPage,
    registerItemRef,
}) {
    const visuals = getModelVisuals(opt.category || 'chat', isDark);
    const Icon = visuals.icon;

    const modelValue = String(opt.value || '');
    const isLocal = modelValue.startsWith('ollama:') || modelValue.startsWith('chrome:');
    // Only hosted text models have a details page on the site.
    // Local models and audio models are skipped.
    const canOpenDetails = Boolean(onOpenModelPage) && type === 'text' && !isLocal;

    let rowClass = 'w-full text-left px-2.5 py-2 text-sm rounded-lg flex items-start gap-2.5 transition-colors outline-none border cursor-pointer ';
    if (isFocused) {
        rowClass += isDark ? 'bg-white/10 ring-1 ring-inset ring-brand-coral/50 border-brand-coral/50 ' : 'bg-blue-50 ring-1 ring-inset ring-blue-300 border-blue-300 ';
    } else if (isSelected) {
        rowClass += isDark ? 'bg-gray-700/50 border-gray-600 ' : 'bg-gray-100 border-gray-200 ';
    } else {
        rowClass += isDark ? 'hover:bg-gray-700/30 border-gray-700/50 hover:border-gray-600 ' : 'hover:bg-gray-50 border-gray-200 ';
    }

    const contextSize = formatContextSize(opt.contextLength ?? opt.context_length);
    const promptPrice = formatPrice(opt.pricing?.prompt);
    const completionPrice = formatPrice(opt.pricing?.completion);

    return (
        <div
            ref={(el) => registerItemRef(idx, el)}
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
            onClick={() => onSelect(opt, type)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(opt, type);
                }
            }}
            className={rowClass}
        >
            <div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${visuals.bgClass} ${visuals.colorClass}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold text-sm truncate ${isSelected
                        ? isDark ? 'text-white' : 'text-gray-900'
                        : isDark ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                        {opt.label}
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                        {canOpenDetails && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenModelPage(modelValue);
                                }}
                                onKeyDown={(e) => e.stopPropagation()}
                                className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
                                    isDark
                                        ? 'border-gray-600 text-gray-300 hover:bg-gray-600/60 hover:text-white'
                                        : 'border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                                }`}
                                aria-label={`Open details page for ${opt.label}`}
                                title={`View ${opt.label} details`}
                            >
                                <HiInformationCircle className="w-4 h-4" />
                            </button>
                        )}
                        {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-coral" aria-hidden="true" />}
                    </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {opt.modality && <ModularBadges modality={opt.modality} />}
                </div>
                {(contextSize || promptPrice || completionPrice) && (
                    <div className={`flex items-center gap-2 flex-wrap text-xs font-mono px-2 py-1 rounded mt-1 ${isDark ? 'bg-gray-900/60 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {contextSize && (
                            <span className="flex items-center gap-1">
                                <span className="opacity-60">Context</span>
                                <span className="text-purple-400 font-semibold">{contextSize}</span>
                            </span>
                        )}
                        {contextSize && (promptPrice || completionPrice) && <span className="opacity-40">·</span>}
                        {promptPrice && (
                            <span className="flex items-center gap-1">
                                <span className="opacity-60">In</span>
                                <span className="text-emerald-400 font-semibold">{promptPrice}</span>
                            </span>
                        )}
                        {promptPrice && completionPrice && <span className="opacity-40">·</span>}
                        {completionPrice && (
                            <span className="flex items-center gap-1">
                                <span className="opacity-60">Out</span>
                                <span className="text-blue-400 font-semibold">{completionPrice}</span>
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

const ChatInput = ({
    handleSendMessage,
    handleRecordButtonClick,
    inputRef,
    inputSelectionRef,
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
    reasoningEfforts = [],
    reasoningEffort,
    defaultReasoningEffort = null,
    isReasoningDefault = true,
    setReasoningEffort,
    selectedAudioModel,
    setSelectedAudioModel,
    availableAudioModels = [],
    translations,
    attachmentCount = 0,
    onOpenAttachments,
    isWebSearchEnabled,
    setIsWebSearchEnabled,
    onStopStreaming,
    features,
    recordings,
    retryTranscription,
    removeRecording,
    isNearingTimeLimit,
    onAddImages,
    contextLimit,
    setContextLimit,
    onScrapeUrl,
    onEmbedUrl,
    onSearchModels,
    isSearchingModels,
    searchedModels,
    recentModelValues = [],
    onModelSelected,
    onOpenModelPage,
    ollamaModels = [],
    ollamaStatus = 'disconnected',
    chromeModels = [],
    chromeAudioModels = [],
    isLocalModelsModalOpen = false,
    modelMenuTrigger = 0,
    onOllamaRefresh,
    onOpenOllamaSettings,
    onOpenChromeAISettings,
}) => {
    const [isHoveringSend, setIsHoveringSend] = useState(false);
    const [isHoveringRecord, setIsHoveringRecord] = useState(false);

    const [capsuleRenderTick, setCapsuleRenderTick] = useState(0);

    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [modelSearchQuery, setModelSearchQuery] = useState('');
    const [focusedModelIndex, setFocusedModelIndex] = useState(-1);

    // Incremental model list rendering: how many rows are mounted right now.
    const [visibleModelCount, setVisibleModelCount] = useState(MODEL_PAGE_SIZE);

    // Cost filter state (per-million-token values)
    const [modelMinCost, setModelMinCost] = useState(null);
    const [modelMaxCost, setModelMaxCost] = useState(null);

    // Sort order for the model list, persisted across sessions.
    const [sortMode, setSortMode] = useState(() => {
        try {
            const saved = localStorage.getItem('aida-model-sort');
            if (saved && SORT_MODES.some((m) => m.key === saved)) return saved;
        } catch { /* ignore */ }
        return 'cost-asc';
    });

    const [isOverflowOpen, setIsOverflowOpen] = useState(false);
    const [overflowKeys, setOverflowKeys] = useState([]);
    const [modelMaxChars, setModelMaxChars] = useState(null);
    const [toolbarResizeTick, setToolbarResizeTick] = useState(0);

    const modelMenuRef = useRef(null);
    const modelSearchRef = useRef(null);
    const modelItemRefs = useRef([]);

    const leftToolbarRef = useRef(null);
    const overflowButtonRef = useRef(null);
    const itemRefs = useRef({});
    const itemWidths = useRef({});
    const modelWidths = useRef({ full: null, medium: null, min: null });

    const setItemRef = useCallback((key) => (el) => {
        if (el) itemRefs.current[key] = el;
    }, []);

    const isDark = true;
    const isPillMode = autoRecordCountdown !== null || isRecording;
    const isOllamaSelected = selectedModel?.startsWith('ollama:');
    const isChromeSelected = selectedModel?.startsWith('chrome:');
    const isLocalModelSelected = isOllamaSelected || isChromeSelected;

    const ollamaStatusDot = {
        disconnected: 'bg-gray-500',
        connecting: 'bg-amber-400 animate-pulse',
        connected: 'bg-emerald-400',
        error: 'bg-red-400',
    }[ollamaStatus] || 'bg-gray-500';

    const chromeStatus = chromeModels[0]?.status || 'checking';
    const chromeStatusDot = {
        available: 'bg-emerald-400',
        downloadable: 'bg-amber-400',
        downloading: 'bg-blue-400 animate-pulse',
        checking: 'bg-gray-400 animate-pulse',
        'flag-disabled': 'bg-amber-400',
        error: 'bg-red-400',
    }[chromeStatus] || 'bg-gray-500';

    const CHROME_STATUS_LABELS = {
        checking: 'Checking',
        available: 'Ready',
        downloadable: 'Needs download',
        downloading: 'Downloading',
        unavailable: 'Unavailable',
        unsupported: 'Not supported',
        'flag-disabled': 'Flag off',
        error: 'Error',
    };

    useEffect(() => {
        if (onSearchModels) {
            onSearchModels(modelSearchQuery);
        }
    }, [modelSearchQuery, onSearchModels]);

    // Restore persisted cost filter on mount
    useEffect(() => {
        try {
            const savedMin = localStorage.getItem('aida-model-min-cost');
            const savedMax = localStorage.getItem('aida-model-max-cost');
            if (savedMin !== null) setModelMinCost(Number(savedMin));
            if (savedMax !== null) setModelMaxCost(Number(savedMax));
        } catch {
            // ignore storage errors
        }
    }, []);

    // Persist cost filter
    useEffect(() => {
        try {
            if (modelMinCost !== null) localStorage.setItem('aida-model-min-cost', String(modelMinCost));
            if (modelMaxCost !== null) localStorage.setItem('aida-model-max-cost', String(modelMaxCost));
        } catch {
            // ignore storage errors
        }
    }, [modelMinCost, modelMaxCost]);

    // Build the cost extent from every model that exposes a completion price
    const allPricedModels = useMemo(() => [
        ...availableModels,
        ...(searchedModels?.text || []),
        ...(searchedModels?.audio || []),
        ...availableAudioModels,
        ...chromeAudioModels,
    ], [availableModels, searchedModels, availableAudioModels, chromeAudioModels]);

    const costExtent = useMemo(() => {
        const prices = allPricedModels
            .map((m) => m.pricing?.completion)
            .filter((p) => typeof p === 'number' && !Number.isNaN(p) && p > 0)
            .map((p) => p * 1_000_000);
        if (prices.length === 0) return null;
        const max = Math.max(...prices);
        return { min: 0, max: Math.ceil(max * 100) / 100 };
    }, [allPricedModels]);

    // Clamp stored values into the current extent
    useEffect(() => {
        if (!costExtent) return;
        setModelMinCost((prev) => {
            if (prev === null) return costExtent.min;
            return Math.max(costExtent.min, Math.min(prev, costExtent.max));
        });
        setModelMaxCost((prev) => {
            if (prev === null) return costExtent.max;
            return Math.max(costExtent.min, Math.min(prev, costExtent.max));
        });
    }, [costExtent]);

    const passesCostFilter = useCallback((model) => {
        const raw = model?.pricing?.completion;
        if (typeof raw !== 'number' || Number.isNaN(raw)) return true;
        const perM = raw * 1_000_000;
        const min = modelMinCost ?? costExtent?.min ?? 0;
        const max = modelMaxCost ?? costExtent?.max ?? Infinity;
        return perM >= min && perM <= max;
    }, [modelMinCost, modelMaxCost, costExtent]);

    const currentSortMode = SORT_MODES.find((m) => m.key === sortMode) || SORT_MODES[0];

    const cycleSortMode = useCallback(() => {
        setSortMode((prev) => {
            const idx = SORT_MODES.findIndex((m) => m.key === prev);
            const next = SORT_MODES[(idx + 1) % SORT_MODES.length].key;
            try { localStorage.setItem('aida-model-sort', next); } catch { /* ignore */ }
            return next;
        });
    }, []);

    // Applies the current sort mode. Unpriced models always sink to the end
    // of cost-sorted lists; ties keep their source order (stable sort).
    const sortModels = useCallback((models) => {
        if (sortMode === 'alpha-asc' || sortMode === 'alpha-desc') {
            const dir = sortMode === 'alpha-asc' ? 1 : -1;
            return [...models].sort((a, b) => dir * String(a.label || '').localeCompare(String(b.label || '')));
        }
        const priceOf = (m) => (typeof m.pricing?.completion === 'number' ? m.pricing.completion : null);
        return [...models].sort((a, b) => {
            const pa = priceOf(a);
            const pb = priceOf(b);
            if (pa === null && pb === null) return String(a.label || '').localeCompare(String(b.label || ''));
            if (pa === null) return 1;
            if (pb === null) return -1;
            return sortMode === 'cost-asc' ? pa - pb : pb - pa;
        });
    }, [sortMode]);

    const searchedOllamaModels = useMemo(() => {
        const q = modelSearchQuery.trim().toLowerCase();
        const base = q
            ? ollamaModels.filter(m => m.label.toLowerCase().includes(q) || m.value.toLowerCase().includes(q))
            : ollamaModels;
        return base.filter(passesCostFilter);
    }, [ollamaModels, modelSearchQuery, passesCostFilter]);

    const sortedOllamaModels = useMemo(
        () => sortModels(searchedOllamaModels),
        [searchedOllamaModels, sortModels]
    );

    const searchedChromeModels = useMemo(() => {
        const q = modelSearchQuery.trim().toLowerCase();
        let base;
        if (!q) {
            const recentSet = new Set(recentModelValues.map(m => m.value));
            base = chromeModels.filter(m => !recentSet.has(m.value));
        } else {
            base = chromeModels.filter(m => m.label.toLowerCase().includes(q));
        }
        return base.filter(passesCostFilter);
    }, [chromeModels, modelSearchQuery, recentModelValues, passesCostFilter]);

    const sortedChromeModels = useMemo(
        () => sortModels(searchedChromeModels),
        [searchedChromeModels, sortModels]
    );

    const selectableChromeModels = useMemo(
        () => sortedChromeModels.filter(m => m.selectable),
        [sortedChromeModels]
    );
    const disabledChromeModels = useMemo(
        () => sortedChromeModels.filter(m => !m.selectable),
        [sortedChromeModels]
    );

    const recentModelItems = useMemo(() => {
        if (modelSearchQuery.trim() || isSearchingModels) return [];
        return recentModelValues
            .map(recent => {
                const source = recent.type === 'audio'
                    ? [...chromeAudioModels, ...availableAudioModels]
                    : [...ollamaModels, ...chromeModels, ...availableModels];
                const found = source.find(m => m.value === recent.value);
                return found ? { ...found, _type: recent.type } : null;
            })
            .filter(Boolean)
            .filter(passesCostFilter);
    }, [recentModelValues, availableModels, availableAudioModels, ollamaModels, chromeModels, chromeAudioModels, modelSearchQuery, isSearchingModels, passesCostFilter]);

    const searchedTextModels = useMemo(() => {
        const sourceModels = searchedModels ? searchedModels.text : availableModels;
        const seen = new Set();
        const unique = sourceModels.filter((m) => {
            if (seen.has(m.value)) return false;
            seen.add(m.value);
            return true;
        });

        if (searchedModels) return unique.filter(passesCostFilter);

        const q = modelSearchQuery.trim().toLowerCase();
        if (!q) {
            const recentSet = new Set(recentModelValues.map(m => m.value));
            return unique.filter(m => !recentSet.has(m.value)).filter(passesCostFilter);
        }

        const words = q.split(/\s+/).filter(Boolean);
        return unique
            .filter((m) => {
                const searchable = `${m.label} ${m.category || ''}`.toLowerCase();
                return words.every((word) => searchable.includes(word));
            })
            .filter(passesCostFilter);
    }, [availableModels, modelSearchQuery, searchedModels, recentModelValues, passesCostFilter]);

    const sortedTextModels = useMemo(
        () => sortModels(searchedTextModels),
        [searchedTextModels, sortModels]
    );

    const searchedAudioModels = useMemo(() => {
        const sourceModels = [...chromeAudioModels, ...(searchedModels ? searchedModels.audio : availableAudioModels)];
        const seen = new Set();
        const unique = sourceModels.filter((m) => {
            if (seen.has(m.value)) return false;
            seen.add(m.value);
            return true;
        });

        if (searchedModels) {
            const q = modelSearchQuery.trim().toLowerCase();
            if (!q) return unique.filter(passesCostFilter);
            return unique.filter(m => !m.chrome || m.label.toLowerCase().includes(q)).filter(passesCostFilter);
        }

        const q = modelSearchQuery.trim().toLowerCase();
        if (!q) {
            const recentSet = new Set(recentModelValues.map(m => m.value));
            return unique.filter(m => !recentSet.has(m.value)).filter(passesCostFilter);
        }

        const words = q.split(/\s+/).filter(Boolean);
        return unique
            .filter((m) => {
                const searchable = `${m.label} ${m.category || ''}`.toLowerCase();
                return words.every((word) => searchable.includes(word));
            })
            .filter(passesCostFilter);
    }, [availableAudioModels, chromeAudioModels, modelSearchQuery, searchedModels, recentModelValues, passesCostFilter]);

    const sortedAudioModels = useMemo(
        () => sortModels(searchedAudioModels),
        [searchedAudioModels, sortModels]
    );

    const selectableItems = useMemo(() => [
        ...recentModelItems,
        ...sortedOllamaModels.map(m => ({ ...m, _type: 'text' })),
        ...selectableChromeModels.map(m => ({ ...m, _type: 'text' })),
        ...sortedTextModels.map(m => ({ ...m, _type: 'text' })),
        ...sortedAudioModels.map(m => ({ ...m, _type: 'audio' }))
    ], [recentModelItems, sortedOllamaModels, selectableChromeModels, sortedTextModels, sortedAudioModels]);

    // Rows actually mounted right now, capped per section by a shared budget.
    // Keyboard indices stay based on the full arrays, so navigation is unaffected.
    const renderedModels = useMemo(() => {
        let budget = visibleModelCount;
        const take = (arr) => {
            const n = Math.min(arr.length, budget);
            budget -= n;
            return arr.slice(0, n);
        };
        return {
            recent: take(recentModelItems),
            ollama: take(sortedOllamaModels),
            chrome: take(selectableChromeModels),
            text: take(sortedTextModels),
            audio: take(sortedAudioModels),
        };
    }, [recentModelItems, sortedOllamaModels, selectableChromeModels, sortedTextModels, sortedAudioModels, visibleModelCount]);

    const openModelMenu = useCallback(() => {
        modelItemRefs.current = [];
        setModelSearchQuery('');
        setFocusedModelIndex(-1);
        setVisibleModelCount(MODEL_PAGE_SIZE);
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

    const closeOverflowMenu = useCallback(() => setIsOverflowOpen(false), []);

    const selectModel = useCallback((item) => {
        if (item._type === 'text') {
            setSelectedModel(item.value);
        } else {
            setSelectedAudioModel(item.value);
        }
        if (onModelSelected) {
            onModelSelected(item.value, item._type, item);
        }
        closeModelMenu();
    }, [setSelectedModel, setSelectedAudioModel, closeModelMenu, onModelSelected]);

    // Stable handlers handed to every memoized ModelOption row.
    const handleSelect = useCallback((opt, type) => {
        selectModel({ ...opt, _type: type });
    }, [selectModel]);

    const registerItemRef = useCallback((idx, el) => {
        if (el) modelItemRefs.current[idx] = el;
        else delete modelItemRefs.current[idx];
    }, []);

    // Grow the rendered page when the user scrolls near the end of the list.
    const handleModelListScroll = useCallback((e) => {
        if (visibleModelCount >= selectableItems.length) return;
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 500) {
            setVisibleModelCount((prev) => prev + MODEL_PAGE_SIZE);
        }
    }, [visibleModelCount, selectableItems.length]);

    const modelSelectionEnabled = Boolean(features?.modelSelection);

    useEffect(() => {
        if (!modelSelectionEnabled) return;
        const onKeyDown = (e) => {
            if (isLocalModelsModalOpen) return;
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
    }, [modelSelectionEnabled, isModelMenuOpen, openModelMenu, closeModelMenu, inputRef, isLocalModelsModalOpen]);

    // Opens the model picker on demand from the parent, e.g. after the
    // attachment capability dialog asks the user to switch models.
    const handledMenuTriggerRef = useRef(0);
    useEffect(() => {
        if (!modelSelectionEnabled || modelMenuTrigger <= handledMenuTriggerRef.current) return;
        handledMenuTriggerRef.current = modelMenuTrigger;
        if (overflowKeys.includes('model')) {
            setIsOverflowOpen(true);
        }
        openModelMenu();
    }, [modelMenuTrigger, modelSelectionEnabled, overflowKeys, openModelMenu]);

    useEffect(() => {
        if (!isModelMenuOpen) return;
        const t = setTimeout(() => modelSearchRef.current?.focus(), 40);
        return () => clearTimeout(t);
    }, [isModelMenuOpen]);

    useEffect(() => {
        setFocusedModelIndex(-1);
    }, [modelSearchQuery, modelMinCost, modelMaxCost, sortMode]);

    // A new search / filter starts from the first page again.
    useEffect(() => {
        setVisibleModelCount(MODEL_PAGE_SIZE);
    }, [modelSearchQuery, modelMinCost, modelMaxCost, searchedModels]);

    // Keep keyboard navigation working past the rendered window.
    useEffect(() => {
        if (focusedModelIndex >= visibleModelCount - 1 && focusedModelIndex >= 0) {
            setVisibleModelCount((prev) => prev + MODEL_PAGE_SIZE);
        }
    }, [focusedModelIndex, visibleModelCount]);

    useEffect(() => {
        const el = modelItemRefs.current[focusedModelIndex];
        if (el) el.scrollIntoView({ block: 'nearest' });
    }, [focusedModelIndex, visibleModelCount]);

    useLayoutEffect(() => {
        const el = leftToolbarRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => setToolbarResizeTick((v) => v + 1));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const handleModelSearchKeyDown = useCallback(
        (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedModelIndex((prev) => prev < selectableItems.length - 1 ? prev + 1 : 0);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedModelIndex((prev) => prev > 0 ? prev - 1 : selectableItems.length - 1);
                    break;
                case 'Enter': {
                    e.preventDefault();
                    const target = focusedModelIndex >= 0
                        ? selectableItems[focusedModelIndex]
                        : selectableItems.length === 1
                            ? selectableItems[0]
                            : null;
                    if (target) selectModel(target);
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
        [selectableItems, focusedModelIndex, selectModel, closeModelMenu]
    );

    const adjustInputHeight = useCallback(() => {
        const el = inputRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [inputRef]);

    const saveInputSelection = useCallback(() => {
        const div = inputRef.current;
        if (!div || !inputSelectionRef) return;

        const sel = window.getSelection();
        if (sel.rangeCount > 0 && div.contains(sel.anchorNode)) {
            inputSelectionRef.current = sel.getRangeAt(0).cloneRange();
        }
    }, [inputRef, inputSelectionRef]);

    const insertCapsule = (recordingId) => {
        const div = inputRef.current;
        if (!div) return;
        div.focus();
        const sel = window.getSelection();
        let range;
        if (sel.rangeCount > 0 && div.contains(sel.anchorNode)) {
            range = sel.getRangeAt(0);
        } else {
            range = document.createRange();
            range.selectNodeContents(div);
            range.collapse(false);
        }
        range.deleteContents();
        const span = document.createElement('span');
        span.contentEditable = 'false';
        span.id = `capsule-${recordingId}`;
        span.className = 'audio-capsule-container';
        range.insertNode(span);
        const space = document.createTextNode('\u00A0');
        span.after(space);
        range.setStartAfter(space);
        range.setEndAfter(space);
        sel.removeAllRanges();
        sel.addRange(range);
        adjustInputHeight();
    };

    useEffect(() => {
        if (recordings.length > 0) {
            const lastRec = recordings[recordings.length - 1];
            if (!document.getElementById(`capsule-${lastRec.id}`)) {
                insertCapsule(lastRec.id);
                setCapsuleRenderTick(t => t + 1);
            }
        }
    }, [recordings]);

    useEffect(() => {
        if (recordings.length === 0) return;

        for (const rec of recordings) {
            if (!rec.transcription) continue;

            const capsuleEl = document.getElementById(`capsule-${rec.id}`);
            if (!capsuleEl) continue;

            let textAfter = '';
            let sibling = capsuleEl.nextSibling;
            while (sibling) {
                if (sibling.nodeType === Node.TEXT_NODE) {
                    textAfter += sibling.textContent;
                } else if (sibling.nodeType === Node.ELEMENT_NODE && !sibling.id?.startsWith('capsule-')) {
                    textAfter += sibling.innerText || '';
                }
                sibling = sibling.nextSibling;
            }

            const incomingWords = rec.transcription.trim().split(/\s+/).filter(Boolean);
            const afterWords = textAfter.trim().split(/\s+/).filter(Boolean);

            const checkCount = Math.min(3, incomingWords.length);
            const alreadyPresent = afterWords.length >= checkCount &&
                incomingWords.slice(0, checkCount).every((word, i) => word === afterWords[i]);

            if (!alreadyPresent) {
                const textNode = document.createTextNode(' ' + rec.transcription);
                capsuleEl.parentNode.insertBefore(textNode, capsuleEl.nextSibling);
                adjustInputHeight();
            }
        }
    }, [recordings, adjustInputHeight]);

    // Memoized so unrelated re-renders skip the per-recording DOM lookups.
    // capsuleRenderTick is what forces a recompute after the capsule span is
    // inserted into the contenteditable (see the effect above).
    const recordingPortals = useMemo(() => recordings.map(rec => {
        const el = document.getElementById(`capsule-${rec.id}`);
        if (!el) return null;
        return createPortal(
            <AudioCapsule
                recording={rec}
                onDownload={() => {
                    const a = document.createElement('a');
                    a.href = rec.url;
                    a.download = `${rec.id}.webm`;
                    a.click();
                }}
                onRetranscribe={() => retryTranscription(rec.id)}
                onRemove={() => removeRecording(rec.id)}
            />,
            el
        );
    }), [recordings, retryTranscription, removeRecording, capsuleRenderTick]);

    const getMessageText = () => {
        const div = inputRef.current;
        if (!div) return '';
        let text = '';
        div.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.id.startsWith('capsule-')) {
                    // skip capsules
                } else {
                    text += node.innerText;
                }
            }
        });
        return text;
    };

    const onSend = () => {
        const text = getMessageText();
        const initiated = handleSendMessage(text);
        if (initiated) {
            if (inputRef.current) {
                inputRef.current.innerHTML = '';
                adjustInputHeight();
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(max-width: 768px)').matches) {
            e.preventDefault();
            onSend();
        }
    };

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

        const plainText = e.clipboardData?.getData('text/plain');
        if (plainText) {
            e.preventDefault();

            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();

                const textNode = document.createTextNode(plainText);
                range.insertNode(textNode);

                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            adjustInputHeight();
        }
    };

    const currentModelObj = [...ollamaModels, ...chromeModels, ...availableModels].find((m) => m.value === selectedModel);
    const selectedModelLabel = currentModelObj?.label || selectedModel;
    const currentVisuals = getModelVisuals(currentModelObj?.category || 'chat', isDark);
    const CurrentIcon = currentVisuals.icon;

    const renderSendButton = () => {
        const visibilityClass = isPillMode ? 'invisible pointer-events-none opacity-0' : '';
        if (isLoading) {
            return (
                <button type="button" onClick={onStopStreaming} className={`ml-2 p-2 rounded-full bg-[#2f3645] hover:bg-[#3a4254] ${visibilityClass}`} aria-label="Stop response generation">
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
                    {isHoveringSend ? <HiXMark className="h-5 w-5 text-white" /> : <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-base`}>{autoSendCountdown}</span>}
                </button>
            );
        }
        const isDisabled = isRecording || isTranscribing;
        return (
            <button
                type="button"
                onClick={onSend}
                disabled={isDisabled}
                className={`ml-2 p-2 rounded-full transition-opacity disabled:opacity-50 ${isDark
                    ? isDisabled ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'
                    : isDisabled ? 'bg-gray-300' : 'bg-gray-900 hover:bg-gray-700'
                    } ${visibilityClass}`}
                aria-label="Send Message"
            >
                <HiPaperAirplane className={`w-5 h-5 ${isDisabled ? isDark ? 'text-gray-300' : 'text-gray-500' : 'text-white'}`} />
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
                    {isHoveringRecord ? <HiXMark className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-base">{autoRecordCountdown}</span>}
                </button>
            );
        } else if (isRecording) {
            const pillBgColor = `bg-red-600 hover:bg-red-700 ${isNearingTimeLimit ? 'animate-pulse' : ''}`;
            pillContent = (
                <button
                    onClick={handleRecordButtonClick}
                    className={`${pillBaseClass} gap-2 !rounded-full !px-3 !py-2 !w-auto !h-auto text-white shadow-md transition-all duration-200 ${pillBgColor}`}
                    aria-label="Stop Recording"
                >
                    <HiStop className="h-5 w-5 flex-shrink-0" />
                    <span className="font-mono text-sm font-medium tracking-wider">{formatTime(elapsedTime)}</span>
                </button>
            );
        }

        const micVisibilityClass = isPillMode ? 'invisible pointer-events-none opacity-0' : '';
        const marginClass = isPillMode ? '!ml-4' : 'ml-2';

        return (
            <>
                {pillContent}
                <button
                    onClick={handleRecordButtonClick}
                    disabled={autoSendCountdown !== null}
                    className={`${marginClass} p-2 rounded-full text-white transition-all duration-200 disabled:opacity-50 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-900 hover:bg-gray-700'
                        } ${micVisibilityClass}`}
                    aria-label="Start Recording"
                >
                    <HiOutlineMicrophone className="w-5 h-5" />
                </button>
            </>
        );
    };

    const renderDisabledChromeOption = (opt) => (
        <button
            key={opt.value}
            type="button"
            onClick={onOpenChromeAISettings}
            className={`w-full text-left px-2.5 py-2 text-sm rounded-lg flex items-start gap-2.5 transition-colors border border-dashed ${isDark
                ? 'border-gray-700 text-gray-400 hover:border-teal-500/50 hover:text-teal-300'
                : 'border-gray-300 text-gray-500 hover:border-teal-500/60 hover:text-teal-600'
                }`}
        >
            <div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                <HiOutlineCpuChip className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                <span className="font-semibold text-sm truncate">{opt.label}</span>
                <span className="text-[11px] opacity-80">
                    {CHROME_STATUS_LABELS[opt.status] || 'Unavailable'} · Manage
                </span>
            </div>
        </button>
    );

    const renderWebSearchButton = () => (
        <button
            type="button"
            onClick={() => setIsWebSearchEnabled((p) => !p)}
            disabled={isLocalModelSelected}
            className={`p-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 ${isWebSearchEnabled && !isLocalModelSelected
                ? isDark ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
            aria-pressed={isWebSearchEnabled && !isLocalModelSelected}
            aria-label="Toggle web search"
            title={isLocalModelSelected ? 'Web search is not available for local models' : 'Toggle web search'}
        >
            <HiOutlineGlobeAlt className="h-6 w-6" />
        </button>
    );

    // Memoized header element: unrelated re-renders reuse the same element
    // reference, so React skips re-rendering the whole header subtree.
    const modelMenuHeader = useMemo(() => (
        <div className={`border-b ${isDark ? 'border-gray-700/80 bg-gray-900/40' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2 px-3 py-2">
                <HiMagnifyingGlass className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                    ref={modelSearchRef}
                    type="text"
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    onKeyDown={handleModelSearchKeyDown}
                    placeholder="Search models..."
                    autoComplete="off"
                    className={`flex-1 bg-transparent text-xs outline-none placeholder-gray-500 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                    aria-label="Search AI models"
                />
                {modelSearchQuery && (
                    <button
                        type="button"
                        onClick={() => {
                            setModelSearchQuery('');
                            modelSearchRef.current?.focus();
                        }}
                        className={`flex-shrink-0 p-0.5 rounded transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        aria-label="Clear search"
                    >
                        <HiXMark className="w-3 h-3" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 px-3 pb-2">
                {costExtent && (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Out
                        </span>
                        <div className="dual-range flex-1 min-w-0">
                            <input
                                type="range"
                                min={costExtent.min}
                                max={costExtent.max}
                                step={0.1}
                                value={Math.min(modelMinCost ?? costExtent.min, modelMaxCost ?? costExtent.max)}
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setModelMinCost(Math.min(v, modelMaxCost ?? costExtent.max));
                                }}
                                aria-label="Minimum model cost per million tokens"
                            />
                            <input
                                type="range"
                                min={costExtent.min}
                                max={costExtent.max}
                                step={0.1}
                                value={modelMaxCost ?? costExtent.max}
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setModelMaxCost(Math.max(v, modelMinCost ?? costExtent.min));
                                }}
                                aria-label="Maximum model cost per million tokens"
                            />
                        </div>
                        <input
                            type="number"
                            min={costExtent.min}
                            max={modelMaxCost ?? costExtent.max}
                            step={0.01}
                            value={modelMinCost ?? costExtent.min}
                            onChange={(e) => {
                                const v = e.target.value === '' ? costExtent.min : Number(e.target.value);
                                setModelMinCost(Math.min(Math.max(v, costExtent.min), modelMaxCost ?? costExtent.max));
                            }}
                            className={`cost-input ${isDark ? 'bg-gray-950 text-gray-200' : 'bg-white text-gray-800'}`}
                            aria-label="Minimum cost"
                        />
                        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                        <input
                            type="number"
                            min={modelMinCost ?? costExtent.min}
                            max={costExtent.max}
                            step={0.01}
                            value={modelMaxCost ?? costExtent.max}
                            onChange={(e) => {
                                const v = e.target.value === '' ? costExtent.max : Number(e.target.value);
                                setModelMaxCost(Math.max(Math.min(v, costExtent.max), modelMinCost ?? costExtent.min));
                            }}
                            className={`cost-input ${isDark ? 'bg-gray-950 text-gray-200' : 'bg-white text-gray-800'}`}
                            aria-label="Maximum cost"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setModelMinCost(costExtent.min);
                                setModelMaxCost(costExtent.max);
                            }}
                            className={`text-[10px] underline underline-offset-2 flex-shrink-0 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Reset
                        </button>
                    </div>
                )}

                <button
                    type="button"
                    onClick={cycleSortMode}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border transition-colors flex-shrink-0 ${
                        isDark
                            ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:text-gray-700'
                    }`}
                    title={`Sort: ${currentSortMode.label}. Click to change.`}
                    aria-label={`Sort models: ${currentSortMode.label}. Click to change sort order.`}
                >
                    <HiOutlineArrowsUpDown className="w-3 h-3" />
                    <span>{currentSortMode.short}</span>
                </button>
            </div>
        </div>
    ), [isDark, modelSearchQuery, handleModelSearchKeyDown, costExtent, modelMinCost, modelMaxCost, sortMode, currentSortMode, cycleSortMode]);

    const renderModelControl = () => {
        const modelLabelMaxChars = overflowKeys.includes('model') ? undefined : modelMaxChars;

        return (
            <>
                <button
                    type="button"
                    onClick={() => (isModelMenuOpen ? closeModelMenu() : openModelMenu())}
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm disabled:opacity-50 transition-colors max-w-full border ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        } ${currentVisuals.colorClass} ${currentVisuals.borderClass} ${currentVisuals.bgClass}`}
                    aria-haspopup="listbox"
                    aria-expanded={isModelMenuOpen}
                    aria-label={`Select AI model. Current: ${selectedModelLabel}. Press Tab to open.`}
                    title={`${selectedModelLabel} (Tab)`}
                >
                    <CurrentIcon className="h-4 w-4 flex-shrink-0" />
                    <span
                        className={`truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                        style={{ maxWidth: modelLabelMaxChars ? `${modelLabelMaxChars}ch` : undefined }}
                    >
                        {selectedModelLabel}
                    </span>
                    <HiChevronDown className={`h-3 w-3 flex-shrink-0 opacity-70 transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''
                        } ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>

                <ToolbarModal
                    isOpen={isModelMenuOpen}
                    onClose={closeModelMenu}
                    ariaLabel="Choose AI model"
                    triggerRef={modelMenuRef}
                    isDark={isDark}
                    role="listbox"
                    header={modelMenuHeader}
                    onBodyScroll={handleModelListScroll}
                    bodyClassName="overflow-y-auto custom-scrollbar p-2 max-h-[55vh] sm:max-h-96 space-y-1"
                    footer={
                        <div className={`px-3 py-2 border-t flex items-center justify-between gap-2 shrink-0 text-[10px] ${isDark ? 'border-gray-700/80 bg-gray-900/30 text-gray-600' : 'border-gray-100 bg-gray-50 text-gray-500'
                            }`}>
                            <span className="font-mono font-bold">↑↓</span>
                            <span>Navigate</span>
                            <span className="font-mono font-bold">⏎</span>
                            <span>Select</span>
                            <span className="font-mono font-bold">Esc</span>
                            <span>Close</span>
                        </div>
                    }
                >
                    {isSearchingModels ? (
                        <div className="flex items-center justify-center py-5">
                            <HiArrowPath className="w-5 h-5 animate-spin text-gray-400" />
                            <span className="ml-2 text-xs text-gray-500">Searching OpenRouter...</span>
                        </div>
                    ) : selectableItems.length === 0 ? (
                        <p className={`px-3 py-5 text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                            No models match your search
                        </p>
                    ) : (
                        <>
                            {renderedModels.recent.length > 0 && (
                                <div className="mb-2">
                                    <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500 bg-gray-900/50' : 'text-gray-400 bg-gray-50'
                                        }`}>
                                        Recent Models
                                    </div>
                                    {renderedModels.recent.map((opt, idx) => (
                                        <ModelOption
                                            key={opt.value}
                                            opt={opt}
                                            type={opt._type}
                                            idx={idx}
                                            isSelected={opt._type === 'text' ? selectedModel === opt.value : selectedAudioModel === opt.value}
                                            isFocused={focusedModelIndex === idx}
                                            isDark={isDark}
                                            onSelect={handleSelect}
                                            onOpenModelPage={onOpenModelPage}
                                            registerItemRef={registerItemRef}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="mb-2">
                                <div className={`px-3 py-2 flex items-center justify-between gap-2 ${isDark ? 'text-gray-500 bg-gray-900/50' : 'text-gray-400 bg-gray-50'
                                    }`}>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ollamaStatusDot}`} />
                                        Ollama
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        {ollamaStatus === 'connected' && (
                                            <button
                                                type="button"
                                                onClick={onOllamaRefresh}
                                                className={`p-1 rounded transition-colors ${isDark
                                                    ? 'hover:bg-white/10 text-gray-400 hover:text-gray-200'
                                                    : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                                                    }`}
                                                title="Refresh local models"
                                                aria-label="Refresh local models"
                                            >
                                                <HiArrowPath className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={onOpenOllamaSettings}
                                            className={`p-1 rounded transition-colors ${isDark
                                                ? 'hover:bg-white/10 text-gray-400 hover:text-gray-200'
                                                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                                                }`}
                                            title="Ollama connection settings"
                                            aria-label="Ollama connection settings"
                                        >
                                            <HiOutlineCog6Tooth className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                </div>

                                {ollamaStatus === 'connecting' && (
                                    <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500">
                                        <HiArrowPath className="w-4 h-4 animate-spin" />
                                        Connecting to Ollama...
                                    </div>
                                )}

                                {ollamaStatus === 'connected' && sortedOllamaModels.length === 0 && !modelSearchQuery && (
                                    <p className={`px-3 py-2.5 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'
                                        }`}>
                                        Connected, but no models installed. Pull one with{' '}
                                        <code className="font-mono">ollama pull llama3.2</code>.
                                    </p>
                                )}

                                {ollamaStatus === 'connected' && renderedModels.ollama.map((opt, idx) => (
                                    <ModelOption
                                        key={opt.value}
                                        opt={opt}
                                        type="text"
                                        idx={renderedModels.recent.length + idx}
                                        isSelected={selectedModel === opt.value}
                                        isFocused={focusedModelIndex === renderedModels.recent.length + idx}
                                        isDark={isDark}
                                        onSelect={handleSelect}
                                        onOpenModelPage={onOpenModelPage}
                                        registerItemRef={registerItemRef}
                                    />
                                ))}

                                {ollamaStatus === 'error' && (
                                    <div className={`mx-2 my-1.5 px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 ${isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-600'
                                        }`}>
                                        <span>Connection failed</span>
                                        <button
                                            type="button"
                                            onClick={onOpenOllamaSettings}
                                            className="font-semibold underline underline-offset-2 hover:opacity-80"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}

                                {ollamaStatus === 'disconnected' && (
                                    <button
                                        type="button"
                                        onClick={onOpenOllamaSettings}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg border border-dashed transition-colors ${isDark
                                            ? 'border-gray-700 text-gray-400 hover:border-teal-500/50 hover:text-teal-300'
                                            : 'border-gray-300 text-gray-500 hover:border-teal-500/60 hover:text-teal-600'
                                            }`}
                                    >
                                        <HiOutlineCpuChip className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs font-medium">Connect to Ollama</span>
                                    </button>
                                )}
                            </div>

                            <div className="mb-2">
                                <div className={`px-3 py-2 flex items-center justify-between gap-2 ${isDark ? 'text-gray-500 bg-gray-900/50' : 'text-gray-400 bg-gray-50'
                                    }`}>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${chromeStatusDot}`} />
                                        Chromium AI
                                    </span>
                                    <button
                                        type="button"
                                        onClick={onOpenChromeAISettings}
                                        className={`p-1 rounded transition-colors ${isDark
                                            ? 'hover:bg-white/10 text-gray-400 hover:text-gray-200'
                                            : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                                            }`}
                                        title="Manage Chromium built-in models"
                                        aria-label="Manage Chromium built-in models"
                                    >
                                        <HiOutlineCog6Tooth className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {renderedModels.chrome.map((opt, idx) => (
                                    <ModelOption
                                        key={opt.value}
                                        opt={opt}
                                        type="text"
                                        idx={renderedModels.recent.length + renderedModels.ollama.length + idx}
                                        isSelected={selectedModel === opt.value}
                                        isFocused={focusedModelIndex === renderedModels.recent.length + renderedModels.ollama.length + idx}
                                        isDark={isDark}
                                        onSelect={handleSelect}
                                        onOpenModelPage={onOpenModelPage}
                                        registerItemRef={registerItemRef}
                                    />
                                ))}
                                {disabledChromeModels.map(renderDisabledChromeOption)}
                            </div>

                            {renderedModels.text.length > 0 && (
                                <div className="mb-2">
                                    <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500 bg-gray-900/50' : 'text-gray-400 bg-gray-50'
                                        }`}>
                                        Text Models
                                    </div>
                                    {renderedModels.text.map((opt, idx) => (
                                        <ModelOption
                                            key={opt.value}
                                            opt={opt}
                                            type="text"
                                            idx={renderedModels.recent.length + renderedModels.ollama.length + renderedModels.chrome.length + idx}
                                            isSelected={selectedModel === opt.value}
                                            isFocused={focusedModelIndex === renderedModels.recent.length + renderedModels.ollama.length + renderedModels.chrome.length + idx}
                                            isDark={isDark}
                                            onSelect={handleSelect}
                                            onOpenModelPage={onOpenModelPage}
                                            registerItemRef={registerItemRef}
                                        />
                                    ))}
                                </div>
                            )}
                            {renderedModels.audio.length > 0 && (
                                <div>
                                    <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500 bg-gray-900/50' : 'text-gray-400 bg-gray-50'
                                        }`}>
                                        Audio Models
                                    </div>
                                    {renderedModels.audio.map((opt, idx) => (
                                        <ModelOption
                                            key={opt.value}
                                            opt={opt}
                                            type="audio"
                                            idx={renderedModels.recent.length + renderedModels.ollama.length + renderedModels.chrome.length + renderedModels.text.length + idx}
                                            isSelected={selectedAudioModel === opt.value}
                                            isFocused={focusedModelIndex === renderedModels.recent.length + renderedModels.ollama.length + renderedModels.chrome.length + renderedModels.text.length + idx}
                                            isDark={isDark}
                                            onSelect={handleSelect}
                                            onOpenModelPage={onOpenModelPage}
                                            registerItemRef={registerItemRef}
                                        />
                                    ))}
                                </div>
                            )}

                            {visibleModelCount < selectableItems.length && (
                                <div className="flex items-center justify-center py-3">
                                    <HiArrowPath className="w-4 h-4 animate-spin text-gray-500" />
                                    <span className="ml-2 text-[10px] text-gray-500">
                                        Loading more models...
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </ToolbarModal>
            </>
        );
    };

    const renderReasoningControl = () => (
        <ReasoningSelector
            efforts={reasoningEfforts}
            value={reasoningEffort}
            defaultEffort={defaultReasoningEffort}
            isDefault={isReasoningDefault}
            onChange={setReasoningEffort}
        />
    );

    const renderContextControl = () => (
        <ContextSelector
            value={contextLimit}
            onChange={setContextLimit}
            theme="dark"
        />
    );

    const featureKey = `${features.webSearch}-${features.modelSelection}`;

    // Plain array, rebuilt each render. The overflow layout effect below
    // depends on stable keys (toolbarResizeTick, overflowKeys, modelMaxChars,
    // featureKey) rather than on this array's identity, so rebuilding it is
    // cheap and does not trigger re-measurement on every keystroke.
    const toolbarItems = [
        ...(features.webSearch ? [{ key: 'websearch', label: 'Web Search', render: renderWebSearchButton }] : []),
        ...(features.modelSelection ? [{ key: 'model', label: 'Model', render: renderModelControl }] : []),
        { key: 'reasoning', label: 'Reasoning Effort', render: renderReasoningControl },
        { key: 'context', label: 'Context Limit', render: renderContextControl },
    ];

    const visibleItems = toolbarItems.filter((item) => !overflowKeys.includes(item.key));
    const overflowMenuItems = toolbarItems
        .filter((item) => overflowKeys.includes(item.key))
        .sort((a, b) => {
            if (a.key === 'model') return -1;
            if (b.key === 'model') return 1;
            return 0;
        });

    // The overflow layout effect depends on a stable tick instead of the
    // toolbarItems array. It only re-runs when the toolbar actually resizes
    // or when the overflow state itself changes, not on every keystroke.
    // toolbarItems is read from the current render closure; only its stable
    // keys are used, so the closure is safe here.
    useLayoutEffect(() => {
        const container = leftToolbarRef.current;
        if (!container || container.clientWidth <= 0) return;

        const nonModelItems = toolbarItems.filter((item) => item.key !== 'model');
        const totalNonModel = nonModelItems.length;

        for (const item of nonModelItems) {
            if (!overflowKeys.includes(item.key)) {
                const el = itemRefs.current[item.key];
                if (el) itemWidths.current[item.key] = el.offsetWidth;
            }
        }

        const modelVisible = toolbarItems.some((item) => item.key === 'model' && !overflowKeys.includes(item.key));
        const currentModelPhase = modelVisible
            ? modelMaxChars === null
                ? 'full'
                : modelMaxChars === MODEL_MAX_CHARS_MEDIUM
                    ? 'medium'
                    : 'min'
            : 'overflow';

        if (modelVisible) {
            const modelEl = itemRefs.current.model;
            if (modelEl) {
                modelWidths.current[currentModelPhase] = modelEl.offsetWidth;
            }
        }

        const fallbackChWidth = 7;

        const estimateModelWidth = (phase) => {
            if (phase === 'overflow') return 0;
            const stored = modelWidths.current[phase];
            if (stored) return stored;
            const length = phase === 'full' ? 80 : phase === 'medium' ? MODEL_MAX_CHARS_MEDIUM : MODEL_MAX_CHARS_MIN;
            return Math.round(length * fallbackChWidth + 32);
        };

        const modelWidthFor = (phase) => {
            if (phase === 'overflow') return 0;
            if (phase === currentModelPhase && modelVisible) {
                return itemRefs.current.model?.offsetWidth || modelWidths.current[phase] || estimateModelWidth(phase);
            }
            return modelWidths.current[phase] || estimateModelWidth(phase);
        };

        const overflowButtonWidth = overflowButtonRef.current?.offsetWidth || 28;

        const computeTotal = (phase, visibleNonModelKeys) => {
            const visibleKeys = [];
            if (phase !== 'overflow') visibleKeys.push('model');
            visibleKeys.push(...visibleNonModelKeys);

            let total = 0;
            if (visibleKeys.length > 0) {
                for (const key of visibleKeys) {
                    if (key === 'model') {
                        total += modelWidthFor(phase);
                    } else {
                        total += itemWidths.current[key] || 0;
                    }
                }
                total += (visibleKeys.length - 1) * TOOLBAR_GAP;
            }

            const hasOverflowButton = phase === 'overflow' || visibleNonModelKeys.length < totalNonModel;
            if (hasOverflowButton) {
                if (visibleKeys.length > 0) total += TOOLBAR_GAP;
                total += overflowButtonWidth;
            }

            return total;
        };

        const allNonModelKeys = nonModelItems.map((item) => item.key);

        const candidateStates = [
            { phase: 'full', visibleNonModelKeys: allNonModelKeys },
        ];

        for (let visibleCount = totalNonModel; visibleCount >= 0; visibleCount -= 1) {
            candidateStates.push({
                phase: 'medium',
                visibleNonModelKeys: allNonModelKeys.slice(0, visibleCount),
            });
        }

        candidateStates.push(
            { phase: 'min', visibleNonModelKeys: [] },
            { phase: 'overflow', visibleNonModelKeys: [] },
        );

        let best = candidateStates.find((candidate) =>
            computeTotal(candidate.phase, candidate.visibleNonModelKeys) <= container.clientWidth,
        );

        if (!best) {
            best = { phase: 'overflow', visibleNonModelKeys: [] };
        }

        const nextOverflowKeys = [];
        for (const item of toolbarItems) {
            const isModel = item.key === 'model';
            if (isModel) {
                if (best.phase === 'overflow') nextOverflowKeys.push(item.key);
            } else if (!best.visibleNonModelKeys.includes(item.key)) {
                nextOverflowKeys.push(item.key);
            }
        }

        const nextModelMaxChars = best.phase === 'full'
            ? null
            : best.phase === 'medium'
                ? MODEL_MAX_CHARS_MEDIUM
                : best.phase === 'min'
                    ? MODEL_MAX_CHARS_MIN
                    : null;

        const overflowChanged =
            nextOverflowKeys.length !== overflowKeys.length ||
            nextOverflowKeys.some((key, index) => overflowKeys[index] !== key);

        if (overflowChanged || nextModelMaxChars !== modelMaxChars) {
            setOverflowKeys(nextOverflowKeys);
            setModelMaxChars(nextModelMaxChars);
        }
        // toolbarItems is read from the current render closure; only its
        // stable keys are used. The tick is what triggers re-measurement.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toolbarResizeTick, overflowKeys, modelMaxChars, featureKey]);

    return (
        <div
            className="relative p-2 rounded-none transition-colors border-t"
            style={{
                backgroundColor: 'var(--aida-input-container)',
                borderColor: 'var(--aida-input-border)',
                color: 'var(--aida-input-text)',
            }}
        >
            <div
                className="flex items-end rounded-lg px-3 py-1 mb-2 transition-colors border"
                style={{
                    backgroundColor: 'var(--aida-user-msg-bg)',
                    color: 'var(--aida-user-msg-text)',
                    borderColor: 'var(--aida-input-border)',
                }}
            >
                <div
                    ref={inputRef}
                    contentEditable="true"
                    onInput={() => {
                        adjustInputHeight();
                        saveInputSelection();
                    }}
                    onKeyDown={handleKeyDown}
                    onKeyUp={saveInputSelection}
                    onMouseUp={saveInputSelection}
                    onClick={saveInputSelection}
                    onBlur={saveInputSelection}
                    onPaste={handlePaste}
                    data-placeholder={translations.inputPlaceholder || 'Type your message...'}
                    dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'}
                    className="aida-input-textarea flex-1 bg-transparent px-0 py-1 resize-none focus:outline-none custom-scrollbar overflow-y-auto whitespace-pre-wrap leading-tight min-h-[32px] max-h-[200px]"
                    style={{ overflowY: 'auto', overflowX: 'hidden', color: 'inherit' }}
                />
            </div>

            {recordingPortals}

            <div className="flex items-center justify-between">
                <div ref={leftToolbarRef} className="relative flex items-center min-w-0 flex-1 mr-2 gap-2">
                    {visibleItems.map((item) => {
                        const isModel = item.key === 'model';
                        return (
                            <div
                                key={item.key}
                                ref={isModel
                                    ? (el) => {
                                        itemRefs.current.model = el;
                                        modelMenuRef.current = el;
                                    }
                                    : setItemRef(item.key)}
                                className="relative flex-shrink-0"
                            >
                                {item.render()}
                            </div>
                        );
                    })}

                    {overflowKeys.length > 0 && (
                        <div ref={overflowButtonRef} className="relative flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsOverflowOpen((open) => !open)}
                                className={`p-2 rounded-full border transition-colors ${isDark
                                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                                    }`}
                                aria-label="More controls"
                                title="More controls"
                                aria-expanded={isOverflowOpen}
                            >
                                <HiChevronUp className={`h-4 w-4 transition-transform ${isOverflowOpen ? 'rotate-180' : ''
                                    }`} />
                            </button>

                            <ToolbarModal
                                isOpen={isOverflowOpen}
                                onClose={closeOverflowMenu}
                                ariaLabel="More controls"
                                triggerRef={overflowButtonRef}
                                isDark={isDark}
                                clipContent={false}
                                header={
                                    <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'
                                        }`}>
                                        More controls
                                    </div>
                                }
                                bodyClassName="p-2 space-y-1"
                            >
                                {overflowMenuItems.map((item) => (
                                    <div
                                        key={item.key}
                                        ref={item.key === 'model'
                                            ? (el) => {
                                                modelMenuRef.current = el;
                                            }
                                            : undefined}
                                        className="flex w-full items-center justify-between gap-3"
                                    >
                                        <span className={`shrink-0 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {item.label}
                                        </span>
                                        <div className="flex min-w-0 justify-end">
                                            {item.render()}
                                        </div>
                                    </div>
                                ))}
                            </ToolbarModal>
                        </div>
                    )}
                </div>

                <div className="flex items-center chat-action-buttons relative flex-shrink-0">
                    {features.imageUpload && (
                        <AttachmentButton count={attachmentCount} onClick={onOpenAttachments} theme="dark" />
                    )}
                    {features.voiceInput && renderRecordButton()}
                    {renderSendButton()}
                </div>
            </div>
        </div>
    );
};

export default ChatInput;