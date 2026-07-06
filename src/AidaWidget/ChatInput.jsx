// src/AidaWidget/ChatInput.jsx
/* src/AidaWidget/ChatInput.jsx */
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    HiPaperAirplane, HiOutlineMicrophone, HiStop, HiArrowPath, HiXMark,
    HiChevronDown, HiOutlineGlobeAlt, HiLightBulb, HiPhoto, HiChatBubbleLeftRight,
    HiArrowTopRightOnSquare, HiPaperClip, HiEye, HiMagnifyingGlass,
    HiOutlineDocument, HiOutlineRectangleStack, HiPlay, HiPause, HiArrowDownTray
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

const ModularBadges = ({ modality }) => {
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
};

const ChatInput = ({
    handleSendMessage,
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
}) => {
    const [isHoveringSend, setIsHoveringSend] = useState(false);
    const [isHoveringRecord, setIsHoveringRecord] = useState(false);
    const [isHoveringCancel, setIsHoveringCancel] = useState(false);

    const [capsuleRenderTick, setCapsuleRenderTick] = useState(0);

    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [modelSearchQuery, setModelSearchQuery] = useState('');
    const [focusedModelIndex, setFocusedModelIndex] = useState(-1);

    const modelMenuRef = useRef(null);
    const modelSearchRef = useRef(null);
    const modelItemRefs = useRef([]);

    const isDark = true;
    const isPillMode = autoRecordCountdown !== null || isRecording;

    useEffect(() => {
        if (onSearchModels) {
            onSearchModels(modelSearchQuery);
        }
    }, [modelSearchQuery, onSearchModels]);

    const recentModelItems = useMemo(() => {
        if (modelSearchQuery.trim() || isSearchingModels) return [];
        return recentModelValues
            .map(recent => {
                const source = recent.type === 'audio' ? availableAudioModels : availableModels;
                const found = source.find(m => m.value === recent.value);
                return found ? { ...found, _type: recent.type } : null;
            })
            .filter(Boolean);
    }, [recentModelValues, availableModels, availableAudioModels, modelSearchQuery, isSearchingModels]);

    const filteredTextModels = useMemo(() => {
        const sourceModels = searchedModels ? searchedModels.text : availableModels;
        const seen = new Set();
        const unique = sourceModels.filter((m) => {
            if (seen.has(m.value)) return false;
            seen.add(m.value);
            return true;
        });

        if (searchedModels) return unique;

        const q = modelSearchQuery.trim().toLowerCase();
        if (!q) {
            const recentSet = new Set(recentModelValues.map(m => m.value));
            return unique.filter(m => !recentSet.has(m.value));
        }

        const words = q.split(/\s+/).filter(Boolean);
        return unique.filter((m) => {
            const searchable = `${m.label} ${m.category || ''}`.toLowerCase();
            return words.every((word) => searchable.includes(word));
        });
    }, [availableModels, modelSearchQuery, searchedModels, recentModelValues]);

    const filteredAudioModels = useMemo(() => {
        const sourceModels = searchedModels ? searchedModels.audio : availableAudioModels;
        const seen = new Set();
        const unique = sourceModels.filter((m) => {
            if (seen.has(m.value)) return false;
            seen.add(m.value);
            return true;
        });

        if (searchedModels) return unique;

        const q = modelSearchQuery.trim().toLowerCase();
        if (!q) {
            const recentSet = new Set(recentModelValues.map(m => m.value));
            return unique.filter(m => !recentSet.has(m.value));
        }

        const words = q.split(/\s+/).filter(Boolean);
        return unique.filter((m) => {
            const searchable = `${m.label} ${m.category || ''}`.toLowerCase();
            return words.every((word) => searchable.includes(word));
        });
    }, [availableAudioModels, modelSearchQuery, searchedModels, recentModelValues]);

    const selectableItems = useMemo(() => [
        ...recentModelItems,
        ...filteredTextModels.map(m => ({ ...m, _type: 'text' })),
        ...filteredAudioModels.map(m => ({ ...m, _type: 'audio' }))
    ], [recentModelItems, filteredTextModels, filteredAudioModels]);

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

    const selectModel = useCallback((item) => {
        if (item._type === 'text') {
            setSelectedModel(item.value);
        } else {
            setSelectedAudioModel(item.value);
        }
        if (onModelSelected) {
            onModelSelected(item.value, item._type);
        }
        closeModelMenu();
    }, [setSelectedModel, setSelectedAudioModel, closeModelMenu, onModelSelected]);

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
                    setFocusedModelIndex((prev) => prev < selectableItems.length - 1 ? prev + 1 : 0);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedModelIndex((prev) => prev > 0 ? prev - 1 : selectableItems.length - 1);
                    break;
                case 'Enter': {
                    e.preventDefault();
                    const target = focusedModelIndex >= 0 ? selectableItems[focusedModelIndex] : selectableItems.length === 1 ? selectableItems[0] : null;
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

            // Collect the plain text that appears after this capsule
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

            // Compare the first few words after the capsule with the transcription
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

    const getMessageText = () => {
        const div = inputRef.current;
        if (!div) return '';
        let text = '';
        div.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.id.startsWith('capsule-')) {
                    // Transcription is now inserted as a text node before the capsule
                } else {
                    text += node.innerText;
                }
            }
        });
        return text;
    };

    const onSend = () => {
        const text = getMessageText();
        handleSendMessage(text);
        if (inputRef.current) {
            inputRef.current.innerHTML = '';
            adjustInputHeight();
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

        // Strip formatting from text paste
        const plainText = e.clipboardData?.getData('text/plain');
        if (plainText) {
            e.preventDefault();
            document.execCommand('insertText', false, plainText);
            adjustInputHeight();
        }
    };

    const getModelVisuals = (category) => {
        switch (category) {
            case 'reasoning':
                return { icon: HiLightBulb, colorClass: 'text-purple-500', bgClass: isDark ? 'bg-purple-500/10' : 'bg-purple-50', borderClass: 'border-purple-500/30' };
            case 'vision':
                return { icon: HiPhoto, colorClass: 'text-pink-500', bgClass: isDark ? 'bg-pink-500/10' : 'bg-pink-50', borderClass: 'border-pink-500/30' };
            case 'audio':
                return { icon: HiOutlineMicrophone, colorClass: 'text-green-500', bgClass: isDark ? 'bg-green-500/10' : 'bg-green-50', borderClass: 'border-green-500/30' };
            case 'chat':
            default:
                return { icon: HiChatBubbleLeftRight, colorClass: 'text-blue-500', bgClass: isDark ? 'bg-blue-500/10' : 'bg-blue-50', borderClass: 'border-blue-500/30' };
        }
    };

    const currentModelObj = availableModels.find((m) => m.value === selectedModel);
    const selectedModelLabel = currentModelObj?.label || selectedModel;
    const currentVisuals = getModelVisuals(currentModelObj?.category || 'chat');
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
                <button onClick={cancelAutoSendTimer} onMouseEnter={() => { setIsHoveringSend(true); setIsSendTimerPaused(true); }} onMouseLeave={() => { setIsHoveringSend(false); setIsSendTimerPaused(false); }} className={`ml-2 flex items-center justify-center timer-button !w-9 !h-9 ${visibilityClass}`} style={{ animationPlayState: isHoveringSend ? 'paused' : 'running' }} aria-label="Cancel auto-send">
                    {isHoveringSend ? <HiXMark className="h-5 w-5 text-white" /> : <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-base`}>{autoSendCountdown}</span>}
                </button>
            );
        }
        const isDisabled = isRecording || isTranscribing;
        return (
            <button type="button" onClick={onSend} disabled={isDisabled} className={`ml-2 p-2 rounded-full transition-opacity disabled:opacity-50 ${isDark ? isDisabled ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600' : isDisabled ? 'bg-gray-300' : 'bg-gray-900 hover:bg-gray-700'} ${visibilityClass}`} aria-label="Send Message">
                <HiPaperAirplane className={`w-5 h-5 ${isDisabled ? isDark ? 'text-gray-300' : 'text-gray-500' : 'text-white'}`} />
            </button>
        );
    };

    const renderRecordButton = () => {
        const pillBaseClass = 'absolute right-0 z-20 flex items-center whitespace-nowrap';
        let pillContent = null;

        if (autoRecordCountdown !== null) {
            pillContent = (
                <button onClick={cancelAutoRecordTimer} onMouseEnter={() => { setIsHoveringRecord(true); setIsRecordTimerPaused(true); }} onMouseLeave={() => { setIsHoveringRecord(false); setIsRecordTimerPaused(false); }} className={`${pillBaseClass} justify-center record-timer-button !w-9 !h-9`} style={{ animationPlayState: isHoveringRecord ? 'paused' : 'running' }} aria-label="Cancel auto-record">
                    {isHoveringRecord ? <HiXMark className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-base">{autoRecordCountdown}</span>}
                </button>
            );
        } else if (isRecording) {
            const pillBgColor = `bg-red-600 hover:bg-red-700 ${isNearingTimeLimit ? 'animate-pulse' : ''}`;
            pillContent = (
                <button onClick={handleRecordButtonClick} className={`${pillBaseClass} gap-2 !rounded-full !px-3 !py-2 !w-auto !h-auto text-white shadow-md transition-all duration-200 ${pillBgColor}`} aria-label="Stop Recording">
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
                <button onClick={handleRecordButtonClick} disabled={autoSendCountdown !== null} className={`${marginClass} p-2 rounded-full text-white transition-all duration-200 disabled:opacity-50 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-900 hover:bg-gray-700'} ${micVisibilityClass}`} aria-label="Start Recording">
                    <HiOutlineMicrophone className="w-5 h-5" />
                </button>
            </>
        );
    };

    const renderModelOption = (opt, idx, type) => {
        const visuals = getModelVisuals(opt.category || 'chat');
        const Icon = visuals.icon;
        const isSelected = type === 'text' ? selectedModel === opt.value : selectedAudioModel === opt.value;
        const isFocused = focusedModelIndex === idx;
        let rowClass = 'w-full text-left px-2.5 py-2 text-sm rounded-lg flex items-start gap-2.5 transition-colors outline-none border ';
        if (isFocused) {
            rowClass += isDark ? 'bg-white/10 ring-1 ring-inset ring-brand-coral/50 border-brand-coral/50 ' : 'bg-blue-50 ring-1 ring-inset ring-blue-300 border-blue-300 ';
        } else if (isSelected) {
            rowClass += isDark ? 'bg-gray-700/50 border-gray-600 ' : 'bg-gray-100 border-gray-200 ';
        } else {
            rowClass += isDark ? 'hover:bg-gray-700/30 border-gray-700/50 hover:border-gray-600 ' : 'hover:bg-gray-50 border-gray-200 ';
        }
        const promptPrice = formatPrice(opt.pricing?.prompt);
        const completionPrice = formatPrice(opt.pricing?.completion);
        return (
            <button key={opt.value} type="button" ref={(el) => { modelItemRefs.current[idx] = el; }} role="option" aria-selected={isSelected} onClick={() => selectModel({ ...opt, _type: type })} className={rowClass}>
                <div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${visuals.bgClass} ${visuals.colorClass}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className={`font-semibold text-sm truncate ${isSelected ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-gray-200' : 'text-gray-800')}`}>{opt.label}</span>
                        {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-coral flex-shrink-0" aria-hidden="true" />}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {opt.modality && <ModularBadges modality={opt.modality} />}
                    </div>
                    {(promptPrice || completionPrice) && (
                        <div className={`flex items-center gap-2 flex-wrap text-xs font-mono px-2 py-1 rounded mt-1 ${isDark ? 'bg-gray-900/60 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {promptPrice && (<span className="flex items-center gap-1"><span className="opacity-60">In</span><span className="text-emerald-400 font-semibold">{promptPrice}</span></span>)}
                            {promptPrice && completionPrice && (<span className="opacity-40">·</span>)}
                            {completionPrice && (<span className="flex items-center gap-1"><span className="opacity-60">Out</span><span className="text-blue-400 font-semibold">{completionPrice}</span></span>)}
                        </div>
                    )}
                </div>
            </button>
        );
    };

    return (
        <div className="relative p-2 rounded-none transition-colors border-t" style={{ backgroundColor: 'var(--aida-input-container)', borderColor: 'var(--aida-input-border)', color: 'var(--aida-input-text)' }}>
            <div className="flex items-end rounded-lg px-3 py-1 mb-2 transition-colors border" style={{ backgroundColor: 'var(--aida-user-msg-bg)', color: 'var(--aida-user-msg-text)', borderColor: 'var(--aida-input-border)' }}>
                <div
                    ref={inputRef}
                    contentEditable="true"
                    onInput={adjustInputHeight}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    data-placeholder={translations.inputPlaceholder || 'Type your message...'}
                    dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'}
                    className="aida-input-textarea flex-1 bg-transparent px-0 py-1 resize-none focus:outline-none custom-scrollbar overflow-y-auto whitespace-pre-wrap leading-tight min-h-[32px] max-h-[200px]"
                    style={{ overflowY: 'auto', overflowX: 'hidden', color: 'inherit' }}
                />
            </div>

            {recordings.map(rec => {
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
            })}

            <div className="flex items-center justify-between">
                <div className="relative flex items-center min-w-0 flex-1 mr-2 gap-2">
                    {features.webSearch && (
                        <button type="button" onClick={() => setIsWebSearchEnabled((p) => !p)} className={`p-2 rounded-full disabled:opacity-50 transition-colors flex-shrink-0 ${isWebSearchEnabled ? isDark ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-600' : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`} aria-pressed={isWebSearchEnabled} aria-label="Toggle web search" title="Toggle web search">
                            <HiOutlineGlobeAlt className="h-6 w-6" />
                        </button>
                    )}
                    {features.modelSelection && (
                        <div className="relative min-w-0" ref={modelMenuRef}>
                            <button type="button" onClick={() => (isModelMenuOpen ? closeModelMenu() : openModelMenu())} className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm disabled:opacity-50 transition-colors max-w-full border ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${currentVisuals.colorClass} ${currentVisuals.borderClass} ${currentVisuals.bgClass}`} aria-haspopup="listbox" aria-expanded={isModelMenuOpen} aria-label={`Select AI model. Current: ${selectedModelLabel}. Press Tab to open.`} title={`${selectedModelLabel} (Tab)`}>
                                <CurrentIcon className="h-4 w-4 flex-shrink-0" />
                                <span className={`truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{selectedModelLabel}</span>
                                <HiChevronDown className={`h-3 w-3 flex-shrink-0 opacity-70 transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            </button>
                            {isModelMenuOpen && (
                                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModelMenu} />
                                    <div className={`relative z-10 w-full max-w-md rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden border flex flex-col max-h-[85vh] ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`} role="listbox" aria-label="Choose AI model">
                                        <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-gray-700/80 bg-gray-900/40' : 'border-gray-100 bg-gray-50'}`}>
                                            <HiMagnifyingGlass className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                            <input ref={modelSearchRef} type="text" value={modelSearchQuery} onChange={(e) => setModelSearchQuery(e.target.value)} onKeyDown={handleModelSearchKeyDown} placeholder="Search models..." autoComplete="off" className={`flex-1 bg-transparent text-xs outline-none placeholder-gray-500 ${isDark ? 'text-gray-200' : 'text-gray-800'}`} aria-label="Search AI models" />
                                            {modelSearchQuery && (
                                                <button type="button" onClick={() => { setModelSearchQuery(''); modelSearchRef.current?.focus(); }} className={`flex-shrink-0 p-0.5 rounded transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`} aria-label="Clear search">
                                                    <HiXMark className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="overflow-y-auto custom-scrollbar p-2 max-h-[55vh] sm:max-h-96 space-y-1">
                                            {isSearchingModels ? (
                                                <div className="flex items-center justify-center py-5">
                                                    <HiArrowPath className="w-5 h-5 animate-spin text-gray-400" />
                                                    <span className="ml-2 text-xs text-gray-500">Searching OpenRouter...</span>
                                                </div>
                                            ) : selectableItems.length === 0 ? (
                                                <p className={`px-3 py-5 text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No models match your search</p>
                                            ) : (
                                                <>
                                                    {recentModelItems.length > 0 && (
                                                        <div className="mb-2">
                                                            <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500 bg-gray-900/50' : 'text-gray-400 bg-gray-50'}`}>Recent Models</div>
                                                            {recentModelItems.map((opt, idx) => renderModelOption(opt, idx, opt._type))}
                                                        </div>
                                                    )}
                                                    {filteredTextModels.length > 0 && (
                                                        <div className="mb-2">
                                                            <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500 bg-gray-900/50' : 'text-gray-400 bg-gray-50'}`}>Text Models</div>
                                                            {filteredTextModels.map((opt, idx) => renderModelOption(opt, recentModelItems.length + idx, 'text'))}
                                                        </div>
                                                    )}
                                                    {filteredAudioModels.length > 0 && (
                                                        <div>
                                                            <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500 bg-gray-900/50' : 'text-gray-400 bg-gray-50'}`}>Audio Models</div>
                                                            {filteredAudioModels.map((opt, idx) => renderModelOption(opt, recentModelItems.length + filteredTextModels.length + idx, 'audio'))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className={`px-3 py-2 border-t flex items-center justify-between gap-2 shrink-0 text-[10px] ${isDark ? 'border-gray-700/80 bg-gray-900/30 text-gray-600' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                                            <span className="font-mono font-bold">↑↓</span>
                                            <span>Navigate</span>
                                            <span className="font-mono font-bold">⏎</span>
                                            <span>Select</span>
                                            <span className="font-mono font-bold">Esc</span>
                                            <span>Close</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <ContextSelector value={contextLimit} onChange={setContextLimit} theme="dark" />
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