import React, { useRef, useState } from 'react';
import { HiPaperAirplane, HiOutlineMicrophone, HiStop, HiArrowPath, HiXMark, HiChevronDown, HiOutlineGlobeAlt } from 'react-icons/hi2';

// ✅ Single source of truth for all available models
const AVAILABLE_MODELS = [
    { value: 'deepseek/deepseek-chat-v3.1', label: 'Deepseek Chat 3.1' },
    { value: 'deepseek/deepseek-r1', label: 'Deepseek Reasoner R1'},
    { value: 'openai/gpt-4o', label: 'GPT-4.0' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini Flash 2.5' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini Pro 2.5 (reasoner)' },
    { value: 'perplexity/sonar', label: 'Perplexity Sonar'}
];

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
    translations, // Use the translations prop instead of the hook
    isEditing = false,
    cancelEdit,
    onImagesSelected,
    pendingImages = [],
    onRemovePendingImage,
    hasPendingImages = false,
    isWebSearchEnabled,
    setIsWebSearchEnabled,
    onStopStreaming,
    isDragActive = false,
}) => {
    const [isHoveringSend, setIsHoveringSend] = useState(false);
    const [isHoveringRecord, setIsHoveringRecord] = useState(false);
    const imageInputRef = useRef(null);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const attachmentsPresent = hasPendingImages || (pendingImages?.length ?? 0) > 0;

    // ✅ Get the display label from our single source of truth
    const selectedModelLabel = AVAILABLE_MODELS.find(m => m.value === selectedModel)?.label || 'Model';

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${secs}`;
    };

    const renderSendButton = () => {
        if (isLoading) {
            const stopDisabled = !onStopStreaming;
            return (
                <button
                    type="button"
                    onClick={onStopStreaming}
                    disabled={stopDisabled}
                    className={`ml-2 p-2 rounded-full transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        theme === 'dark'
                            ? 'bg-[#2f3645] hover:bg-[#3a4254] focus-visible:ring-[#ff6bbd] focus-visible:ring-offset-[#1a1f2b]'
                            : 'bg-[#2f3645] hover:bg-[#3a4254] focus-visible:ring-[#ff6bbd] focus-visible:ring-offset-[#f2f2f7]'
                    } ${stopDisabled ? '' : 'cursor-pointer'}`}
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
                    onMouseEnter={() => {
                        setIsHoveringSend(true);
                        setIsSendTimerPaused(true);
                    }}
                    onMouseLeave={() => {
                        setIsHoveringSend(false);
                        setIsSendTimerPaused(false);
                    }}
                    className="ml-2 flex items-center justify-center timer-button"
                    style={{ animationPlayState: isHoveringSend ? 'paused' : 'running' }}
                    aria-label="Cancel auto-send"
                >
                    {isHoveringSend ? (
                        <HiXMark className="h-5 w-5 text-white" />
                    ) : (
                        <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-bold text-base`}>
                            {autoSendCountdown}
                        </span>
                    )}
                </button>
            );
        }

        const isDisabled = isTranscribing || (!currentMessage.trim() && !attachmentsPresent);

        return (
            <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isDisabled}
                className={`ml-2 p-2 rounded-full transition-opacity disabled:opacity-50 ${
                    theme === 'dark'
                        ? (isDisabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600')
                        : (isDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-700')
                }`}
                aria-label="Send Message"
            >
                <HiPaperAirplane className={`w-5 h-5 ${isDisabled ? (theme === 'dark' ? 'text-gray-300' : 'text-gray-500') : 'text-white'}`} />
            </button>
        );
    };

    const renderRecordButton = () => {
        if (autoRecordCountdown !== null) {
            return (
                <button
                    onClick={cancelAutoRecordTimer}
                    onMouseEnter={() => { setIsHoveringRecord(true); setIsRecordTimerPaused(true); }}
                    onMouseLeave={() => { setIsHoveringRecord(false); setIsRecordTimerPaused(false); }}
                    className="ml-2 flex items-center justify-center record-timer-button"
                    style={{ animationPlayState: isHoveringRecord ? 'paused' : 'running' }}
                    aria-label="Cancel auto-record"
                >
                    {isHoveringRecord ? <HiXMark className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-base">{autoRecordCountdown}</span>}
                </button>
            );
        }

        return (
            <button
                onClick={handleRecordButtonClick}
                disabled={isTranscribing || autoSendCountdown !== null}
                className={`ml-2 p-2 rounded-full text-white transition-opacity disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-900 hover:bg-gray-700'}`}
                aria-label={isRecording ? "Stop Recording" : "Start Recording"}
            >
                {isTranscribing ? <HiArrowPath className="w-5 h-5 animate-spin" /> : isRecording ? <HiStop className="w-5 h-5 text-red-500" /> : <HiOutlineMicrophone className="w-5 h-5" />}
            </button>
        );
    };

    const renderImageButton = () => (
        <>
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length && onImagesSelected) onImagesSelected(files);
                    // Allow re-selecting the same file
                    e.target.value = '';
                }}
            />
            <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isTranscribing || isEditing}
                className={`ml-2 p-2 rounded-full text-white transition-opacity disabled:opacity-50 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-900 hover:bg-gray-700'}`}
                aria-label="Add image"
                title="Add image"
            >
                {/* Icon only (no inner square), sized to match other buttons */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 16l4.5-4.5 3.2 3.2 3.8-4.6 4.5 5.9" />
                    <circle cx="9.2" cy="8.8" r="1.4" fill="currentColor" />
                </svg>
            </button>
        </>
    );

    return (
        <div className={`relative p-4 rounded-none transition-colors ${theme === 'dark' ? 'border-t border-gray-800 bg-gray-900 text-gray-100' : 'border-t border-gray-200 bg-white text-gray-900'}`}>
            {isEditing && (
                <div className="mb-2 -mt-1 flex items-center justify-between rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-amber-800 text-sm">
                    <span>Editing message — press Enter to save</span>
                    <button onClick={cancelEdit} className="flex items-center gap-1 text-amber-800 hover:text-amber-900" aria-label="Cancel edit">
                        <HiXMark className="h-4 w-4" />
                        Cancel
                    </button>
                </div>
            )}
            {/* Selected image previews */}
            {pendingImages.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {pendingImages.map(img => (
                        <div key={img.id} className="relative w-16 h-16 shrink-0">
                            <div className="w-full h-full border border-gray-200 rounded-md overflow-hidden">
                                <img src={img.src} alt={img.name || 'upload'} className="w-full h-full object-cover" />
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemovePendingImage && onRemovePendingImage(img.id)}
                                className="absolute top-1 right-1 z-10 bg-white border border-gray-300 rounded-full p-0.5 shadow hover:bg-gray-50"
                                aria-label="Remove image"
                                title="Remove image"
                            >
                                <HiXMark className="w-4 h-4 text-gray-700" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Text Input Area */}
            <div
                className={`flex items-end rounded-lg px-3 py-1 mb-3 transition-colors ${
                    theme === 'dark'
                        ? (isDragActive ? 'border border-pink-400/80 bg-gray-800 ring-2 ring-pink-400/40' : 'border border-gray-700 bg-gray-800')
                        : (isDragActive ? 'border border-pink-500/80 bg-pink-50 ring-2 ring-pink-500/40' : 'border border-gray-300 bg-gray-50')
                }`}
            >
                {isRecording ? (
                    <div className="flex-1 flex items-center justify-center text-red-500 font-mono text-lg space-x-3 h-[42px]">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span>{formatTime(elapsedTime)}</span>
                    </div>
                ) : (
                   <textarea
    ref={inputRef}
    value={currentMessage}
    onChange={(e) => setCurrentMessage(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder={isEditing ? "Edit your message..." : isTranscribing ? translations.transcribing : (translations.inputPlaceholder || "Type your message...")}
    disabled={isTranscribing}
    dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'}
    rows={1}
    className={`flex-1 bg-transparent px-0 py-2 resize-none focus:outline-none custom-scrollbar
        overflow-y-auto whitespace-pre-wrap leading-tight
        ${theme === 'dark' ? 'text-gray-100 placeholder-gray-400' : ''}
        min-h-[42px] max-h-[200px]`}
    style={{
        overflowY: 'auto',
        overflowX: 'hidden',
    }}
/>
                )}
            </div>

            {isDragActive && (
                <div className={`-mt-2 mb-3 flex items-center gap-2 text-xs font-medium ${theme === 'dark' ? 'text-pink-200' : 'text-pink-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M4 12l3-3 2.2 2.2L12.2 7 16 12" />
                        <circle cx="7.5" cy="6.5" r="1.1" fill="currentColor" />
                    </svg>
                    <span>Release to attach your images</span>
                </div>
            )}
            
            {/* Toolbar for controls */}
            <div className="flex items-center justify-between">
                {/* Left side: Model selection and Web Search */}
                <div className="relative flex items-center">
                    {/* ✅ NEW Web Search Button */}
                    <button
                        type="button"
                        onClick={() => setIsWebSearchEnabled(p => !p)}
                        disabled={isRecording || isTranscribing}
                        className={`p-2 rounded-full disabled:opacity-50 ml-2 transition-colors ${
                            isWebSearchEnabled 
                                ? (theme === 'dark' ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-600')
                                : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                        }`}
                        aria-pressed={isWebSearchEnabled}
                        aria-label="Toggle web search"
                        title="Toggle web search"
                    >
                        <HiOutlineGlobeAlt className="h-6 w-6" />
                    </button>
                    <div className="relative ml-2">
                        <button
                            type="button"
                            onClick={() => setIsModelMenuOpen((p) => !p)}
                            disabled={isRecording || isTranscribing}
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm disabled:opacity-50 transition-colors ${
                                theme === 'dark'
                                    ? 'text-gray-200 hover:bg-gray-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            aria-haspopup="menu"
                            aria-expanded={isModelMenuOpen}
                            aria-label={`Select AI Model (current: ${selectedModelLabel})`}
                            title="Select AI Model"
                        >
                            <span className="truncate max-w-[96px]">
                                {selectedModelLabel}
                            </span>
                            <HiChevronDown className="h-4 w-4" />
                        </button>
                        {isModelMenuOpen && (
                            <div
                                className={`absolute z-50 left-0 bottom-full mb-2 w-48 rounded-md shadow-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border border-gray-700 text-gray-100' : 'bg-white border border-gray-200 text-gray-900'}`}
                                role="menu"
                            >
                                {/* ✅ Render the menu from our single source of truth */}
                                {AVAILABLE_MODELS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => { setSelectedModel(opt.value); setIsModelMenuOpen(false); }}
                                        className={`w-full text-left px-3 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${selectedModel === opt.value ? (theme === 'dark' ? 'bg-gray-700 font-medium' : 'bg-gray-100 font-medium') : ''}`}
                                        role="menuitem"
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: Action Buttons */}
                <div className="flex items-center chat-action-buttons">
                    {renderImageButton()}
                    {renderRecordButton()}
                    {renderSendButton()}
                </div>
            </div>
        </div>
    );
};

export default ChatInput;
