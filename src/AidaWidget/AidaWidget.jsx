import React, { useState, useEffect, useCallback, useRef } from 'react';
import SevenSegmentDisplay from './SevenSegmentDisplay';
import ChatHeader from './ChatHeader';
import ChatHistoryPanel from './ChatHistoryPanel';
import ChatDisplay from './ChatDisplay';
import ChatInput from './ChatInput';
import './AidaWidget.css';

// Import all our new custom hooks from the barrel file
import {
    useWidgetState,
    useModal,
    useChatMessages,
    useResizableSidebar,
    useChatHistory,
    useChatAPI,
    useVoiceInput,
    useCountdown,
    useAttachments,
    useDisplayAnimation, // ✅ 1. Import the new hook
} from './hooks';

import { CHAT_URL, TRANSCRIPTION_URL } from './utils/apiConfig';

const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

const isImageFile = (file) => {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    return typeof file.name === 'string' && IMAGE_FILE_PATTERN.test(file.name);
};

const eventContainsImageFiles = (event) => {
    const dataTransfer = event?.dataTransfer;
    if (!dataTransfer) return false;

    if (dataTransfer.items && dataTransfer.items.length > 0) {
        for (let i = 0; i < dataTransfer.items.length; i += 1) {
            const item = dataTransfer.items[i];
            if (item.kind !== 'file') continue;
            if (!item.type || item.type.startsWith('image/')) return true;
        }
    }

    if (dataTransfer.files && dataTransfer.files.length > 0) {
        for (const file of Array.from(dataTransfer.files)) {
            if (isImageFile(file)) return true;
        }
    }

    return false;
};

// Default props, now including the feature flags object
const defaultProps = {
    apiConfig: { chatUrl: CHAT_URL, transcriptionUrl: TRANSCRIPTION_URL },
    language: 'en',
    translations: { transcribing: 'Transcribing...', inputPlaceholder: 'Type a message to Aida...' },
    user: {},
    pageContext: {},
    features: {
        resizable: true,
        modelSelection: true,
        voiceInput: true,
        webSearch: true,
        imageUpload: true,
        retryMessage: true,
        customInstructions: true,
        historyProjects: true,
    }
};

const AidaWidget = (props) => {
    // --- 1. SETUP: Props, Config, and Component-level State ---
    const { apiConfig, user, language, translations, pageContext, features } = { ...defaultProps, ...props };
    const imageUploadEnabled = Boolean(features?.imageUpload);

    // State that is local to this component and passed into hooks
    const [currentMessage, setCurrentMessage] = useState('');
    const [selectedModel, setSelectedModel] = useState('deepseek/deepseek-chat-v3.1');
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [customPrompt, setCustomPrompt] = useState(() => localStorage.getItem('aida-widget-prompt') || '');
    const [promptDraft, setPromptDraft] = useState('');
    const [imagePreviewSrc, setImagePreviewSrc] = useState(null);
    const inputRef = useRef(null);
    const autoMobileFullscreenRef = useRef(false);
    const previousDesktopFullscreenRef = useRef(false);
    const viewportRafRef = useRef({ enter: null, settle: null });
    const dragCounterRef = useRef(0);
    const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
    const siteLanguage = language || 'en';
    const [isDragOverWidget, setIsDragOverWidget] = useState(false);

    // --- 2. HOOKS: Call our custom hooks to manage state & logic ---

    // UI & Data State Hooks
    const { isOpen, isClosing, isFullscreen, theme, setTheme, setIsFullscreen, toggleChatVisibility } = useWidgetState();
    const { messages, setMessages, getSanitizedMessages } = useChatMessages();
    const { isPanelOpen, openPanel, closePanel, historyItems, projects, currentSessionId, setCurrentSessionId, createNewSession, updateCurrentSession, saveCurrentChatToHistory, historyHandlers } = useChatHistory(getSanitizedMessages);
    const { isOpen: isPromptModalOpen, open: openPromptModal, close: closePromptModal } = useModal();
    const { isOpen: isImagePreviewOpen, open: openImagePreview, close: closeImagePreview } = useModal();
    const { pendingImages, handleImagesSelected, removePendingImage, clearPendingImages } = useAttachments(setSelectedModel);
    const requestFullscreen = useCallback(() => setIsFullscreen(true), [setIsFullscreen]);

    const { sidebarRef, sidebarInlineStyle, resizeHandleProps, isResizing } = useResizableSidebar({
        isOpen,
        isFullscreen,
        isMobileViewport,
        isEnabled: features.resizable,
        onRequestFullscreen: requestFullscreen
    });

    // Interaction & API Hooks
    const { isLoading, lastCost, streamResponse, stopStreaming } = useChatAPI({ apiConfig, messages, setMessages, currentSessionId, updateCurrentSession, user, pageContext, customPrompt });
    const { isRecording, isTranscribing, elapsedTime, startRecording, stopRecording, lastInputWasVoiceRef } = useVoiceInput({ transcriptionUrl: apiConfig.transcriptionUrl, onTranscriptionComplete: (text) => { setCurrentMessage(p => p.trim() ? `${p} ${text}` : text); if (text) startAutoSendTimer(); } });
    const { countdown: autoSendCountdown, start: startAutoSendTimer, cancel: cancelAutoSendTimer, setIsPaused: setIsSendTimerPaused } = useCountdown(() => stableHandleSendMessage(), 3);
    const { countdown: autoRecordCountdown, start: startAutoRecordTimer, cancel: cancelAutoRecordTimer, setIsPaused: setIsRecordTimerPaused } = useCountdown(startRecording, 3);
    
    // ✅ 2. Use the new hook to get the display text string
    const displayText = useDisplayAnimation({ isOpen, isLoading });

    // Drag and drop support for image attachments
    const handleWidgetDragEnter = useCallback((event) => {
        if (!imageUploadEnabled || !eventContainsImageFiles(event)) return;
        event.preventDefault();
        dragCounterRef.current += 1;
        setIsDragOverWidget(true);
    }, [imageUploadEnabled]);

    const handleWidgetDragOver = useCallback((event) => {
        if (!imageUploadEnabled) return;
        const hasImage = eventContainsImageFiles(event);
        if (!isDragOverWidget && !hasImage) return;
        event.preventDefault();
        if (!isDragOverWidget && hasImage) {
            dragCounterRef.current = Math.max(dragCounterRef.current, 1);
            setIsDragOverWidget(true);
        }
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }, [imageUploadEnabled, isDragOverWidget]);

    const handleWidgetDragLeave = useCallback((event) => {
        if (!imageUploadEnabled || !isDragOverWidget) return;
        event.preventDefault();
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) {
            setIsDragOverWidget(false);
        }
    }, [imageUploadEnabled, isDragOverWidget]);

    const handleWidgetDrop = useCallback((event) => {
        if (!imageUploadEnabled) return;
        if (!isDragOverWidget && !eventContainsImageFiles(event)) return;
        event.preventDefault();
        const droppedFiles = Array.from(event.dataTransfer?.files || []).filter(isImageFile);
        if (droppedFiles.length > 0) {
            handleImagesSelected(droppedFiles);
        }
        dragCounterRef.current = 0;
        setIsDragOverWidget(false);
    }, [handleImagesSelected, imageUploadEnabled, isDragOverWidget]);

    // --- 3. ORCHESTRATION: Callbacks that coordinate multiple hooks ---

    const getLocalizedGreeting = (lang) => {
        switch (lang) {
            case 'ar': return "✨ مرحبًا! أنا آيدا، مساعدتك الرقمية الذكية 🤖💖 كيف يمكنني مساعدتك اليوم؟ 😊";
            case 'fr': return "👋 Coucou ! Moi c’est Aida, ta super assistante numérique ✨💻 Comment puis-je t’aider aujourd’hui ? 😄";
            default: return "Hey hey! 👋 I'm Aida, your sparkly smart digital assistant 🤖💖 How can I help you today? 😄";
        }
    };

    // This wraps the hook's visibility toggle with cleanup logic.
    const toggleChat = useCallback(() => {
        if (isOpen) { // Logic for closing
            cancelAutoSendTimer();
            cancelAutoRecordTimer();
            if (isRecording) stopRecording();
            if (isLoading) stopStreaming();
        } else { // Logic for opening
            if (messages.length === 0) {
                setMessages([{ id: `bot-${Date.now()}`, text: getLocalizedGreeting(siteLanguage), sender: 'bot' }]);
            }
        }
        toggleChatVisibility();
    }, [isOpen, isRecording, isLoading, messages.length, siteLanguage, stopRecording, stopStreaming, toggleChatVisibility, setMessages, cancelAutoSendTimer, cancelAutoRecordTimer]);

    const handleRecordButtonClick = useCallback(() => {
        if (isLoading || isTranscribing) return;
        cancelAutoRecordTimer(); // Always cancel any pending auto-record timer
        isRecording ? stopRecording() : startRecording();
    }, [isRecording, isLoading, isTranscribing, stopRecording, startRecording, cancelAutoRecordTimer]);

    // This constructs the message payload and calls the API hook.
    const stableHandleSendMessage = useCallback(async (messageTextOverride = null) => {
        const text = messageTextOverride ?? currentMessage;
        if ((!text.trim() && pendingImages.length === 0) || isLoading) return;

        cancelAutoSendTimer();
        cancelAutoRecordTimer();

        let userMessage;
        let historyForPayload;
        const botMessageId = `bot-${Date.now()}`;
        const finalModelName = isWebSearchEnabled ? `${selectedModel}:online` : selectedModel;

        if (editingMessageId) {
            const idx = messages.findIndex(m => m.id === editingMessageId);
            if (idx === -1) return;
            userMessage = { ...messages[idx], text: text.trim(), edited: true, model: finalModelName };
            historyForPayload = messages.slice(0, idx);
            setMessages([...historyForPayload, userMessage, { id: botMessageId, text: '', sender: 'bot' }]);
        } else {
            if (!currentSessionId) createNewSession([]);
            userMessage = { id: `user-${Date.now()}`, sender: 'user', text: text.trim(), images: pendingImages, model: finalModelName, webSearchEnabled: isWebSearchEnabled };
            historyForPayload = messages;
            setMessages(prev => [...prev, userMessage, { id: botMessageId, sender: 'bot', text: '' }]);
        }

        // Cleanup component state
        setCurrentMessage('');
        clearPendingImages();
        setEditingMessageId(null);
        if (isWebSearchEnabled) setIsWebSearchEnabled(false);

        // Delegate to the API hook
        await streamResponse({ userMessage, botMessageId, historyForPayload });

    }, [currentMessage, pendingImages, isLoading, editingMessageId, selectedModel, isWebSearchEnabled, messages, currentSessionId, streamResponse, setMessages, setCurrentMessage, clearPendingImages, createNewSession, cancelAutoSendTimer, cancelAutoRecordTimer]);

    const handleRetry = useCallback(async (botMessageId) => {
        if (isLoading) return;
        const botIndex = messages.findIndex(m => m.id === botMessageId);
        if (botIndex === -1) return;

        let userIndex = -1;
        for (let i = botIndex - 1; i >= 0; i--) {
            if (messages[i].sender === 'user' && (messages[i].text || messages[i].images?.length > 0)) { userIndex = i; break; }
        }
        if (userIndex === -1) return;

        const userMessage = { ...messages[userIndex], model: isWebSearchEnabled ? `${selectedModel}:online` : selectedModel };
        const historyForPayload = messages.slice(0, userIndex);
        const newBotMessageId = `bot-${Date.now()}`;

        setMessages([...historyForPayload, userMessage, { id: newBotMessageId, sender: 'bot', text: '' }]);
        await streamResponse({ userMessage, botMessageId: newBotMessageId, historyForPayload });
    }, [isLoading, messages, streamResponse, setMessages, selectedModel, isWebSearchEnabled]);


    // --- 4. EFFECTS: For DOM interaction and multi-hook coordination ---
    useEffect(() => {
        if (isOpen && !isLoading && !isTranscribing) inputRef.current?.focus();
    }, [isOpen, isLoading, isTranscribing]);

    useEffect(() => { // Auto-expand textarea
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'; // Reset height
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [currentMessage]);

    useEffect(() => { // Update mobile viewport status
        const handleResize = () => setIsMobileViewport(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const cancelPendingAnimation = () => {
            const { enter, settle } = viewportRafRef.current || {};
            if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
                if (enter) window.cancelAnimationFrame(enter);
                if (settle) window.cancelAnimationFrame(settle);
            }
            viewportRafRef.current = { enter: null, settle: null };
        };

        if (!isOpen) {
            cancelPendingAnimation();
            autoMobileFullscreenRef.current = false;
            return undefined;
        }

        const applyViewportState = () => {
            if (isMobileViewport) {
                if (!autoMobileFullscreenRef.current) {
                    autoMobileFullscreenRef.current = true;
                    previousDesktopFullscreenRef.current = isFullscreen;
                    if (!isFullscreen) {
                        setIsFullscreen(true);
                    }
                }
            } else if (autoMobileFullscreenRef.current) {
                autoMobileFullscreenRef.current = false;
                if (isFullscreen !== previousDesktopFullscreenRef.current) {
                    setIsFullscreen(previousDesktopFullscreenRef.current);
                }
            }
        };

        cancelPendingAnimation();

        if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
            applyViewportState();
            return undefined;
        }

        viewportRafRef.current.enter = window.requestAnimationFrame(() => {
            viewportRafRef.current.settle = window.requestAnimationFrame(() => {
                applyViewportState();
                viewportRafRef.current = { enter: null, settle: null };
            });
        });

        return cancelPendingAnimation;
    }, [isMobileViewport, isOpen, isFullscreen, setIsFullscreen]);

    // --- 5. RENDER ---
    const containerClasses = `flex flex-col relative aida-widget-shell ${isClosing ? 'animate-collapse-chat' : 'animate-expand-chat'} ${isResizing ? 'aida-widget-shell--active' : ''} ${theme === 'dark' ? 'bg-gray-900 text-gray-100 border-l border-gray-800' : 'bg-white text-gray-900 border-l border-gray-200'} ${isFullscreen ? 'w-full h-full aida-widget-shell--fullscreen' : 'h-full aida-widget-shell--docked'}`;

    return (
        <>
            {!isOpen && (
                <div className="aida-widget-launcher fixed z-50">
                    <button onClick={toggleChat} className="bg-gray-900 text-white rounded-lg p-2 flex">
                        {/* ✅ 3. Use the hook's return value */}
                        <div className="compact-lcd"><SevenSegmentDisplay text={displayText} className="animate-lcd-pulse" /></div>
                    </button>
                </div>
            )}

            {isOpen && (
                <div className={`aida-widget-viewport z-50 ${isFullscreen ? 'aida-widget-viewport--fullscreen' : 'aida-widget-viewport--docked'}`}>
                    <div
                        ref={sidebarRef}
                        data-theme={theme}
                        style={sidebarInlineStyle}
                        className={containerClasses}
                        onDragEnter={handleWidgetDragEnter}
                        onDragOver={handleWidgetDragOver}
                        onDragLeave={handleWidgetDragLeave}
                        onDrop={handleWidgetDrop}
                    >
                        {features.resizable && !isFullscreen && !isMobileViewport && <div {...resizeHandleProps} />}

                        {imageUploadEnabled && isDragOverWidget && (
                            <div className="absolute inset-0 z-[55] pointer-events-none flex items-center justify-center px-4">
                                <div
                                    className={`pointer-events-none flex max-w-sm flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-5 text-sm font-medium ${
                                        theme === 'dark'
                                            ? 'border-pink-400/80 bg-gray-900/80 text-pink-100'
                                            : 'border-pink-500/60 bg-white/80 text-pink-600'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6">
                                        <path d="M4 16l4.5-4.5 3.2 3.2 3.8-4.6 4.5 5.9" />
                                        <circle cx="9.2" cy="8.8" r="1.4" fill="currentColor" />
                                        <path d="M21 17.5V8a3 3 0 00-3-3h-1.5" strokeLinecap="round" />
                                        <path d="M3 12V8a3 3 0 013-3h6" strokeLinecap="round" />
                                    </svg>
                                    <span>Drop images to attach</span>
                                </div>
                            </div>
                        )}

                        {/* ✅ 3. Use the hook's return value here too */}
                        <ChatHeader displayText={displayText} lastCost={lastCost} userId={user?.id} resetChat={() => { saveCurrentChatToHistory(); setMessages([]); setCurrentSessionId(null); }} toggleFullscreen={() => setIsFullscreen(p => !p)} showFullscreenToggle={!isMobileViewport} isMobileViewport={isMobileViewport} toggleChat={toggleChat} theme={theme} onToggleTheme={() => setTheme(p => p === 'dark' ? 'light' : 'dark')} onToggleHistory={openPanel} onDisplayClick={features.customInstructions ? openPromptModal : undefined} />

                        {features.historyProjects && <ChatHistoryPanel theme={theme} open={isPanelOpen} onClose={closePanel} sessions={historyItems} projects={projects} onSelect={(s) => { setMessages(s.messages || []); setCurrentSessionId(s.id); closePanel(); }} {...historyHandlers} />}

                        <ChatDisplay messages={messages} isLoading={isLoading} siteLanguage={siteLanguage} theme={theme} onStartEdit={(id, text) => { setCurrentMessage(text); setEditingMessageId(id); inputRef.current?.focus(); }} onImagePreview={(img) => { setImagePreviewSrc(img); openImagePreview(); }} onRetryBotMessage={features.retryMessage ? handleRetry : undefined} />

                        <ChatInput currentMessage={currentMessage} setCurrentMessage={(text) => { lastInputWasVoiceRef.current = false; cancelAutoSendTimer(); cancelAutoRecordTimer(); setCurrentMessage(text); }} handleSendMessage={stableHandleSendMessage} handleKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stableHandleSendMessage(); } }} handleRecordButtonClick={handleRecordButtonClick} inputRef={inputRef} isLoading={isLoading} isTranscribing={isTranscribing} isRecording={isRecording} elapsedTime={elapsedTime} onImagesSelected={handleImagesSelected} pendingImages={pendingImages} onRemovePendingImage={removePendingImage} selectedModel={selectedModel} setSelectedModel={setSelectedModel} isWebSearchEnabled={isWebSearchEnabled} setIsWebSearchEnabled={setIsWebSearchEnabled} onStopStreaming={stopStreaming} theme={theme} siteLanguage={siteLanguage} translations={translations} isEditing={!!editingMessageId} cancelEdit={() => { setEditingMessageId(null); setCurrentMessage(''); }} autoSendCountdown={autoSendCountdown} cancelAutoSendTimer={cancelAutoSendTimer} setIsSendTimerPaused={setIsSendTimerPaused} autoRecordCountdown={autoRecordCountdown} cancelAutoRecordTimer={cancelAutoRecordTimer} setIsRecordTimerPaused={setIsRecordTimerPaused} features={features} isDragActive={imageUploadEnabled && isDragOverWidget} />
                    </div>
                </div>
            )}

            {isPromptModalOpen && (
                <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={closePromptModal}></div>
                    <div className={`relative z-10 w-11/12 max-w-md rounded-xl shadow-2xl p-5 ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <h2 className="text-lg font-semibold">Custom Instructions</h2>
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>This text is sent first to give Aida context.</p>
                        <textarea value={promptDraft} onChange={(e) => setPromptDraft(e.target.value)} onFocus={() => setPromptDraft(customPrompt)} className={`w-full min-h-[140px] mt-4 p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`} placeholder="Provide guidance for Aida..." />
                        <div className="mt-4 flex justify-end space-x-2">
                            <button type="button" onClick={closePromptModal} className={`px-4 py-2 text-sm rounded-lg ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Cancel</button>
                            <button type="button" onClick={() => { setCustomPrompt(promptDraft.trim()); localStorage.setItem('aida-widget-prompt', promptDraft.trim()); closePromptModal(); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {isImagePreviewOpen && (
                <div className="fixed inset-0 z-[65] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/80" onClick={closeImagePreview}></div>
                    <div className="relative z-10 max-w-4xl max-h-[90vh] w-full px-6">
                        <button type="button" onClick={closeImagePreview} className="absolute -top-8 right-2 text-white/80 hover:text-white p-2" aria-label="Close image preview">✕</button>
                        <img src={imagePreviewSrc?.src} alt={imagePreviewSrc?.name || 'uploaded'} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
                    </div>
                </div>
            )}
        </>
    );
};

export default AidaWidget;
