/* src/AidaWidget/ChatInput.jsx */
import React, { useState } from 'react';
import { 
    HiPaperAirplane, HiOutlineMicrophone, HiStop, HiArrowPath, HiXMark, 
    HiChevronDown, HiOutlineGlobeAlt, HiLightBulb, HiPhoto, HiChatBubbleLeftRight 
} from 'react-icons/hi2';
import AttachmentButton from './AttachmentButton';
import ContextSelector from './ContextSelector';

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
    setContextLimit
}) => {
    const [isHoveringSend, setIsHoveringSend] = useState(false);
    const [isHoveringRecord, setIsHoveringRecord] = useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [isHoveringCancel, setIsHoveringCancel] = useState(false);

    const isPillMode = autoRecordCountdown !== null || transcriptionError || isRecording || isTranscribing;

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${secs}`;
    };

    // ✅ UPDATED: Helper to get visual properties based on model category
    const getModelVisuals = (category) => {
        switch (category) {
            case 'reasoning':
                return { 
                    icon: HiLightBulb, 
                    colorClass: 'text-purple-500', 
                    bgClass: theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50',
                    borderClass: 'border-purple-500/30'
                };
            case 'vision':
                return { 
                    icon: HiPhoto, 
                    colorClass: 'text-pink-500', 
                    bgClass: theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-50',
                    borderClass: 'border-pink-500/30'
                };
            case 'chat':
            default:
                return { 
                    icon: HiChatBubbleLeftRight, 
                    colorClass: 'text-blue-500', 
                    bgClass: theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50',
                    borderClass: 'border-blue-500/30'
                };
        }
    };

    // Find current model object
    const currentModelObj = availableModels.find(m => m.value === selectedModel);
    const selectedModelLabel = currentModelObj?.label || selectedModel;
    const currentVisuals = getModelVisuals(currentModelObj?.category || 'chat');
    const CurrentIcon = currentVisuals.icon;

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
                <button type="button" onClick={onStopStreaming} className={`ml-2 p-2 rounded-full bg-[#2f3645] hover:bg-[#3a4254] ${visibilityClass}`} aria-label="Stop response generation">
                    <HiStop className="w-5 h-5 text-[#ff6bbd]" />
                </button>
            );
        }
        if (autoSendCountdown !== null) {
            return (
                <button
                    onClick={cancelAutoSendTimer} onMouseEnter={() => { setIsHoveringSend(true); setIsSendTimerPaused(true); }} onMouseLeave={() => { setIsHoveringSend(false); setIsSendTimerPaused(false); }}
                    className={`ml-2 flex items-center justify-center timer-button !w-9 !h-9 ${visibilityClass}`} style={{ animationPlayState: isHoveringSend ? 'paused' : 'running' }} aria-label="Cancel auto-send"
                >
                    {isHoveringSend ? <HiXMark className="h-5 w-5 text-white" /> : <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-bold text-base`}>{autoSendCountdown}</span>}
                </button>
            );
        }
        
        const isDisabled = isRecording || (!currentMessage.trim() && attachmentCount === 0);
        
        return (
            <button
                type="button" onClick={() => handleSendMessage()} disabled={isDisabled}
                className={`ml-2 p-2 rounded-full transition-opacity disabled:opacity-50 ${theme === 'dark' ? (isDisabled ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600') : (isDisabled ? 'bg-gray-300' : 'bg-gray-900 hover:bg-gray-700')} ${visibilityClass}`} aria-label="Send Message"
            >
                <HiPaperAirplane className={`w-5 h-5 ${isDisabled ? (theme === 'dark' ? 'text-gray-300' : 'text-gray-500') : 'text-white'}`} />
            </button>
        );
    };

    const renderRecordButton = () => {
        const pillBaseClass = "absolute right-0 z-20 flex items-center whitespace-nowrap";
        let pillContent = null;

        if (autoRecordCountdown !== null) {
            pillContent = (
                <button
                    onClick={cancelAutoRecordTimer} onMouseEnter={() => { setIsHoveringRecord(true); setIsRecordTimerPaused(true); }} onMouseLeave={() => { setIsHoveringRecord(false); setIsRecordTimerPaused(false); }}
                    className={`${pillBaseClass} justify-center record-timer-button !w-9 !h-9`} style={{ animationPlayState: isHoveringRecord ? 'paused' : 'running' }} aria-label="Cancel auto-record"
                >
                    {isHoveringRecord ? <HiXMark className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-base">{autoRecordCountdown}</span>}
                </button>
            );
        } else if (transcriptionError) {
            pillContent = (
                <div 
                    className={`${pillBaseClass} gap-1 rounded-full px-1 h-9 w-auto shadow-md transition-all duration-200 ${
                        theme === 'dark' 
                            ? 'bg-red-800' 
                            : 'bg-red-100 border border-red-200'
                    }`} 
                    title={`Error: ${transcriptionError}`}
                >
                    <button
                        onClick={onRetryTranscription}
                        className={`p-1.5 rounded-full transition-colors !w-auto !h-auto ${
                            theme === 'dark' 
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
                            theme === 'dark' 
                                ? 'text-red-300 hover:bg-red-500/30' 
                                : 'text-red-500 hover:bg-red-500/10'
                        }`}
                        aria-label="Cancel failed transcription"
                        title="Cancel"
                    >
                        <HiXMark className="h-4 w-4" />
                    </button>
                </div>
            );
        } else if (isRecording || isTranscribing) {
            const isCurrentlyRecording = isRecording;
            const isCurrentlyTranscribing = isTranscribing;
            const isCancelHover = isCurrentlyTranscribing && isHoveringCancel;
            
            const pillBgColor = isCurrentlyRecording 
                ? `bg-red-600 hover:bg-red-700 ${isNearingTimeLimit ? 'animate-pulse' : ''}`
                : isCancelHover
                    ? 'bg-red-600 hover:bg-red-700'
                    : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-900');
            
            const pillClassName = `${pillBaseClass} gap-2 !rounded-full !px-3 !py-2 !w-auto !h-auto text-white shadow-md transition-all duration-200 ${pillBgColor} ${isCurrentlyTranscribing ? 'cursor-pointer' : ''}`;

            pillContent = (
                <button
                    onClick={isCurrentlyRecording ? handleRecordButtonClick : onCancelTranscription}
                    onMouseEnter={isCurrentlyTranscribing ? () => setIsHoveringCancel(true) : undefined}
                    onMouseLeave={isCurrentlyTranscribing ? () => setIsHoveringCancel(false) : undefined}
                    className={pillClassName}
                    aria-label={
                        isCurrentlyRecording ? "Stop Recording" 
                        : isCancelHover ? "Cancel transcription"
                        : "Transcribing..."
                    }
                >
                    {isCurrentlyRecording ? (
                        <>
                            <HiStop className="h-5 w-5 flex-shrink-0" />
                            <span className="font-mono text-sm font-medium tracking-wider">{formatTime(elapsedTime)}</span>
                        </>
                    ) : (
                        <>
                            <HiArrowPath className="h-5 w-5 flex-shrink-0 animate-spin" />
                            {isCancelHover ? (
                                <span className="font-sans text-sm font-medium">Cancel</span>
                            ) : (
                                <span className="font-mono text-sm font-medium tracking-wider">{formatTime(elapsedTime)}</span>
                            )}
                        </>
                    )}
                </button>
            );
        }

        const micVisibilityClass = isPillMode ? 'invisible pointer-events-none opacity-0' : '';
        const marginClass = isPillMode ? '!ml-4' : 'ml-2';

        return (
            <>
                {pillContent}
                <button
                    onClick={handleRecordButtonClick} disabled={autoSendCountdown !== null}
                    className={`${marginClass} p-2 rounded-full text-white transition-all duration-200 disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-900 hover:bg-gray-700'} ${micVisibilityClass}`} aria-label="Start Recording"
                >
                    <HiOutlineMicrophone className="w-5 h-5" />
                </button>
            </>
        );
    };

    return (
        <div className={`relative p-2 rounded-none transition-colors ${theme === 'dark' ? 'border-t border-gray-800 bg-gray-900 text-gray-100' : 'border-t border-gray-200 bg-white text-gray-900'}`}>
            <div className={`flex items-end rounded-lg px-3 py-1 mb-2 transition-colors ${theme === 'dark' ? 'border border-gray-700 bg-gray-800' : 'border border-gray-300 bg-gray-50'}`}>
               <textarea 
                    ref={inputRef} 
                    value={currentMessage} 
                    onChange={(e) => setCurrentMessage(e.target.value)} 
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={translations.inputPlaceholder || "Type your message..."} 
                    dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'} 
                    rows={1} 
                    className={`flex-1 bg-transparent px-0 py-1 resize-none focus:outline-none custom-scrollbar overflow-y-auto whitespace-pre-wrap leading-tight ${theme === 'dark' ? 'text-gray-100 placeholder-gray-400' : ''} min-h-[32px] max-h-[200px]`} 
                    style={{ overflowY: 'auto', overflowX: 'hidden' }}
                />
            </div>
            
            <div className="flex items-center justify-between">
                <div className="relative flex items-center min-w-0 flex-1 mr-2 gap-2">
                    {features.webSearch && (
                        <button
                            type="button" onClick={() => setIsWebSearchEnabled(p => !p)}
                            className={`p-2 rounded-full disabled:opacity-50 transition-colors flex-shrink-0 ${isWebSearchEnabled ? (theme === 'dark' ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-600') : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
                            aria-pressed={isWebSearchEnabled} aria-label="Toggle web search" title="Toggle web search"
                        >
                            <HiOutlineGlobeAlt className="h-6 w-6" />
                        </button>
                    )}
                    
                    {/* Model Selector */}
                    {features.modelSelection && (
                        <div className="relative min-w-0">
                             <button
                                type="button" onClick={() => { setIsModelMenuOpen((p) => !p); }}
                                className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm disabled:opacity-50 transition-colors max-w-full border ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${currentVisuals.colorClass} ${currentVisuals.borderClass} ${currentVisuals.bgClass}`}
                                aria-haspopup="menu" aria-expanded={isModelMenuOpen} aria-label={`Select AI Model (current: ${selectedModelLabel})`} title="Select AI Model"
                            >
                                <CurrentIcon className="h-4 w-4 flex-shrink-0" />
                                <span className={`truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{selectedModelLabel}</span>
                                <HiChevronDown className={`h-3 w-3 flex-shrink-0 opacity-70 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                            </button>
                            
                            {isModelMenuOpen && (
                                <div className={`absolute z-50 left-0 bottom-full mb-2 w-56 rounded-lg shadow-xl overflow-hidden border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`} role="menu">
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                                        {availableModels.map((opt) => {
                                            const visuals = getModelVisuals(opt.category || 'chat');
                                            const Icon = visuals.icon;
                                            const isSelected = selectedModel === opt.value;
                                            
                                            return (
                                                <button 
                                                    key={opt.value} 
                                                    type="button" 
                                                    onClick={() => { setSelectedModel(opt.value); setIsModelMenuOpen(false); }}
                                                    className={`w-full text-left px-3 py-2.5 text-sm rounded-md flex items-center gap-3 transition-colors ${
                                                        isSelected 
                                                            ? (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100') 
                                                            : (theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')
                                                    }`} 
                                                    role="menuitem"
                                                >
                                                    <div className={`p-1.5 rounded-md ${visuals.bgClass} ${visuals.colorClass}`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`font-medium truncate ${isSelected ? (theme === 'dark' ? 'text-white' : 'text-gray-900') : (theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}`}>
                                                            {opt.label}
                                                        </span>
                                                        <span className="text-[10px] opacity-60 uppercase tracking-wider font-semibold">
                                                            {opt.category || 'Chat'}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
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
                        <AttachmentButton count={attachmentCount} onClick={onOpenAttachments} theme={theme}/>
                    )}
                    {features.voiceInput && renderRecordButton()}
                    {renderSendButton()}
                </div>
            </div>
        </div>
    );
};

export default ChatInput;