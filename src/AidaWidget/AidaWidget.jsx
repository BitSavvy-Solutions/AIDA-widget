// src/AidaWidget/AidaWidget.jsx
/* src/AidaWidget/AidaWidget.jsx */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SevenSegmentDisplay from './SevenSegmentDisplay';
import ChatHeader from './ChatHeader';
import ChatHistoryPanel from './ChatHistoryPanel';
import ChatDisplay from './ChatDisplay';
import AttachmentModal from './AttachmentModal';
import ErrorModal from './ErrorModal';
import EmbedModal from './EmbedModal';
import ShareModal from './ShareModal';
import './AidaWidget.css';
import ChatInput from './ChatInput';
import AppearanceModal, { THEMES } from './AppearanceModal';
import OllamaModal from './OllamaModal';

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
    useDragAndDrop,
    useOllama,
} from './hooks';

import { CHAT_URL, TRANSCRIPTION_URL, MODELS_URL } from './utils/apiConfig';

const DEFAULT_MODELS = [
    { value: 'deepseek/deepseek-v4-pro', label: 'Deepseek 4 Pro', category: 'reasoning' },
    { value: 'deepseek/deepseek-v3.2', label: 'Deepseek 3.2', category: 'reasoning' },
    { value: 'deepseek/deepseek-chat-v3-0324', label: 'Deepseek V3', category: 'reasoning' },
    { value: 'openai/gpt-5.1', label: 'GPT-5.1', category: 'reasoning' },
    { value: 'google/gemini-3.1-pro-preview', label: 'Gemini Pro 3 (Reasoner)', category: 'reasoning' },
    { value: 'google/gemini-3.5-flash', label: 'Gemini Flash 3.5 Pre', category: 'reasoning' },
    { value: 'google/gemini-3.1-flash-lite-preview', label: 'Gemini Flash 3 Pre', category: 'chat' },
    { value: '~anthropic/claude-sonnet-latest', label: 'Claude Sonnet Latest', category: 'reasoning' },
    { value: '~anthropic/claude-haiku-latest', label: 'Claude Haiku Latest', category: 'reasoning' },
    { value: 'google/gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', category: 'vision' },
    { value: 'openai/gpt-5.1', label: 'GPT-5.1', category: 'chat' },
    { value: 'perplexity/sonar', label: 'Perplexity Sonar', category: 'chat' },
    { value: 'z-ai/glm-5.2', label: 'GLM-5.2', category: 'reasoning' },
    { value: 'qwen/qwen3.7-max', label: 'Qwen 3.7 Max', category: 'reasoning' },
    { value: 'minimax/minimax-m3', label: 'MiniMax M3', category: 'reasoning' },
    { value: 'moonshotai/kimi-k2.7-code', label: 'Kimi K2.7 Code', category: 'reasoning' },
    { value: 'xiaomi/mimo-v2.5-pro', label: 'MiMo v2.5 Pro', category: 'reasoning' },
];

const DEFAULT_AUDIO_MODELS = [
    { value: 'whisper-1', label: 'OpenAI Whisper', category: 'audio' },
    { value: 'whisper-1|translate', label: 'OpenAI Whisper (Translate to EN)', category: 'audio' },
    { value: 'saaras:v3', label: 'Sarvam Saaras v3', category: 'audio' },
    { value: 'saaras:v3|translate', label: 'Sarvam Saaras v3 (Translate to EN)', category: 'audio' }
];

const defaultProps = {
    apiConfig: { chatUrl: CHAT_URL, transcriptionUrl: TRANSCRIPTION_URL },
    language: 'en',
    translations: { transcribing: 'Transcribing...', inputPlaceholder: 'Type a message to Aida...' },
    user: {},
    pageContext: {},
    models: [],
    audioModels: [],
    features: {
        resizable: true,
        modelSelection: true,
        voiceInput: true,
        webSearch: true,
        imageUpload: true,
        retryMessage: true,
        customInstructions: true,
        historyProjects: true,
        paymentLink: null
    }
};

const AidaWidget = (props) => {
    const { apiConfig, user, language, translations, pageContext, features, models, audioModels } = { ...defaultProps, ...props };
    const attachmentsEnabled = Boolean(features?.imageUpload);

    const [fetchedModels, setFetchedModels] = useState([]);
    const [fetchedAudioModels, setFetchedAudioModels] = useState([]);

    const [searchedModels, setSearchedModels] = useState(null);
    const [isSearchingModels, setIsSearchingModels] = useState(false);
    const searchTimeoutRef = useRef(null);

    const [recentModelValues, setRecentModelValues] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('aida-recent-models'));
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        const loadModels = async () => {
            try {
                const res = await fetch(MODELS_URL);
                if (!res.ok) throw new Error('Failed to fetch models');
                const data = await res.json();

                const normalize = (list = []) => list.map(m => ({
                    value: m.id,
                    label: m.name,
                    category: m.category,
                    modality: m.modality,
                    pricing: m.pricing,
                    description: m.description,
                    available: m.available,
                    reason: m.reason
                }));

                setFetchedModels(normalize(data.text));
                setFetchedAudioModels(normalize(data.audio));
            } catch (err) {
                console.error('Failed to load models from API:', err);
            }
        };
        loadModels();
    }, []);

    const availableModels = (fetchedModels.length > 0) ? fetchedModels : ((models && models.length > 0) ? models : DEFAULT_MODELS);
    const availableAudioModels = (fetchedAudioModels.length > 0) ? fetchedAudioModels : ((audioModels && audioModels.length > 0) ? audioModels : DEFAULT_AUDIO_MODELS);

    const handleSearchModels = useCallback((query) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        if (!query.trim()) {
            setSearchedModels(null);
            setIsSearchingModels(false);
            return;
        }
        setIsSearchingModels(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`${MODELS_URL}?q=${encodeURIComponent(query)}`);
                if (!res.ok) throw new Error('Failed to search models');
                const data = await res.json();
                const normalize = (list = []) => list.map(m => ({
                    value: m.id,
                    label: m.name,
                    category: m.category,
                    modality: m.modality,
                    pricing: m.pricing,
                    description: m.description,
                    available: m.available,
                    reason: m.reason
                }));
                setSearchedModels({
                    text: normalize(data.text),
                    audio: normalize(data.audio)
                });
            } catch (err) {
                console.error('Failed to search models from API:', err);
                setSearchedModels({ text: [], audio: [] });
            } finally {
                setIsSearchingModels(false);
            }
        }, 400);
    }, []);

    const addRecentModel = useCallback((modelValue, modelType) => {
        setRecentModelValues(prev => {
            const next = [
                { value: modelValue, type: modelType },
                ...prev.filter(m => m.value !== modelValue)
            ].slice(0, 5);
            try {
                localStorage.setItem('aida-recent-models', JSON.stringify(next));
            } catch (e) {
                console.warn('Could not save recent models to localStorage', e);
            }
            return next;
        });
    }, []);

    const [selectedModel, setSelectedModel] = useState(() => {
        const saved = localStorage.getItem('aida-selected-model');
        if (saved?.startsWith('ollama:')) return saved;
        const exists = availableModels.some(m => m.value === saved);
        return exists ? saved : availableModels[0].value;
    });

    const [selectedAudioModel, setSelectedAudioModel] = useState(() => {
        const saved = localStorage.getItem('aida-selected-audio-model');
        const exists = availableAudioModels.some(m => m.value === saved);
        return exists ? saved : availableAudioModels[0].value;
    });

    const [contextLimit, setContextLimit] = useState(() => {
        const stored = localStorage.getItem('aida-context-limit');
        return stored ? Number(stored) : 10;
    });

    const [textSize, setTextSize] = useState(() => {
        try {
            return parseInt(localStorage.getItem('aida-text-size') || '100', 10);
        } catch (e) {
            return 100;
        }
    });

    const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);

    useEffect(() => { localStorage.setItem('aida-selected-model', selectedModel); }, [selectedModel]);
    useEffect(() => { localStorage.setItem('aida-selected-audio-model', selectedAudioModel); }, [selectedAudioModel]);
    useEffect(() => { localStorage.setItem('aida-context-limit', contextLimit); }, [contextLimit]);

    useEffect(() => {
        document.documentElement.style.setProperty('--aida-text-size-factor', `${textSize / 100}`);
        localStorage.setItem('aida-text-size', textSize.toString());
    }, [textSize]);

    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editDraft, setEditDraft] = useState('');
    const [customPrompt, setCustomPrompt] = useState(() => localStorage.getItem('aida-widget-prompt') || '');
    const [promptDraft, setPromptDraft] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [viewingMessageAttachments, setViewingMessageAttachments] = useState(null);
    const [embedUrl, setEmbedUrl] = useState(null);
    const [sessionToShare, setSessionToShare] = useState(null);

    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const programmaticScrollRef = useRef(false);
    const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
    const siteLanguage = language || 'en';

    const { isOpen, isClosing, isFullscreen, theme, setTheme, setIsFullscreen, toggleChatVisibility } = useWidgetState();
    const { messages, setMessages, getSanitizedMessages, loadMessagesForSession } = useChatMessages();
    const { isPanelOpen, openPanel, closePanel, historyItems, projects, currentSessionId, setCurrentSessionId, createNewSession, updateCurrentSession, saveCurrentChatToHistory, historyHandlers } = useChatHistory(getSanitizedMessages);
    const { isOpen: isPromptModalOpen, open: openPromptModal, close: closePromptModal } = useModal();
    const { isOpen: isShareModalOpen, open: openShareModal, close: closeShareModal } = useModal();
    const ollama = useOllama();
    const [isOllamaModalOpen, setIsOllamaModalOpen] = useState(false);
    const {
        attachments, setAttachments, addImageAttachments, addTextAttachment, addFolderAttachments,
        addUrlAttachment, addContextAttachment,
        removeAttachment, clearAttachments, isAttachmentModalOpen, openModal: openAttachmentModal, closeModal: closeAttachmentModal
    } = useAttachments(setSelectedModel);

    const [isReadingPage, setIsReadingPage] = useState(false);

    const handleReadPage = useCallback(async () => {
        if (!features.getPageContext) return;
        setIsReadingPage(true);
        try {
            const contextData = await features.getPageContext();
            if (contextData) {
                const content = contextData.content || contextData;
                const name = contextData.name || 'Page Context.md';
                addContextAttachment(content, name);
            }
        } catch (error) {
            console.error("Failed to read page context:", error);
            alert("Failed to read page context.");
        } finally {
            setIsReadingPage(false);
        }
    }, [features, addContextAttachment]);

    useEffect(() => {
        const handleContextPush = (e) => {
            const { content, name } = e.detail || {};
            if (content) {
                addContextAttachment(content, name || 'Pushed Context.md');
            }
        };
        window.addEventListener('aida-push-context', handleContextPush);
        return () => window.removeEventListener('aida-push-context', handleContextPush);
    }, [addContextAttachment]);

    const { isDragOverWidget, dropZoneProps } = useDragAndDrop({
        isEnabled: attachmentsEnabled,
        addImageAttachments,
        addTextAttachment,
        addFolderAttachments
    });

    const requestFullscreen = useCallback(() => setIsFullscreen(true), [setIsFullscreen]);
    const { sidebarRef, sidebarInlineStyle, resizeHandleProps, isResizing } = useResizableSidebar({ isOpen, isFullscreen, isMobileViewport, isEnabled: features.resizable, onRequestFullscreen: requestFullscreen });
    const { isLoading, lastCost, liveReasoning, streamResponse, stopStreaming, apiError, clearApiError } = useChatAPI({ apiConfig, messages, setMessages, currentSessionId, updateCurrentSession, user, pageContext, customPrompt, ollama });

    const { isRecording, elapsedTime, recordings, startRecording, stopRecording, retryTranscription, removeRecording, isNearingTimeLimit } = useVoiceInput({
        transcriptionUrl: apiConfig.transcriptionUrl,
        selectedAudioModel
    });

    const isTranscribing = recordings.some(r => r.isTranscribing);

    const getMessageText = useCallback(() => {
        const div = inputRef.current;
        if (!div) return '';
        let text = '';
        div.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.id.startsWith('capsule-')) {
                    // skip
                } else {
                    text += node.innerText;
                }
            }
        });
        return text;
    }, []);

    const autoSendCallbackRef = useRef(() => { });

    const { countdown: autoSendCountdown, start: startAutoSendTimer, cancel: cancelAutoSendTimer, setIsPaused: setIsSendTimerPaused } = useCountdown(() => autoSendCallbackRef.current(), 3);
    const { countdown: autoRecordCountdown, start: startAutoRecordTimer, cancel: cancelAutoRecordTimer, setIsPaused: setIsRecordTimerPaused } = useCountdown(startRecording, 3);

    const resolveModelName = useCallback((model) => (
        isWebSearchEnabled && !model?.startsWith('ollama:') ? `${model}:online` : model
    ), [isWebSearchEnabled]);

    const stableHandleSendMessage = useCallback(async (messageTextOverride = null) => {
        const text = messageTextOverride ?? '';
        if ((!text.trim() && attachments.length === 0) || isLoading) return;
        cancelAutoSendTimer();
        cancelAutoRecordTimer();
        const botMessageId = `bot-${Date.now()}`;
        const finalModelName = resolveModelName(selectedModel);
        const imageAttachments = attachments.filter(a => a.type === 'image');
        let nextMessages = [];
        let activeSessionId = currentSessionId;

        const userMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: text.trim(),
            model: finalModelName,
            webSearchEnabled: isWebSearchEnabled,
            attachments,
            images: imageAttachments
        };
        nextMessages = [...messages, userMessage, { id: botMessageId, sender: 'bot', text: '' }];
        setMessages(nextMessages);
        if (!activeSessionId) {
            activeSessionId = createNewSession(nextMessages);
        } else {
            updateCurrentSession(nextMessages);
        }

        clearAttachments();
        setEditingMessageId(null);
        if (isWebSearchEnabled) setIsWebSearchEnabled(false);

        const historyForPayload = nextMessages.slice(0, -1);
        await streamResponse({ userMessage, botMessageId, historyForPayload, sessionId: activeSessionId, contextLimit });
    }, [attachments, isLoading, selectedModel, isWebSearchEnabled, messages, currentSessionId, streamResponse, setMessages, createNewSession, updateCurrentSession, cancelAutoSendTimer, cancelAutoRecordTimer, clearAttachments, contextLimit, resolveModelName]);

    const handleAutoSend = useCallback(() => {
        const text = getMessageText();
        if (text.trim() || attachments.length > 0) {
            stableHandleSendMessage(text);
            if (inputRef.current) {
                inputRef.current.innerHTML = '';
                inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }, [getMessageText, stableHandleSendMessage, attachments.length]);

    useEffect(() => {
        autoSendCallbackRef.current = handleAutoSend;
    }, [handleAutoSend]);

    const displayText = useDisplayAnimation({ isOpen, isLoading });

    const prevIsTranscribingRef = useRef(false);

    useEffect(() => {
        if (prevIsTranscribingRef.current && !isTranscribing && !isRecording) {
            const text = getMessageText();
            if (text.trim() || attachments.length > 0) {
                startAutoSendTimer();
            }
        }
        prevIsTranscribingRef.current = isTranscribing;
    }, [isTranscribing, isRecording, attachments.length, startAutoSendTimer, getMessageText]);

    useEffect(() => {
        if (autoSendCountdown === null) return;

        const cancelTimer = () => {
            cancelAutoSendTimer();
        };

        window.addEventListener('mousemove', cancelTimer);
        window.addEventListener('mousedown', cancelTimer);
        window.addEventListener('keydown', cancelTimer);
        window.addEventListener('touchstart', cancelTimer);
        window.addEventListener('wheel', cancelTimer);

        return () => {
            window.removeEventListener('mousemove', cancelTimer);
            window.removeEventListener('mousedown', cancelTimer);
            window.removeEventListener('keydown', cancelTimer);
            window.removeEventListener('touchstart', cancelTimer);
            window.removeEventListener('wheel', cancelTimer);
        };
    }, [autoSendCountdown, cancelAutoSendTimer]);

    useEffect(() => {
        if (theme === 'custom') {
            try {
                const customTheme = JSON.parse(localStorage.getItem('aida-custom-theme'));
                if (customTheme) {
                    THEMES.custom.primary = customTheme.primary || THEMES.custom.primary;
                    THEMES.custom.accent = customTheme.accent || THEMES.custom.accent;
                    THEMES.custom.body.background = customTheme.bodyBg || THEMES.custom.body.background;
                    THEMES.custom.body.text = customTheme.bodyText || THEMES.custom.body.text;
                    THEMES.custom.chatArea.userMessage.background = customTheme.userMsgBg || THEMES.custom.chatArea.userMessage.background;
                }
            } catch (e) {
                console.warn('Error loading custom theme', e);
            }
        }
    }, [theme]);

    const selectedThemeObj = Object.values(THEMES).find(t => t.id === theme) || THEMES.coral;
    const baseTheme = ['dark', 'azure'].includes(theme) ||
        (theme === 'custom' && selectedThemeObj.body.background.match(/#([0-9a-f]{2}){1,2}/i) &&
            parseInt(selectedThemeObj.body.background.slice(1), 16) < 0x808080)
        ? 'dark' : 'light';

    useEffect(() => {
        if (loadMessagesForSession) loadMessagesForSession(currentSessionId);
    }, [currentSessionId, loadMessagesForSession]);

    useEffect(() => { if (!isLoading) setIsAutoScrollPaused(false); }, [isLoading]);

    const handleScrollStateChange = useCallback((atBottom) => {
        setIsAtBottom(atBottom);
        if (atBottom) setIsAutoScrollPaused(false);
    }, []);

    const handleUserScrollAway = useCallback(() => {
        if (isLoading) setIsAutoScrollPaused(true);
    }, [isLoading]);

    const handleViewAttachments = useCallback((message) => {
        setViewingMessageAttachments(message);
    }, []);

    const handleRemoveAttachmentFromMessage = useCallback((messageId, attachmentId) => {
        setMessages(prevMessages =>
            prevMessages.map(msg => {
                if (msg.id === messageId) {
                    const updatedAttachments = (msg.attachments || []).filter(att => att.id !== attachmentId);
                    const updatedImages = (msg.images || []).filter(img => img.id !== attachmentId);
                    return { ...msg, attachments: updatedAttachments, images: updatedImages };
                }
                return msg;
            })
        );
        setViewingMessageAttachments(prevViewingMsg => {
            if (prevViewingMsg && prevViewingMsg.id === messageId) {
                const updatedAttachments = (prevViewingMsg.attachments || []).filter(att => att.id !== attachmentId);
                return { ...prevViewingMsg, attachments: updatedAttachments };
            }
            return prevViewingMsg;
        });
    }, [setMessages]);

    const handleStartEdit = useCallback((message) => {
        setEditingMessageId(message.id);
        setEditDraft(message.text || '');
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingMessageId(null);
        setEditDraft('');
    }, []);

    const handleSaveEdit = useCallback(() => {
        if (!editingMessageId) return;
        setMessages(prevMessages => {
            const updatedMessages = prevMessages.map(msg =>
                msg.id === editingMessageId ? { ...msg, text: editDraft } : msg
            );
            if (currentSessionId) updateCurrentSession(updatedMessages);
            return updatedMessages;
        });
        setEditingMessageId(null);
        setEditDraft('');
    }, [editingMessageId, editDraft, currentSessionId, updateCurrentSession, setMessages]);

    const handleDeleteMessage = useCallback((messageId) => {
        setMessages(prevMessages => {
            const updatedMessages = prevMessages.filter(msg => msg.id !== messageId);
            if (currentSessionId) updateCurrentSession(updatedMessages);
            return updatedMessages;
        });
    }, [setMessages, currentSessionId, updateCurrentSession]);

    const handleOpenEmbed = useCallback((url) => {
        setEmbedUrl(url);
    }, []);

    const shouldAutoScroll = isLoading ? !isAutoScrollPaused : isAtBottom;

    const getLocalizedGreeting = (lang) => ({ 'ar': "✨ مرحبًا! أنا آيدا، مساعدتك الرقمية الذكية 🤖💖 كيف يمكنني مساعدتك اليوم؟ 😊", 'fr': "👋 Coucou ! Moi c'est Aida, ta super assistante numérique ✨💻 Comment puis-je t'aider aujourd'hui ? 😄" }[lang] || "Hey hey! 👋 I'm Aida, your sparkly smart digital assistant 🤖💖 How can I help you today? 😄");

    const toggleChat = useCallback(() => {
        if (isOpen) {
            cancelAutoSendTimer(); cancelAutoRecordTimer();
            if (isRecording) stopRecording();
            if (isLoading) stopStreaming();
            if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
        } else if (messages.length === 0) {
            setMessages([{ id: `bot-${Date.now()}`, text: getLocalizedGreeting(siteLanguage), sender: 'bot' }]);
        }
        toggleChatVisibility();
    }, [isOpen, isRecording, isLoading, messages.length, siteLanguage, stopRecording, stopStreaming, toggleChatVisibility, setMessages, cancelAutoSendTimer, cancelAutoRecordTimer]);

    const resetChat = () => { saveCurrentChatToHistory(); setMessages([]); setCurrentSessionId(null); clearAttachments(); };
    const handleRecordButtonClick = useCallback(() => { if (isLoading) return; cancelAutoRecordTimer(); isRecording ? stopRecording() : startRecording(); }, [isRecording, isLoading, stopRecording, startRecording, cancelAutoRecordTimer]);

    const handleRetry = useCallback(async (botMessageId) => {
        if (isLoading) return;
        const botIndex = messages.findIndex(m => m.id === botMessageId);
        if (botIndex === -1) return;
        let userIndex = -1;
        for (let i = botIndex - 1; i >= 0; i--) {
            if (messages[i].sender === 'user' && (messages[i].text || messages[i].attachments?.length > 0)) { userIndex = i; break; }
        }
        if (userIndex === -1) return;
        const finalModelName = resolveModelName(selectedModel);
        const userMessageToRetry = { ...messages[userIndex], model: finalModelName, webSearchEnabled: isWebSearchEnabled };
        const previousHistory = messages.slice(0, userIndex);
        const historyForPayload = [...previousHistory, userMessageToRetry];
        const newBotMessageId = `bot-${Date.now()}`;
        const nextMessages = [...previousHistory, userMessageToRetry, { id: newBotMessageId, sender: 'bot', text: '' }];
        setMessages(nextMessages);
        if (currentSessionId) updateCurrentSession(nextMessages);
        await streamResponse({ userMessage: userMessageToRetry, botMessageId: newBotMessageId, historyForPayload, sessionId: currentSessionId, contextLimit });
    }, [isLoading, messages, streamResponse, setMessages, currentSessionId, updateCurrentSession, selectedModel, isWebSearchEnabled, contextLimit, resolveModelName]);

    const handleRegenerate = useCallback(async (userMessageId) => {
        if (isLoading) return;
        const userIndex = messages.findIndex(m => m.id === userMessageId);
        if (userIndex === -1) return;
        const finalModelName = resolveModelName(selectedModel);
        const userMessageToRegenerate = { ...messages[userIndex], model: finalModelName, webSearchEnabled: isWebSearchEnabled };
        const previousHistory = messages.slice(0, userIndex);
        const historyForPayload = [...previousHistory, userMessageToRegenerate];
        const newBotMessageId = `bot-${Date.now()}`;
        const nextMessages = [...previousHistory, userMessageToRegenerate, { id: newBotMessageId, sender: 'bot', text: '' }];
        setMessages(nextMessages);
        if (currentSessionId) updateCurrentSession(nextMessages);
        await streamResponse({ userMessage: userMessageToRegenerate, botMessageId: newBotMessageId, historyForPayload, sessionId: currentSessionId, contextLimit });
    }, [isLoading, messages, streamResponse, setMessages, currentSessionId, updateCurrentSession, selectedModel, isWebSearchEnabled, contextLimit, resolveModelName]);

    const handleHistorySelect = useCallback((session) => {
        setCurrentSessionId(session.id);
        closePanel();
    }, [setCurrentSessionId, closePanel]);

    const currentSession = historyItems.find(h => h.id === currentSessionId);
    const currentSessionTitle = currentSession?.title || "New Chat";

    useEffect(() => {
        if (isOpen) {
            document.title = currentSessionTitle && currentSessionTitle !== "New Chat"
                ? `AIDA - ${currentSessionTitle}` : "AIDA";
        }
        return () => { document.title = "AIDA"; };
    }, [currentSessionTitle, isOpen]);

    const handleRenameCurrentSession = useCallback((newTitle) => {
        if (currentSessionId) historyHandlers.onRename(currentSessionId, newTitle);
    }, [currentSessionId, historyHandlers]);

    useEffect(() => { if (isOpen && !isLoading) inputRef.current?.focus(); }, [isOpen, isLoading]);
    useEffect(() => { const handleResize = () => setIsMobileViewport(window.innerWidth <= 768); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);

    const containerClasses = `flex flex-col relative aida-widget-shell ${isClosing ? 'animate-collapse-chat' : 'animate-expand-chat'} ${isResizing ? 'aida-widget-shell--active' : ''} border-l ${isFullscreen ? 'w-full h-full aida-widget-shell--fullscreen' : 'h-full aida-widget-shell--docked'}`;

    return (
        <div className="aida-scope">
            <style>{`
                .aida-scope {
                    --aida-primary: ${selectedThemeObj.primary};
                    --aida-accent: ${selectedThemeObj.accent};
                    --aida-header-bg: ${selectedThemeObj.header.background};
                    --aida-header-text: ${selectedThemeObj.header.text};
                    --aida-header-border: ${selectedThemeObj.header.border};
                    --aida-body-bg: ${selectedThemeObj.body.background};
                    --aida-body-text: ${selectedThemeObj.body.text};
                    --aida-chat-bg: ${selectedThemeObj.chatArea.background};
                    --aida-user-msg-bg: ${selectedThemeObj.chatArea.userMessage.background};
                    --aida-user-msg-text: ${selectedThemeObj.chatArea.userMessage.text};
                    --aida-bot-msg-bg: ${selectedThemeObj.chatArea.botMessage.background};
                    --aida-bot-msg-text: ${selectedThemeObj.chatArea.botMessage.text};
                    --aida-input-container: ${selectedThemeObj.inputArea.container};
                    --aida-input-bg: ${selectedThemeObj.inputArea.background};
                    --aida-input-border: ${selectedThemeObj.inputArea.border};
                    --aida-input-text: ${selectedThemeObj.inputArea.text};
                    --aida-input-placeholder: ${selectedThemeObj.inputArea.placeholder};
                    --aida-card-bg: ${selectedThemeObj.card.background};
                    --aida-card-border: ${selectedThemeObj.card.border};
                    --aida-code-bg: ${selectedThemeObj.code.background};
                    --aida-code-inline-bg: ${selectedThemeObj.code.inline};
                    --aida-code-text: ${selectedThemeObj.code.text};
                }
            `}</style>

            {!isOpen && (
                <div className="aida-widget-launcher fixed z-50">
                    <button onClick={toggleChat} className="bg-gray-900 text-white rounded-lg p-2 flex">
                        <div className="compact-lcd"><SevenSegmentDisplay text={displayText} className="animate-lcd-pulse" /></div>
                    </button>
                </div>
            )}
            {isOpen && (
                <div className={`aida-widget-viewport z-50 ${isFullscreen ? 'aida-widget-viewport--fullscreen' : 'aida-widget-viewport--docked'}`}>
                    <div ref={sidebarRef} data-theme={baseTheme} style={{ ...sidebarInlineStyle, backgroundColor: 'var(--aida-body-bg)', color: 'var(--aida-body-text)', borderColor: 'var(--aida-card-border)' }} className={containerClasses} {...dropZoneProps}>
                        {features.resizable && !isFullscreen && !isMobileViewport && <div {...resizeHandleProps} />}
                        {attachmentsEnabled && isDragOverWidget && (
                            <div className="absolute inset-0 z-[55] pointer-events-none flex items-center justify-center px-4">
                                <div className={`pointer-events-none flex max-w-sm flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-5 text-sm font-medium ${baseTheme === 'dark' ? 'border-pink-400/80 bg-gray-900/80 text-pink-100' : 'border-pink-500/60 bg-white/80 text-pink-600'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="1.5" className="h-10 w-10" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                    <span>Drop files or folders to attach</span>
                                </div>
                            </div>
                        )}
                        <ChatHeader
                            displayText={displayText}
                            lastCost={lastCost}
                            userId={user?.id}
                            paymentLinkConfig={features.paymentLink}
                            resetChat={resetChat}
                            toggleFullscreen={() => setIsFullscreen(p => !p)}
                            showFullscreenToggle={!isMobileViewport}
                            isMobileViewport={isMobileViewport}
                            toggleChat={toggleChat}
                            theme={baseTheme}
                            onOpenAppearance={() => setIsAppearanceModalOpen(true)}
                            onToggleHistory={openPanel}
                            onShare={messages.length > 0 ? () => {
                                setSessionToShare({ messages, title: currentSessionTitle });
                                openShareModal();
                            } : undefined}
                            onDisplayClick={features.customInstructions ? openPromptModal : undefined}
                            sessionTitle={currentSessionTitle}
                            onRenameSession={handleRenameCurrentSession}
                            isSessionActive={!!currentSessionId}
                            currentSessionId={currentSessionId}
                            projects={projects}
                            onCreateProject={historyHandlers.onCreateProject}
                            onAssignChatToProject={historyHandlers.onAssignChatToProject}
                            onRemoveChatFromProject={historyHandlers.onRemoveChatFromProject}
                            onUpdateProjectAppearance={historyHandlers.onUpdateProjectAppearance}
                        />
                        {features.historyProjects && (
                            <ChatHistoryPanel
                                theme={baseTheme} open={isPanelOpen} onClose={closePanel}
                                sessions={historyItems} projects={projects}
                                onSelect={handleHistorySelect} currentSessionId={currentSessionId}
                                {...historyHandlers}
                                onShare={(session) => {
                                    setSessionToShare({ messages: session.messages, title: session.title });
                                    openShareModal();
                                }}
                            />
                        )}
                        <ChatDisplay
                            messages={messages}
                            isLoading={isLoading}
                            liveReasoning={liveReasoning}
                            siteLanguage={siteLanguage}
                            theme={baseTheme}
                            messagesEndRef={messagesEndRef}
                            programmaticScrollRef={programmaticScrollRef}
                            shouldAutoScroll={shouldAutoScroll}
                            onScrollStateChange={handleScrollStateChange}
                            onUserScrollAway={handleUserScrollAway}
                            editingMessageId={editingMessageId}
                            editDraft={editDraft}
                            setEditDraft={setEditDraft}
                            onStartEdit={handleStartEdit}
                            onCancelEdit={handleCancelEdit}
                            onSaveEdit={handleSaveEdit}
                            onImagePreview={setImagePreview}
                            onRetryBotMessage={features.retryMessage ? handleRetry : undefined}
                            onRegenerateResponse={features.retryMessage ? handleRegenerate : undefined}
                            onViewAttachments={handleViewAttachments}
                            contextLimit={contextLimit}
                            onScrapeUrl={addUrlAttachment}
                            onEmbedUrl={handleOpenEmbed}
                            onDeleteMessage={handleDeleteMessage}
                        />
                        <ChatInput
                            handleSendMessage={stableHandleSendMessage}
                            handleRecordButtonClick={handleRecordButtonClick}
                            inputRef={inputRef}
                            isLoading={isLoading}
                            isTranscribing={isTranscribing}
                            isRecording={isRecording}
                            elapsedTime={elapsedTime}
                            siteLanguage={siteLanguage}
                            theme="dark"
                            autoSendCountdown={autoSendCountdown}
                            cancelAutoSendTimer={cancelAutoSendTimer}
                            setIsSendTimerPaused={setIsSendTimerPaused}
                            autoRecordCountdown={autoRecordCountdown}
                            cancelAutoRecordTimer={cancelAutoRecordTimer}
                            setIsRecordTimerPaused={setIsRecordTimerPaused}
                            selectedModel={selectedModel}
                            setSelectedModel={setSelectedModel}
                            availableModels={availableModels}
                            selectedAudioModel={selectedAudioModel}
                            setSelectedAudioModel={setSelectedAudioModel}
                            availableAudioModels={availableAudioModels}
                            translations={translations}
                            attachmentCount={attachments.length}
                            onOpenAttachments={openAttachmentModal}
                            isWebSearchEnabled={isWebSearchEnabled}
                            setIsWebSearchEnabled={setIsWebSearchEnabled}
                            onStopStreaming={stopStreaming}
                            features={features}
                            recordings={recordings}
                            retryTranscription={retryTranscription}
                            removeRecording={removeRecording}
                            isNearingTimeLimit={isNearingTimeLimit}
                            onAddImages={addImageAttachments}
                            contextLimit={contextLimit}
                            setContextLimit={setContextLimit}
                            onScrapeUrl={addUrlAttachment}
                            onEmbedUrl={handleOpenEmbed}
                            onSearchModels={handleSearchModels}
                            isSearchingModels={isSearchingModels}
                            searchedModels={searchedModels}
                            recentModelValues={recentModelValues}
                            onModelSelected={addRecentModel}
                            ollamaModels={ollama.models}
                            ollamaStatus={ollama.status}
                            isOllamaModalOpen={isOllamaModalOpen}
                            onOllamaRefresh={() => ollama.fetchModels()}
                            onOpenOllamaSettings={() => setIsOllamaModalOpen(true)}
                        />
                        <AppearanceModal
                            isOpen={isAppearanceModalOpen}
                            onClose={() => setIsAppearanceModalOpen(false)}
                            currentTheme={theme}
                            onSelectTheme={setTheme}
                            textSize={textSize}
                            onChangeTextSize={setTextSize}
                        />
                    </div>
                </div>
            )}

            {isPromptModalOpen && (
                <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={closePromptModal}></div>
                    <div className={`relative z-10 w-11/12 max-w-md rounded-xl shadow-2xl p-5 ${baseTheme === 'dark' ? 'bg-slate-900 border-white/10 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <h2 className="text-lg font-semibold">Custom Instructions</h2>
                        <p className={`text-sm mt-1 ${baseTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>This text is sent first to give Aida context.</p>
                        <textarea
                            value={promptDraft}
                            onChange={(e) => setPromptDraft(e.target.value)}
                            onFocus={() => setPromptDraft(customPrompt)}
                            className={`w-full min-h-[140px] mt-4 p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${baseTheme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white border-gray-300'}`}
                            placeholder="Provide guidance for Aida..."
                        />
                        <div className="mt-4 flex justify-end space-x-2">
                            <button type="button" onClick={closePromptModal} className={`px-4 py-2 text-sm rounded-lg ${baseTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Cancel</button>
                            <button
                                type="button"
                                onClick={() => { setCustomPrompt(promptDraft.trim()); localStorage.setItem('aida-widget-prompt', promptDraft.trim()); closePromptModal(); }}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AttachmentModal
                isOpen={isAttachmentModalOpen} onClose={closeAttachmentModal}
                attachments={attachments} onAddImages={addImageAttachments}
                onAddText={addTextAttachment} onAddFolder={addFolderAttachments}
                onAddUrl={addUrlAttachment} onRemove={removeAttachment}
                onClearAll={clearAttachments} onImagePreview={setImagePreview}
                theme={baseTheme}
                onReadPage={features.getPageContext ? handleReadPage : undefined}
                isReadingPage={isReadingPage}
            />

            <AttachmentModal
                isOpen={!!viewingMessageAttachments}
                onClose={() => setViewingMessageAttachments(null)}
                attachments={viewingMessageAttachments?.attachments || []}
                onImagePreview={setImagePreview}
                theme={baseTheme}
                isReadOnly={true}
                onRemove={(attachmentId) => {
                    if (viewingMessageAttachments) handleRemoveAttachmentFromMessage(viewingMessageAttachments.id, attachmentId);
                }}
            />

            {imagePreview && (
                <div className="fixed inset-0 z-[65] flex items-center justify-center" onClick={() => setImagePreview(null)}>
                    <div className="absolute inset-0 bg-black/80" />
                    <div className="relative z-10 max-w-4xl max-h-[90vh] w-full px-6">
                        <button type="button" onClick={() => setImagePreview(null)} className="absolute -top-8 right-2 text-white/80 hover:text-white p-2">✕</button>
                        <img src={imagePreview.src} alt={imagePreview.name || 'uploaded'} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
                    </div>
                </div>
            )}

            <EmbedModal
                isOpen={!!embedUrl}
                url={embedUrl}
                onClose={() => setEmbedUrl(null)}
                theme={baseTheme}
            />

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => {
                    closeShareModal();
                    setTimeout(() => setSessionToShare(null), 300);
                }}
                messages={sessionToShare ? sessionToShare.messages : messages}
                sessionTitle={sessionToShare ? sessionToShare.title : currentSessionTitle}
                theme={baseTheme}
            />

            <OllamaModal
                isOpen={isOllamaModalOpen}
                onClose={() => setIsOllamaModalOpen(false)}
                baseUrl={ollama.baseUrl}
                setBaseUrl={ollama.setBaseUrl}
                status={ollama.status}
                models={ollama.models}
                error={ollama.error}
                lastFetchedAt={ollama.lastFetchedAt}
                onConnect={(url) => ollama.fetchModels(url)}
                onDisconnect={ollama.disconnect}
                onRefresh={() => ollama.fetchModels()}
                pullState={ollama.pullState}
                onPullModel={ollama.pullModel}
                onCancelPull={ollama.cancelPull}
                onClearPullState={ollama.clearPullState}
                theme={baseTheme}
            />

            <ErrorModal isOpen={!!apiError} onClose={clearApiError} error={apiError} userEmail={user?.email} theme={baseTheme} />
        </div>
    );
};

export default AidaWidget;