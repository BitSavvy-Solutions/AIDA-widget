/* src/AidaWidget/AidaWidget.jsx */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SevenSegmentDisplay from './SevenSegmentDisplay';
import ChatHeader from './ChatHeader';
import ChatHistoryPanel from './ChatHistoryPanel';
import ChatDisplay from './ChatDisplay';
import ChatInput from './ChatInput';
import AttachmentModal from './AttachmentModal';
import './AidaWidget.css';

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
    useDisplayAnimation,
} from './hooks';

import { CHAT_URL, TRANSCRIPTION_URL } from './utils/apiConfig';

const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const isImageFile = (file) => file?.type.startsWith('image/') || (typeof file?.name === 'string' && IMAGE_FILE_PATTERN.test(file.name));
const eventContainsImageFiles = (event) => {
    const dt = event?.dataTransfer;
    if (!dt) return false;
    for (const item of Array.from(dt.items || [])) if (item.kind === 'file' && item.type.startsWith('image/')) return true;
    for (const file of Array.from(dt.files || [])) if (isImageFile(file)) return true;
    return false;
};

const defaultProps = {
    apiConfig: { chatUrl: CHAT_URL, transcriptionUrl: TRANSCRIPTION_URL },
    language: 'en',
    translations: { transcribing: 'Transcribing...', inputPlaceholder: 'Type a message to Aida...' },
    user: {},
    pageContext: {},
    features: { resizable: true, modelSelection: true, voiceInput: true, webSearch: true, imageUpload: true, retryMessage: true, customInstructions: true, historyProjects: true }
};

const AidaWidget = (props) => {
    const { apiConfig, user, language, translations, pageContext, features } = { ...defaultProps, ...props };
    const imageUploadEnabled = Boolean(features?.imageUpload);

    const [currentMessage, setCurrentMessage] = useState('');
    const [selectedModel, setSelectedModel] = useState('deepseek/deepseek-chat-v3.1');
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [customPrompt, setCustomPrompt] = useState(() => localStorage.getItem('aida-widget-prompt') || '');
    const [promptDraft, setPromptDraft] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const inputRef = useRef(null);
    const dragCounterRef = useRef(0);
    const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
    const siteLanguage = language || 'en';
    const [isDragOverWidget, setIsDragOverWidget] = useState(false);

    const { isOpen, isClosing, isFullscreen, theme, setTheme, setIsFullscreen, toggleChatVisibility } = useWidgetState();
    const { messages, setMessages, getSanitizedMessages } = useChatMessages();
    const { isPanelOpen, openPanel, closePanel, historyItems, projects, currentSessionId, setCurrentSessionId, createNewSession, updateCurrentSession, saveCurrentChatToHistory, historyHandlers } = useChatHistory(getSanitizedMessages);
    const { isOpen: isPromptModalOpen, open: openPromptModal, close: closePromptModal } = useModal();
    const { attachments, addImageAttachments, addTextAttachment, addUrlAttachment, removeAttachment, clearAttachments, isAttachmentModalOpen, openModal: openAttachmentModal, closeModal: closeAttachmentModal } = useAttachments(setSelectedModel);
    
    const requestFullscreen = useCallback(() => setIsFullscreen(true), [setIsFullscreen]);
    const { sidebarRef, sidebarInlineStyle, resizeHandleProps, isResizing } = useResizableSidebar({ isOpen, isFullscreen, isMobileViewport, isEnabled: features.resizable, onRequestFullscreen: requestFullscreen });
    const { isLoading, lastCost, streamResponse, stopStreaming } = useChatAPI({ apiConfig, messages, setMessages, currentSessionId, updateCurrentSession, user, pageContext, customPrompt });
    const { isRecording, isTranscribing, elapsedTime, startRecording, stopRecording, lastInputWasVoiceRef } = useVoiceInput({ transcriptionUrl: apiConfig.transcriptionUrl, onTranscriptionComplete: (text) => { setCurrentMessage(p => p.trim() ? `${p} ${text}` : text); if (text) startAutoSendTimer(); } });
    const { countdown: autoSendCountdown, start: startAutoSendTimer, cancel: cancelAutoSendTimer, setIsPaused: setIsSendTimerPaused } = useCountdown(() => stableHandleSendMessage(), 3);
    const { countdown: autoRecordCountdown, start: startAutoRecordTimer, cancel: cancelAutoRecordTimer, setIsPaused: setIsRecordTimerPaused } = useCountdown(startRecording, 3);
    const displayText = useDisplayAnimation({ isOpen, isLoading });

    const handleWidgetDragEnter = useCallback((e) => { if (imageUploadEnabled && eventContainsImageFiles(e)) { e.preventDefault(); dragCounterRef.current++; setIsDragOverWidget(true); } }, [imageUploadEnabled]);
    const handleWidgetDragOver = useCallback((e) => { if (imageUploadEnabled && eventContainsImageFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }, [imageUploadEnabled]);
    const handleWidgetDragLeave = useCallback((e) => { if (imageUploadEnabled) { e.preventDefault(); dragCounterRef.current = Math.max(0, dragCounterRef.current - 1); if (dragCounterRef.current === 0) setIsDragOverWidget(false); } }, [imageUploadEnabled]);
    const handleWidgetDrop = useCallback((e) => { if (imageUploadEnabled && eventContainsImageFiles(e)) { e.preventDefault(); const imageFiles = Array.from(e.dataTransfer?.files || []).filter(isImageFile); if (imageFiles.length > 0) addImageAttachments(imageFiles); dragCounterRef.current = 0; setIsDragOverWidget(false); } }, [imageUploadEnabled, addImageAttachments]);

    const getLocalizedGreeting = (lang) => ({ 'ar': "✨ مرحبًا! أنا آيدا، مساعدتك الرقمية الذكية 🤖💖 كيف يمكنني مساعدتك اليوم؟ 😊", 'fr': "👋 Coucou ! Moi c’est Aida, ta super assistante numérique ✨💻 Comment puis-je t’aider aujourd’hui ? 😄" }[lang] || "Hey hey! 👋 I'm Aida, your sparkly smart digital assistant 🤖💖 How can I help you today? 😄");
    const toggleChat = useCallback(() => { if (isOpen) { cancelAutoSendTimer(); cancelAutoRecordTimer(); if (isRecording) stopRecording(); if (isLoading) stopStreaming(); } else if (messages.length === 0) { setMessages([{ id: `bot-${Date.now()}`, text: getLocalizedGreeting(siteLanguage), sender: 'bot' }]); } toggleChatVisibility(); }, [isOpen, isRecording, isLoading, messages.length, siteLanguage, stopRecording, stopStreaming, toggleChatVisibility, setMessages, cancelAutoSendTimer, cancelAutoRecordTimer]);
    const resetChat = () => { saveCurrentChatToHistory(); setMessages([]); setCurrentSessionId(null); clearAttachments(); };
    const handleRecordButtonClick = useCallback(() => { if (isLoading || isTranscribing) return; cancelAutoRecordTimer(); isRecording ? stopRecording() : startRecording(); }, [isRecording, isLoading, isTranscribing, stopRecording, startRecording, cancelAutoRecordTimer]);

    const stableHandleSendMessage = useCallback(async (messageTextOverride = null) => {
        const text = messageTextOverride ?? currentMessage;
        if ((!text.trim() && attachments.length === 0) || isLoading) return;
        cancelAutoSendTimer(); cancelAutoRecordTimer();
        
        let userMessage, historyForPayload;
        const botMessageId = `bot-${Date.now()}`;
        const finalModelName = isWebSearchEnabled ? `${selectedModel}:online` : selectedModel;
        const imageAttachments = attachments.filter(a => a.type === 'image');

        if (editingMessageId) {
            const idx = messages.findIndex(m => m.id === editingMessageId);
            if (idx === -1) return;
            userMessage = { ...messages[idx], text: text.trim(), edited: true, model: finalModelName, attachments, images: imageAttachments };
            historyForPayload = messages.slice(0, idx);
            setMessages([...historyForPayload, userMessage, { id: botMessageId, text: '', sender: 'bot' }]);
        } else {
            if (!currentSessionId) createNewSession([]);
            userMessage = { id: `user-${Date.now()}`, sender: 'user', text: text.trim(), model: finalModelName, webSearchEnabled: isWebSearchEnabled, attachments, images: imageAttachments };
            historyForPayload = messages;
            setMessages(prev => [...prev, userMessage, { id: botMessageId, sender: 'bot', text: '' }]);
        }
        
        setCurrentMessage(''); clearAttachments(); setEditingMessageId(null); if (isWebSearchEnabled) setIsWebSearchEnabled(false);
        await streamResponse({ userMessage, botMessageId, historyForPayload });
    }, [currentMessage, attachments, isLoading, editingMessageId, selectedModel, isWebSearchEnabled, messages, currentSessionId, streamResponse, setMessages, createNewSession, cancelAutoSendTimer, cancelAutoRecordTimer, clearAttachments]);

    const handleRetry = useCallback(async (botMessageId) => { if (isLoading) return; const botIndex = messages.findIndex(m => m.id === botMessageId); if (botIndex === -1) return; let userIndex = -1; for (let i = botIndex - 1; i >= 0; i--) { if (messages[i].sender === 'user' && (messages[i].text || messages[i].attachments?.length > 0)) { userIndex = i; break; } } if (userIndex === -1) return; const userMessageToRetry = messages[userIndex]; const historyForPayload = messages.slice(0, userIndex); const newBotMessageId = `bot-${Date.now()}`; setMessages([...historyForPayload, userMessageToRetry, { id: newBotMessageId, sender: 'bot', text: '' }]); await streamResponse({ userMessage: userMessageToRetry, botMessageId: newBotMessageId, historyForPayload }); }, [isLoading, messages, streamResponse, setMessages, selectedModel, isWebSearchEnabled]);
    
    useEffect(() => { if (isOpen && !isLoading && !isTranscribing) inputRef.current?.focus(); }, [isOpen, isLoading, isTranscribing]);
    useEffect(() => { if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.style.height = `${inputRef.current.scrollHeight}px`; } }, [currentMessage]);
    useEffect(() => { const handleResize = () => setIsMobileViewport(window.innerWidth <= 768); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);
    
    const containerClasses = `flex flex-col relative aida-widget-shell ${isClosing ? 'animate-collapse-chat' : 'animate-expand-chat'} ${isResizing ? 'aida-widget-shell--active' : ''} ${theme === 'dark' ? 'bg-gray-900 text-gray-100 border-l border-gray-800' : 'bg-white text-gray-900 border-l border-gray-200'} ${isFullscreen ? 'w-full h-full aida-widget-shell--fullscreen' : 'h-full aida-widget-shell--docked'}`;

    return (
        <>
            {!isOpen && <div className="aida-widget-launcher fixed z-50"><button onClick={toggleChat} className="bg-gray-900 text-white rounded-lg p-2 flex"><div className="compact-lcd"><SevenSegmentDisplay text={displayText} className="animate-lcd-pulse" /></div></button></div>}
            {isOpen && (
                <div className={`aida-widget-viewport z-50 ${isFullscreen ? 'aida-widget-viewport--fullscreen' : 'aida-widget-viewport--docked'}`}>
                    <div ref={sidebarRef} data-theme={theme} style={sidebarInlineStyle} className={containerClasses} onDragEnter={handleWidgetDragEnter} onDragOver={handleWidgetDragOver} onDragLeave={handleWidgetDragLeave} onDrop={handleWidgetDrop}>
                        {features.resizable && !isFullscreen && !isMobileViewport && <div {...resizeHandleProps} />}
                        {imageUploadEnabled && isDragOverWidget && <div className="absolute inset-0 z-[55] pointer-events-none flex items-center justify-center px-4"><div className={`pointer-events-none flex max-w-sm flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-5 text-sm font-medium ${theme === 'dark' ? 'border-pink-400/80 bg-gray-900/80 text-pink-100' : 'border-pink-500/60 bg-white/80 text-pink-600'}`}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 16l4.5-4.5 3.2 3.2 3.8-4.6 4.5 5.9" /><circle cx="9.2" cy="8.8" r="1.4" fill="currentColor" /><path d="M21 17.5V8a3 3 0 00-3-3h-1.5" strokeLinecap="round" /><path d="M3 12V8a3 3 0 013-3h6" strokeLinecap="round" /></svg><span>Drop images to attach</span></div></div>}
                        <ChatHeader displayText={displayText} lastCost={lastCost} userId={user?.id} resetChat={resetChat} toggleFullscreen={() => setIsFullscreen(p => !p)} showFullscreenToggle={!isMobileViewport} isMobileViewport={isMobileViewport} toggleChat={toggleChat} theme={theme} onToggleTheme={() => setTheme(p => p === 'dark' ? 'light' : 'dark')} onToggleHistory={openPanel} onDisplayClick={features.customInstructions ? openPromptModal : undefined} />
                        {features.historyProjects && <ChatHistoryPanel theme={theme} open={isPanelOpen} onClose={closePanel} sessions={historyItems} projects={projects} onSelect={(s) => { setMessages(s.messages || []); setCurrentSessionId(s.id); closePanel(); }} {...historyHandlers} />}
                        <ChatDisplay messages={messages} isLoading={isLoading} siteLanguage={siteLanguage} theme={theme} onStartEdit={(id, text) => { setCurrentMessage(text); setEditingMessageId(id); inputRef.current?.focus(); }} onImagePreview={setImagePreview} onRetryBotMessage={features.retryMessage ? handleRetry : undefined} />
                        <ChatInput {...{ currentMessage, setCurrentMessage, handleSendMessage: stableHandleSendMessage, handleKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stableHandleSendMessage(); } }, handleRecordButtonClick, inputRef, isLoading, isTranscribing, isRecording, elapsedTime, siteLanguage, theme, autoSendCountdown, cancelAutoSendTimer, setIsSendTimerPaused, autoRecordCountdown, cancelAutoRecordTimer, setIsRecordTimerPaused, selectedModel, setSelectedModel, translations, isEditing: !!editingMessageId, cancelEdit: () => { setEditingMessageId(null); setCurrentMessage(''); }, attachmentCount: attachments.length, onOpenAttachments: openAttachmentModal, isWebSearchEnabled, setIsWebSearchEnabled, onStopStreaming: stopStreaming, features }}/>
                    </div>
                </div>
            )}
            {isPromptModalOpen && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/50" onClick={closePromptModal}></div><div className={`relative z-10 w-11/12 max-w-md rounded-xl shadow-2xl p-5 ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}><h2 className="text-lg font-semibold">Custom Instructions</h2><p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>This text is sent first to give Aida context.</p><textarea value={promptDraft} onChange={(e) => setPromptDraft(e.target.value)} onFocus={() => setPromptDraft(customPrompt)} className={`w-full min-h-[140px] mt-4 p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`} placeholder="Provide guidance for Aida..." /><div className="mt-4 flex justify-end space-x-2"><button type="button" onClick={closePromptModal} className={`px-4 py-2 text-sm rounded-lg ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Cancel</button><button type="button" onClick={() => { setCustomPrompt(promptDraft.trim()); localStorage.setItem('aida-widget-prompt', promptDraft.trim()); closePromptModal(); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">Save</button></div></div></div>}
            <AttachmentModal isOpen={isAttachmentModalOpen} onClose={closeAttachmentModal} attachments={attachments} onAddImages={addImageAttachments} onAddText={addTextAttachment} onAddUrl={addUrlAttachment} onRemove={removeAttachment} onImagePreview={setImagePreview} theme={theme}/>
            {imagePreview && (
                <div className="fixed inset-0 z-[65] flex items-center justify-center" onClick={() => setImagePreview(null)}>
                    <div className="absolute inset-0 bg-black/80"/>
                    <div className="relative z-10 max-w-4xl max-h-[90vh] w-full px-6">
                        <button type="button" onClick={() => setImagePreview(null)} className="absolute -top-8 right-2 text-white/80 hover:text-white p-2" aria-label="Close image preview">✕</button>
                        <img src={imagePreview.src} alt={imagePreview.name || 'uploaded'} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
                    </div>
                </div>
            )}
        </>
    );
};

export default AidaWidget;