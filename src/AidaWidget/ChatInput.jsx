import React, { useState } from 'react';
import { HiPaperAirplane, HiOutlineMicrophone, HiStop, HiArrowPath, HiXMark, HiCpuChip } from 'react-icons/hi2';
import { useTranslation } from 'react-i18next';

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
    setSelectedModel
}) => {
    const { t } = useTranslation();
    const [isHoveringSend, setIsHoveringSend] = useState(false);
    const [isHoveringRecord, setIsHoveringRecord] = useState(false);

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

    const isDisabled = isLoading || isTranscribing || !currentMessage.trim();

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

    return (
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
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
                        placeholder={isTranscribing ? t('chat.transcribing') : (t('chat.inputPlaceholder') || "Type your message...")}
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
                    {renderRecordButton()}
                    {renderSendButton()}
                </div>
            </div>
        </div>
    );
};

export default ChatInput;