/* src/AidaWidget/ChatInput.jsx */
import React, { useState } from 'react';
import { HiPaperAirplane, HiOutlineMicrophone, HiStop, HiArrowPath, HiXMark, HiChevronDown, HiOutlineGlobeAlt } from 'react-icons/hi2';
import AttachmentButton from './AttachmentButton';

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
    translations,
    isEditing = false,
    cancelEdit,
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
    // ✨ ADDED: New prop for time limit warning
    isNearingTimeLimit,
}) => {
    const [isHoveringSend, setIsHoveringSend] = useState(false);
    const [isHoveringRecord, setIsHoveringRecord] = useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [isHoveringCancel, setIsHoveringCancel] = useState(false);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${secs}`;
    };

    const selectedModelLabel = AVAILABLE_MODELS.find(m => m.value === selectedModel)?.label || selectedModel;

    const renderSendButton = () => {
        if (isLoading) {
            return (
                <button type="button" onClick={onStopStreaming} className={`ml-2 p-2 rounded-full bg-[#2f3645] hover:bg-[#3a4254]`} aria-label="Stop response generation">
                    <HiStop className="w-5 h-5 text-[#ff6bbd]" />
                </button>
            );
        }
        if (autoSendCountdown !== null) {
            return (
                <button
                    onClick={cancelAutoSendTimer} onMouseEnter={() => { setIsHoveringSend(true); setIsSendTimerPaused(true); }} onMouseLeave={() => { setIsHoveringSend(false); setIsSendTimerPaused(false); }}
                    className="ml-2 flex items-center justify-center timer-button" style={{ animationPlayState: isHoveringSend ? 'paused' : 'running' }} aria-label="Cancel auto-send"
                >
                    {isHoveringSend ? <HiXMark className="h-5 w-5 text-white" /> : <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-bold text-base`}>{autoSendCountdown}</span>}
                </button>
            );
        }
        const isDisabled = isRecording || isTranscribing || (!currentMessage.trim() && attachmentCount === 0);
        return (
            <button
                type="button" onClick={() => handleSendMessage()} disabled={isDisabled}
                className={`ml-2 p-2 rounded-full transition-opacity disabled:opacity-50 ${theme === 'dark' ? (isDisabled ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600') : (isDisabled ? 'bg-gray-300' : 'bg-gray-900 hover:bg-gray-700')}`} aria-label="Send Message"
            >
                <HiPaperAirplane className={`w-5 h-5 ${isDisabled ? (theme === 'dark' ? 'text-gray-300' : 'text-gray-500') : 'text-white'}`} />
            </button>
        );
    };

    const renderRecordButton = () => {
        if (autoRecordCountdown !== null) {
            return (
                <button
                    onClick={cancelAutoRecordTimer} onMouseEnter={() => { setIsHoveringRecord(true); setIsRecordTimerPaused(true); }} onMouseLeave={() => { setIsHoveringRecord(false); setIsRecordTimerPaused(false); }}
                    className="ml-2 flex items-center justify-center record-timer-button" style={{ animationPlayState: isHoveringRecord ? 'paused' : 'running' }} aria-label="Cancel auto-record"
                >
                    {isHoveringRecord ? <HiXMark className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-base">{autoRecordCountdown}</span>}
                </button>
            );
        }

        if (transcriptionError) {
            return (
                <div 
                    className={`ml-2 flex items-center gap-1 rounded-full px-1 h-9 w-auto shadow-md transition-all duration-200 ${
                        theme === 'dark' 
                            ? 'bg-red-800' 
                            : 'bg-red-100 border border-red-200'
                    }`} 
                    title={`Error: ${transcriptionError}`}
                >
                    {/* Retry Button */}
                    <button
                        onClick={onRetryTranscription}
                        className={`p-1.5 rounded-full transition-colors ${
                            theme === 'dark' 
                                ? 'bg-slate-800 hover:bg-slate-700 text-gray-100' 
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                        aria-label="Retry transcription"
                        title="Retry"
                    >
                        <HiArrowPath className="h-4 w-4" />
                    </button>
                    {/* Cancel Button */}
                    <button
                        onClick={onClearFailedTranscription}
                        className={`p-1.5 rounded-full transition-colors ${
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
        }

        if (isRecording || isTranscribing) {
            const isCurrentlyRecording = isRecording;
            const isCurrentlyTranscribing = isTranscribing;
            const isCancelHover = isCurrentlyTranscribing && isHoveringCancel;
            
            // ✨ MODIFIED: Add animate-pulse class when nearing time limit
            const pillBgColor = isCurrentlyRecording 
                ? `bg-red-600 hover:bg-red-700 ${isNearingTimeLimit ? 'animate-pulse' : ''}`
                : isCancelHover
                    ? 'bg-red-600 hover:bg-red-700'
                    : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-900');
            
            const pillClassName = `ml-2 flex items-center gap-2 rounded-full px-3 py-2 text-white shadow-md transition-all duration-200 ${pillBgColor} ${isCurrentlyTranscribing ? 'cursor-pointer' : ''}`;

            return (
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
                    ) : ( // This block now handles all `isTranscribing` cases
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

        return (
            <button
                onClick={handleRecordButtonClick} disabled={autoSendCountdown !== null}
                className={`ml-2 p-2 rounded-full text-white transition-opacity disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-900 hover:bg-gray-700'}`} aria-label="Start Recording"
            >
                <HiOutlineMicrophone className="w-5 h-5" />
            </button>
        );
    };

    return (
        <div className={`relative p-4 rounded-none transition-colors ${theme === 'dark' ? 'border-t border-gray-800 bg-gray-900 text-gray-100' : 'border-t border-gray-200 bg-white text-gray-900'}`}>
            {isEditing && (
                <div className="mb-2 -mt-1 flex items-center justify-between rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-amber-800 text-sm">
                    <span>Editing message — press Enter to save</span>
                    <button onClick={cancelEdit} className="flex items-center gap-1 text-amber-800 hover:text-amber-900" aria-label="Cancel edit">
                        <HiXMark className="h-4 w-4" /> Cancel
                    </button>
                </div>
            )}
            <div className={`flex items-end rounded-lg px-3 py-1 mb-3 transition-colors ${theme === 'dark' ? 'border border-gray-700 bg-gray-800' : 'border border-gray-300 bg-gray-50'}`}>
               <textarea ref={inputRef} value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder={isEditing ? "Edit your message..." : isTranscribing ? translations.transcribing : (translations.inputPlaceholder || "Type your message...")} disabled={isTranscribing} dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'} rows={1} className={`flex-1 bg-transparent px-0 py-2 resize-none focus:outline-none custom-scrollbar overflow-y-auto whitespace-pre-wrap leading-tight ${theme === 'dark' ? 'text-gray-100 placeholder-gray-400' : ''} min-h-[42px] max-h-[200px]`} style={{ overflowY: 'auto', overflowX: 'hidden' }}/>
            </div>
            
            <div className="flex items-center justify-between">
                <div className="relative flex items-center">
                    {features.webSearch && (
                        <button
                            type="button" onClick={() => setIsWebSearchEnabled(p => !p)} disabled={isTranscribing}
                            className={`p-2 rounded-full disabled:opacity-50 ml-2 transition-colors ${isWebSearchEnabled ? (theme === 'dark' ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-600') : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
                            aria-pressed={isWebSearchEnabled} aria-label="Toggle web search" title="Toggle web search"
                        >
                            <HiOutlineGlobeAlt className="h-6 w-6" />
                        </button>
                    )}
                    {features.modelSelection && (
                        <div className="relative ml-2">
                             <button
                                type="button" onClick={() => setIsModelMenuOpen((p) => !p)} disabled={isTranscribing}
                                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm disabled:opacity-50 transition-colors ${theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                                aria-haspopup="menu" aria-expanded={isModelMenuOpen} aria-label={`Select AI Model (current: ${selectedModelLabel})`} title="Select AI Model"
                            >
                                <span className="truncate max-w-[96px]">{selectedModelLabel}</span>
                                <HiChevronDown className="h-4 w-4" />
                            </button>
                            {isModelMenuOpen && (
                                <div className={`absolute z-50 left-0 bottom-full mb-2 w-48 rounded-md shadow-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border border-gray-700 text-gray-100' : 'bg-white border border-gray-200 text-gray-900'}`} role="menu">
                                    {AVAILABLE_MODELS.map((opt) => (
                                        <button key={opt.value} type="button" onClick={() => { setSelectedModel(opt.value); setIsModelMenuOpen(false); }}
                                            className={`w-full text-left px-3 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${selectedModel === opt.value ? (theme === 'dark' ? 'bg-gray-700 font-medium' : 'bg-gray-100 font-medium') : ''}`} role="menuitem"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center chat-action-buttons">
                    {features.imageUpload && (
                        <AttachmentButton count={attachmentCount} onClick={onOpenAttachments} disabled={isTranscribing || isEditing} theme={theme}/>
                    )}
                    {features.voiceInput && renderRecordButton()}
                    {renderSendButton()}
                </div>
            </div>
        </div>
    );
};

export default ChatInput;