import React, { useRef, useState } from 'react';
import { HiPaperAirplane, HiOutlineMicrophone, HiStop, HiArrowPath, HiXMark, HiCpuChip } from 'react-icons/hi2';

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
    hasPendingImages = false
}) => {
    const [isHoveringSend, setIsHoveringSend] = useState(false);
    const [isHoveringRecord, setIsHoveringRecord] = useState(false);
    const imageInputRef = useRef(null);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${secs}`;
    };

    const renderSendButton = () => {
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
                        <span className="text-gray-900 font-bold text-base">
                            {autoSendCountdown}
                        </span>
                    )}
                </button>
            );
        }

        const isDisabled = isLoading || isTranscribing || (!currentMessage.trim() && !hasPendingImages);

        return (
            <button
                onClick={handleSendMessage}
                disabled={isDisabled}
                className={`ml-2 p-2 rounded-full transition-opacity disabled:opacity-50 ${
                    isDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-700'
                }`}
                aria-label="Send Message"
            >
                <HiPaperAirplane className={`w-5 h-5 ${isDisabled ? 'text-gray-500' : 'text-white'}`} />
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
                    {isHoveringRecord ? <HiXMark className="h-5 w-5 text-white" /> : <span className="text-gray-900 font-bold text-base">{autoRecordCountdown}</span>}
                </button>
            );
        }

        return (
            <button
                onClick={handleRecordButtonClick}
                disabled={isLoading || isTranscribing || autoSendCountdown !== null}
                className="ml-2 p-2 rounded-full bg-gray-900 text-white transition-opacity disabled:opacity-50"
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
                disabled={isLoading || isTranscribing || isEditing}
                className="ml-2 p-2 rounded-full bg-gray-900 text-white transition-opacity hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center"
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
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
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
                <div className="mb-2 flex flex-wrap gap-2">
                    {pendingImages.map(img => (
                        <div key={img.id} className="relative w-16 h-16 border border-gray-200 rounded-md overflow-hidden">
                            <img src={img.src} alt={img.name || 'upload'} className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => onRemovePendingImage && onRemovePendingImage(img.id)}
                                className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-0.5 shadow hover:bg-gray-50"
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
            <div className="flex items-end rounded-lg border border-gray-300 bg-gray-50 px-3 py-1 mb-3">
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
                        disabled={isLoading || isTranscribing}
                        dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'}
                        rows={1}
                        className="flex-1 bg-transparent px-0 py-2 resize-none focus:outline-none max-h-40 overflow-y-auto whitespace-pre-wrap leading-tight auto-expand"
                    />
                )}
            </div>
            
            {/* Toolbar for controls */}
            <div className="flex items-center justify-between">
                {/* Left side: Model selector */}
                <div className="flex items-center">
                    <HiCpuChip className="h-6 w-6 text-gray-500 mr-2" aria-hidden="true" />
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isLoading || isRecording || isTranscribing}
                        className="model-selector"
                        aria-label="Select AI Model"
                    >
                        <option value="openai/gpt-4o">GPT-4.0</option>
                        <option value="google/gemini-flash-1.5">Gemini Flash</option>
                        <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (Thinking)</option>
                    </select>
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
