import React, { useState, useRef, useEffect, useCallback } from 'react';
import SevenSegmentDisplay from './SevenSegmentDisplay';
import ChatHeader from './ChatHeader';
import ChatHistoryPanel from './ChatHistoryPanel';
import ChatDisplay from './ChatDisplay';
import ChatInput from './ChatInput';
import './AidaWidget.css';
import { franc } from 'franc';

// Define default props to make the widget configurable and robust
const defaultProps = {
    apiConfig: {
        chatUrl: "https://aitut-agentbackend.azurewebsites.net/iverse_agent",
        transcriptionUrl: "https://aitut-agentbackend.azurewebsites.net/transcribe_audio",
    },
    user: {
        email: "anonymous@example.com",
    },
    language: 'en',
    translations: {
        transcribing: 'Transcribing...',
        inputPlaceholder: 'Type your message...'
    }
};

const AidaWidget = (props) => {
    // Merge incoming props with defaults
    const { apiConfig, user, language, translations } = { ...defaultProps, ...props };

    // --- STATE AND REFS ---
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('aida-theme') || 'dark';
        } catch (_) {
            return 'dark';
        }
    });
    const [displayText, setDisplayText] = useState("AI:DA");
    const [messages, setMessages] = useState(
      JSON.parse(sessionStorage.getItem('chatMessages')) || []
    );
    const [currentMessage, setCurrentMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [eyeState, setEyeState] = useState('open');
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [autoSendCountdown, setAutoSendCountdown] = useState(null);
    const [isSendTimerPaused, setIsSendTimerPaused] = useState(false);
    const [autoRecordCountdown, setAutoRecordCountdown] = useState(null);
    const [isRecordTimerPaused, setIsRecordTimerPaused] = useState(false);
    const [selectedModel, setSelectedModel] = useState('openai/gpt-4o');
    const [pendingImages, setPendingImages] = useState([]); // [{ id, src, name, type }]
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false); // ✅ New state for web search

    const lastInputWasVoiceRef = useRef(false);
    const messagesEndRef = useRef(null);
    const shouldAutoScrollRef = useRef(true); // auto-scroll unless user scrolls up
    const programmaticScrollRef = useRef(false);
    const inputRef = useRef(null);
    const loadingIntervalRef = useRef(null);
    const blinkTimerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [autoScrollPaused, setAutoScrollPaused] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const HISTORY_KEY = 'aida-chat-history';
    const HISTORY_PROJECTS_KEY = 'aida-history-projects';
    const CURRENT_SESSION_KEY = 'aida-current-session-id';
    const PROMPT_STORAGE_KEY = 'aida-custom-prompt';
    const [historyItems, setHistoryItems] = useState(() => {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
    });
    const [historyProjects, setHistoryProjects] = useState(() => {
        try { return JSON.parse(localStorage.getItem(HISTORY_PROJECTS_KEY)) || []; } catch { return []; }
    });
    const [customPrompt, setCustomPrompt] = useState(() => {
        try { return localStorage.getItem(PROMPT_STORAGE_KEY) || ''; } catch { return []; }
    });
    const [promptDraft, setPromptDraft] = useState('');
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(() => {
        try { return sessionStorage.getItem(CURRENT_SESSION_KEY) || null; } catch { return null; }
    });

    // Remove heavy fields (e.g., base64 images) before persisting to storage
    const sanitizeMessagesForStorage = (msgs) => (msgs || []).map(({ images, ...m }) => m);

    const persistHistory = (items) => {
        setHistoryItems(items);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch {}
    };

    const persistProjects = (projects) => {
        setHistoryProjects(projects);
        try { localStorage.setItem(HISTORY_PROJECTS_KEY, JSON.stringify(projects)); } catch {}
    };

    const buildTitleFromMessages = (msgs) => {
        const firstUser = (msgs || []).find(m => m.sender === 'user' && (m.text || '').trim());
        const base = firstUser ? firstUser.text.trim() : 'Untitled chat';
        return base.length > 60 ? base.slice(0, 57) + '…' : base;
    };

    const createNewSession = (msgs) => {
        const id = `chat-${Date.now()}`;
        const title = buildTitleFromMessages(msgs) || `Chat ${new Date().toLocaleString()}`;
        const entry = { id, title, createdAt: Date.now(), messages: sanitizeMessagesForStorage(msgs) };
        const next = [entry, ...historyItems].slice(0, 200);
        persistHistory(next);
        setCurrentSessionId(id);
        try { sessionStorage.setItem(CURRENT_SESSION_KEY, id); } catch {}
        return id;
    };

    const updateCurrentSession = (msgs) => {
        if (!currentSessionId) return;
        const title = buildTitleFromMessages(msgs) || 'Untitled chat';
        const updated = historyItems.map(h => h.id === currentSessionId ? { ...h, title, messages: sanitizeMessagesForStorage(msgs) } : h);
        persistHistory(updated);
    };

    

    const saveCurrentChatToHistory = () => {
        if (!messages || messages.length === 0) return; // nothing to save
        const id = `chat-${Date.now()}`;
        const title = buildTitleFromMessages(messages) || `Chat ${new Date().toLocaleString()}`;
        const entry = { id, title, createdAt: Date.now(), messages: sanitizeMessagesForStorage(messages) };
        const next = [entry, ...historyItems].slice(0, 50);
        persistHistory(next);
    };

    const isMobile = window.innerWidth <= 768;
    
    // --- API & CONFIG ---
    const { chatUrl, transcriptionUrl } = apiConfig;
    const supportedLanguages = ["en", "fr", "ar", "hi", "tl", "uk", "sa", "ny"];
    const langMap = {
      eng: "en", fra: "fr", ara: "ar", hin: "hi",
      tgl: "tl", ukr: "uk", san: "sa", nya: "ny"
    };
    const siteLanguage = language || 'en';
  
    const getLocalizedGreeting = (lang) => {
        switch (lang) {
            case 'ar': return "✨ مرحبًا! أنا آيدا، مساعدتك الرقمية الذكية 🤖💖 كيف يمكنني مساعدتك اليوم؟ 😊";
            case 'fr': return "👋 Coucou ! Moi c’est Aida, ta super assistante numérique ✨💻 Comment puis-je t’aider aujourd’hui ? 😄";
            case 'hi': return "नमस्ते! 🌸 मैं आइडा हूँ, आपकी डिजिटल सहायक 🤖✨ आज मैं आपकी क्या मदद कर सकती हूँ? 😊";
            case 'tl': return "Hey there! 👋 Ako si Aida, ang iyong AI Digital Bestie 🤖💕 Paano kita matutulungan ngayon? 😄";
            case 'uk': return "Привіт! 💫 Я Айда — твій цифровий помічник 🤖❤️ Як можу допомогти сьогодні? 😊";
            case 'sa': return "नमस्ते! 🙏 अहं आइडा अस्मि 🧠💫 त्वदीया एआई सहायिका। कथं सहाय्यं करवानि ते अद्य? 🤗";
            case 'ny': return "Moni! 😄 Ndine Aida, bwenzi lako wa AI Digital 🤖✨ Ndingakuthandizeni bwanji lero? 👐";
            default: return "Hey hey! 👋 I'm Aida, your sparkly smart digital assistant 🤖💖 How can I help you today? 😄";
        }
    };

    const handleDeleteProject = useCallback((projectId) => {
  const updatedProjects = historyProjects.filter(project => project.id !== projectId);
  persistProjects(updatedProjects);
}, [historyProjects]);
    
    // --- EFFECT HOOKS ---
    useEffect(() => {
        if (isOpen && !isLoading && !isTranscribing) inputRef.current?.focus();
    }, [isLoading, isTranscribing, isOpen]);

    useEffect(() => {
        try { localStorage.setItem('aida-theme', theme); } catch (_) {}
    }, [theme]);

    useEffect(() => {
        try { localStorage.setItem(PROMPT_STORAGE_KEY, customPrompt); } catch (_) {}
    }, [customPrompt]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'; 
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [currentMessage]);

    useEffect(() => {
        try {
            sessionStorage.setItem('chatMessages', JSON.stringify(sanitizeMessagesForStorage(messages)));
        } catch (e) {
            console.warn('Skipping chatMessages persist:', e);
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isLoading) {
            if (eyeState === 'open') setDisplayText(" I1 ");
            else if (eyeState === 'half-closed') setDisplayText(" TT ");
            else setDisplayText(" __ ");
        }
    }, [eyeState, isOpen, isLoading]);

    const scrollToBottom = () => {
        programmaticScrollRef.current = true;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
            programmaticScrollRef.current = false;
        }, 400);
    };

    useEffect(() => {
        if (isOpen && shouldAutoScrollRef.current) scrollToBottom();
    }, [messages, isOpen]);


    useEffect(() => () => { // General cleanup
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }, []);

    // --- CORE LOGIC FUNCTIONS ---
    const buildMessageHistoryPayload = useCallback((history = []) => {
        const trimmedPrompt = (customPrompt || '').trim();
        const baseHistory = (history || []).map(m => ({
            type: m.sender === 'user' ? 'human' : 'ai',
            content: m.text || ''
        }));
        return trimmedPrompt ? [{ type: 'human', content: trimmedPrompt }, ...baseHistory] : baseHistory;
    }, [customPrompt]);

    const handleShareHistory = useCallback(async (session) => {
        if (!session) return;
        const title = session.title || 'Aida chat';
        const timestamp = new Date(session.createdAt || Date.now()).toLocaleString();
        const messageLines = (session.messages || [])
            .map((msg) => {
                const speaker = msg.sender === 'bot' ? 'Aida' : 'You';
                return `${speaker}: ${msg.text || ''}`.trim();
            })
            .filter((line) => line.length > 0);
        const shareText = [`Chat: ${title}`, `Saved: ${timestamp}`, '', ...messageLines].join('\n');

        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({ title, text: shareText });
                return;
            }
        } catch (err) {
            if (err?.name === 'AbortError') return;
            console.warn('Native share failed, falling back to clipboard.', err);
        }

        const tryClipboardWrite = async () => {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareText);
                alert('Chat copied to clipboard.');
                return true;
            }
            return false;
        };

        const clipboardHandled = await tryClipboardWrite().catch(() => false);
        if (clipboardHandled) return;

        try {
            if (typeof document !== 'undefined') {
                const textarea = document.createElement('textarea');
                textarea.value = shareText;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);
                if (successful) {
                    alert('Chat copied to clipboard.');
                    return;
                }
            }
        } catch (err) {
            console.error('Fallback clipboard copy failed', err);
        }

        alert('Unable to share this chat automatically. You can copy the text manually.');
    }, []);

    const handleRenameHistory = useCallback((id, nextTitle) => {
        const trimmed = (nextTitle || '').trim();
        const updated = historyItems.map((item) => (
            item.id === id ? { ...item, title: trimmed || 'Untitled chat' } : item
        ));
        persistHistory(updated);
    }, [historyItems]);

    const handleCreateProject = useCallback((projectName) => {
        const trimmed = (projectName || '').trim();
        if (!trimmed) return false;
        const exists = historyProjects.some((project) => (project.name || '').toLowerCase() === trimmed.toLowerCase());
        if (exists) return false;
        const newProject = {
            id: `project-${Date.now()}`,
            name: trimmed,
            chatIds: [],
        };
        const updated = [newProject, ...historyProjects];
        persistProjects(updated);
        return true;
    }, [historyProjects]);

    const handleAssignChatToProject = useCallback((projectId, chatId) => {
        if (!projectId || !chatId) return;
        const chatExists = historyItems.some((item) => item.id === chatId);
        if (!chatExists) return;
        const updated = historyProjects.map((project) => {
            if (project.id !== projectId) return project;
            const existing = Array.isArray(project.chatIds) ? project.chatIds : [];
            if (existing.includes(chatId)) return project;
            return { ...project, chatIds: [...existing, chatId] };
        });
        persistProjects(updated);
    }, [historyProjects, historyItems]);

    const handleRenameProject = useCallback((projectId, nextName) => {
        const trimmed = (nextName || '').trim();
        if (!trimmed) return;
        const updated = historyProjects.map(project => (
            project.id === projectId ? { ...project, name: trimmed } : project
        ));
        persistProjects(updated);
    }, [historyProjects]);

    const handleDeleteHistoryItem = useCallback((chatId) => {
        const filteredHistory = historyItems.filter(h => h.id !== chatId);
        persistHistory(filteredHistory);
        const updatedProjects = historyProjects.map(project => ({
            ...project,
            chatIds: (project.chatIds || []).filter(id => id !== chatId)
        }));
        persistProjects(updatedProjects);
    }, [historyItems, historyProjects]);

    const handleRemoveChatFromProject = useCallback((projectId, chatId) => {
        const updatedProjects = historyProjects.map(project => {
            if (project.id !== projectId) return project;
            return {
                ...project,
                chatIds: (project.chatIds || []).filter(id => id !== chatId)
            };
        });
        persistProjects(updatedProjects);
    }, [historyProjects]);

    const cancelAutoSendTimer = useCallback(() => {
        setAutoSendCountdown(null);
        setIsSendTimerPaused(false);
    }, []);

    const cancelAutoRecordTimer = useCallback(() => {
        setAutoRecordCountdown(null);
        setIsRecordTimerPaused(false);
    }, []);

    const startBlinking = useCallback(() => {
        if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        const scheduleNextBlink = () => {
          const nextBlinkDelay = 2000 + Math.random() * 5000;
          blinkTimerRef.current = setTimeout(() => {
            setEyeState('half-closed');
            setTimeout(() => setEyeState('closed'), 100);
            setTimeout(() => setEyeState('half-closed'), 160);
            setTimeout(() => { setEyeState('open'); scheduleNextBlink(); }, 260);
          }, nextBlinkDelay);
        };
        setEyeState('open');
        scheduleNextBlink();
    }, []);
    
    const stopBlinking = () => {
        if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        setEyeState('open');
    };

    const startLoadingAnimation = useCallback(() => {
        stopBlinking();
        const states = ["--:--", "=-:--", "==-:-", "==:=-", "==:=="];
        let i = 0;
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = setInterval(() => setDisplayText(states[i++ % states.length]), 300);
    }, [stopBlinking]);
    
    const stopLoadingAnimation = useCallback(() => {
        if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current);
            loadingIntervalRef.current = null;
            if (isOpen) {
                startBlinking();
            } else {
                setDisplayText("AI:DA");
            }
        }
    }, [isOpen, startBlinking]);

    const startRecording = async () => {
        cancelAutoRecordTimer();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            
            recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstart = () => {
                lastInputWasVoiceRef.current = true;
                setIsRecording(true);
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                setElapsedTime(0);
                timerIntervalRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000);
            };
            recorder.onstop = () => transcribeAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
            recorder.start();
        } catch (err) {
            console.error("Mic access error:", err);
            alert("Could not access microphone.");
        }
    };
    
    const stableHandleSendMessage = useCallback(async (messageToSend = null) => {
        const messageText = messageToSend ?? currentMessage;
        const hasImages = pendingImages && pendingImages.length > 0;
        if ((!messageText.trim() && !hasImages) || isLoading) return;

        // ✅ Capture web search state and reset UI immediately
        const webSearchWasEnabled = isWebSearchEnabled;
        if (webSearchWasEnabled) {
            setIsWebSearchEnabled(false);
        }

        cancelAutoSendTimer();
        cancelAutoRecordTimer();

        // If editing an existing user message, update it and re-run assistant
        if (editingMessageId) {
            const trimmed = messageText.trim();
            const idx = messages.findIndex(m => m.id === editingMessageId);
            if (idx === -1) return; // safety
            // For simplicity, keep original images during edit; do not attach new pending images
            const userMessage = { ...messages[idx], text: trimmed, edited: true };
            const historyBefore = messages.slice(0, idx);
            const botMessageId = `bot-${Date.now()}`;

            // Replace thread after the edited user message and add fresh bot placeholder
            const nextThread = [...historyBefore, userMessage, { id: botMessageId, text: '', sender: 'bot' }];
            setMessages(nextThread);
            if (!currentSessionId) {
                createNewSession(nextThread);
            } else {
                updateCurrentSession(nextThread);
            }
            setCurrentMessage('');
            setEditingMessageId(null);
            setIsLoading(true);
            startLoadingAnimation();

            const detectedLang = franc(userMessage.text);
            const detectedLanguageCode = supportedLanguages.includes(langMap[detectedLang]) ? langMap[detectedLang] : "en";

            try {
                // Choose a vision-capable model automatically if images are present
                const hasEditImages = Array.isArray(userMessage.images) && userMessage.images.length > 0;
                const visionModels = new Set(['openai/gpt-4o', 'google/gemini-flash-1.5', 'google/gemini-pro-vision']);
                const modelToUse = hasEditImages && !visionModels.has(selectedModel) ? 'google/gemini-flash-1.5' : selectedModel;
                const finalModelName = webSearchWasEnabled ? `${modelToUse}:online` : modelToUse; // ✅ Append :online if needed

                const payload = {
                    user_input: userMessage.text,
                    message_history: buildMessageHistoryPayload(historyBefore),
                    email: user.email,
                    page_path: window.location.pathname,
                    language: detectedLanguageCode,
                    model: finalModelName, // ✅ Use final model name
                    images: userMessage.images || []
                };
                if (hasEditImages) {
                    const urls = (userMessage.images || []).map(img => img.src).filter(Boolean);
                    if (urls.length > 0) payload.image_data_urls = urls;
                }

                const response = await fetch(chatUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!response.ok || !response.body) throw new Error(`HTTP error! status: ${response.status}`);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulated = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    accumulated += decoder.decode(value, { stream: true });
                    const parts = accumulated.split('\n\n');
                    accumulated = parts.pop();
                    for (const part of parts) {
                        if (part.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(part.substring(6));
                                if (data.delta_content) setMessages(p => p.map(m => m.id === botMessageId ? { ...m, text: m.text + data.delta_content } : m));
                            } catch (e) {
                                console.error("Stream parse error:", part.substring(6), e);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Chatbot API error:", error);
                setMessages(p => p.map(m => m.id === botMessageId ? { ...m, text: "Oops! I couldn't connect. Please try again." } : m));
                setDisplayText("ERR:0");
            } finally {
                stopLoadingAnimation();
                setIsLoading(false);
            }
            return;
        }

        const userMessage = { id: `user-${Date.now()}`, text: messageText.trim(), sender: 'user', images: hasImages ? pendingImages : [] };
        const botMessageId = `bot-${Date.now()}`;
        setMessages(prev => {
            const next = [...prev, userMessage, { id: botMessageId, text: '', sender: 'bot' }];
            // Auto-create or update the session snapshot immediately
            if (!currentSessionId) {
                createNewSession(next);
            } else {
                updateCurrentSession(next);
            }
            return next;
        });
        setIsLoading(true);
        startLoadingAnimation();

        const detectedLang = franc(userMessage.text);
        const detectedLanguageCode = supportedLanguages.includes(langMap[detectedLang]) ? langMap[detectedLang] : "en";
        
        try {
            // Ensure a vision-capable model when sending an image
            const visionModels = new Set(['openai/gpt-4o', 'google/gemini-flash-1.5', 'google/gemini-pro-vision']);
            const modelToUse = hasImages && !visionModels.has(selectedModel) ? 'google/gemini-flash-1.5' : selectedModel;
            const finalModelName = webSearchWasEnabled ? `${modelToUse}:online` : modelToUse; // ✅ Append :online if needed

            const payload = {
                user_input: userMessage.text,
                message_history: buildMessageHistoryPayload(messages),
                email: user.email,
                page_path: window.location.pathname,
                language: detectedLanguageCode,
                model: finalModelName, // ✅ Use final model name
                images: userMessage.images || []
            };
            if (hasImages) {
                const urls = (userMessage.images || []).map(img => img.src).filter(Boolean);
                if (urls.length > 0) payload.image_data_urls = urls;
            }

            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok || !response.body) throw new Error(`HTTP error! status: ${response.status}`);
            // Clear input and staged images after a successful send
            setCurrentMessage('');
            setPendingImages([]);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulated += decoder.decode(value, { stream: true });
                const parts = accumulated.split('\n\n');
                accumulated = parts.pop();
                for (const part of parts) {
                    if (part.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(part.substring(6));
                            if (data.delta_content) setMessages(p => {
                                const updated = p.map(m => m.id === botMessageId ? { ...m, text: m.text + data.delta_content } : m);
                                // Throttle-less incremental save; lightweight localStorage write
                                if (currentSessionId) updateCurrentSession(updated);
                                return updated;
                            });
                        } catch (e) {
                            console.error("Stream parse error:", part.substring(6), e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Chatbot API error:", error);
            setMessages(p => p.map(m => m.id === botMessageId ? { ...m, text: "Oops! I couldn't connect. Please try again." } : m));
            setDisplayText("ERR:0");
        } finally {
            stopLoadingAnimation();
            setIsLoading(false); 
        }
    }, [messages, currentMessage, isLoading, selectedModel, chatUrl, user.email, editingMessageId, pendingImages, buildMessageHistoryPayload, isWebSearchEnabled]);
    
    useEffect(() => {
        if (isSendTimerPaused || autoSendCountdown === null) return;
        const intervalId = setInterval(() => {
            setAutoSendCountdown(prev => {
                if (prev !== null && prev <= 1) {
                    const textFromInput = inputRef.current?.value;
                    if (textFromInput && textFromInput.trim()) {
                        stableHandleSendMessage(textFromInput);
                    }
                    clearInterval(intervalId);
                    return null;
                }
                return prev ? prev - 1 : null;
            });
        }, 1000);
        return () => clearInterval(intervalId);
    }, [autoSendCountdown, isSendTimerPaused, stableHandleSendMessage]);

    useEffect(() => {
        if (isRecordTimerPaused || autoRecordCountdown === null) return;
        const intervalId = setInterval(() => {
            setAutoRecordCountdown(prev => {
                if (prev !== null && prev <= 1) {
                    startRecording();
                    clearInterval(intervalId);
                    return null;
                }
                return prev ? prev - 1 : null;
            });
        }, 1000);
        return () => clearInterval(intervalId);
    }, [autoRecordCountdown, isRecordTimerPaused]);

    const startAutoSendTimer = useCallback(() => {
        cancelAutoSendTimer();
        setAutoSendCountdown(3);
        setIsSendTimerPaused(false);
    }, [cancelAutoSendTimer]);
    
    const transcribeAudioBlob = async (audioBlob) => {
        if (audioBlob.size === 0) return;
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.webm');
        setIsTranscribing(true);

        try {
            const response = await fetch(transcriptionUrl, { method: 'POST', body: formData });
            if (!response.ok) throw new Error(`Transcription failed: ${response.statusText}`);
            const result = await response.json();
            const data = typeof result._HttpResponse__body === 'string' ? JSON.parse(result._HttpResponse__body) : result;
            const transcriptionText = data?.transcription?.text || '';
            if (transcriptionText) {
                setCurrentMessage(prev => prev.trim() ? `${prev} ${transcriptionText}` : transcriptionText);
                startAutoSendTimer();
            }
        } catch (error) {
            console.error('Transcription error:', error);
        } finally {
            setIsTranscribing(false);
        }
    };
    
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }, []);

    const toggleChat = useCallback(() => {
        if (isOpen) {
            if (isRecording) stopRecording();
            cancelAutoSendTimer();
            cancelAutoRecordTimer(); 
            setIsClosing(true);
            setDisplayText("AI:DA");
            stopBlinking();
            setTimeout(() => {
                setIsOpen(false);
                setIsClosing(false);
                setIsFullscreen(false);
            }, 300);
        } else {
            setIsOpen(true);
            startBlinking();
            if (isMobile) setIsFullscreen(true); 
            const stored = JSON.parse(sessionStorage.getItem('chatMessages'));
            if (!stored || stored.length === 0) {
                const greeting = { id: `bot-${Date.now()}`, text: getLocalizedGreeting(siteLanguage), sender: 'bot' };
                setMessages([greeting]);
            }
        }
    }, [isOpen, isRecording, siteLanguage, startBlinking, stopBlinking, stopRecording, cancelAutoSendTimer, cancelAutoRecordTimer, isMobile]);



    const handleRecordButtonClick = () => {
        if (isLoading || isTranscribing) return;
        cancelAutoRecordTimer();
        isRecording ? stopRecording() : startRecording();
    };

    const handleInputChange = (text) => {
        setCurrentMessage(text);
        cancelAutoSendTimer();
        cancelAutoRecordTimer();
        lastInputWasVoiceRef.current = false;
    };

    // --- IMAGE UPLOAD HELPERS ---
    const handleImagesSelected = async (files) => {
        if (!files || files.length === 0) return;
        // Helper: read file to data URL
        const readAsDataURL = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        // Helper: estimate bytes from data URL
        const estimateBytes = (dataUrl) => {
            const base64 = String(dataUrl || '').split(',')[1] || '';
            return Math.ceil(base64.length * 0.75);
        };
        // Compress/resize large images to reduce payload size
        const compressDataURL = async (dataUrl, { maxDim = 1280, quality = 0.85, minQuality = 0.5, targetMaxBytes = 3 * 1024 * 1024 }) => {
            // Draw on canvas and export to JPEG at decreasing quality if needed
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const load = () => new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = (e) => reject(e);
                img.src = dataUrl;
            });
            try { await load(); } catch (_) { return dataUrl; }

            let w = img.naturalWidth || img.width;
            let h = img.naturalHeight || img.height;
            const scale = Math.min(1, maxDim / Math.max(w, h));
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            let q = quality;
            let out = canvas.toDataURL('image/jpeg', q);
            // Iteratively reduce quality until under target or minQuality reached
            while (estimateBytes(out) > targetMaxBytes && q > minQuality) {
                q = Math.max(minQuality, q - 0.1);
                out = canvas.toDataURL('image/jpeg', q);
            }
            return out;
        };

        try {
            const results = [];
            for (const file of Array.from(files)) {
                // Convert to DataURL
                const original = await readAsDataURL(file);
                // Decide whether to compress
                const shouldCompress = (() => {
                    const bigByBytes = (file.size || 0) > 1 * 1024 * 1024; // >1MB
                    const notJPEG = !(file.type || '').includes('jpeg');
                    return bigByBytes || notJPEG;
                })();
                const processed = shouldCompress ? await compressDataURL(original, {}) : original;
                const bytes = estimateBytes(processed);
                const MAX_BYTES_ALLOWED = 5 * 1024 * 1024; // 5MB safety cap
                if (bytes > MAX_BYTES_ALLOWED) {
                    alert(`Image \"${file.name}\" is too large after compression (${(bytes/1024/1024).toFixed(2)} MB). Please choose a smaller image.`);
                    continue; // skip oversized image
                }
                results.push({ id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, src: processed, name: file.name, type: file.type });
            }
            if (results.length > 0) {
                setPendingImages(prev => [...prev, ...results]);
                // Ensure a vision-capable model is selected when images are attached
                const visionlessModels = new Set([]);
                if (!visionlessModels.has(selectedModel)) {
                    setSelectedModel('deepseek/deepseek-chat-v3.1');
                }
            }
        } catch (e) {
            console.error('Failed to read image(s)', e);
        }
    };

    const removePendingImage = (id) => {
        setPendingImages(prev => prev.filter(img => img.id !== id));
    };
    
    const openPromptConfigurator = useCallback(() => {
        setPromptDraft(customPrompt);
        setIsPromptModalOpen(true);
    }, [customPrompt]);

    const closePromptConfigurator = useCallback(() => {
        setPromptDraft(customPrompt);
        setIsPromptModalOpen(false);
    }, [customPrompt]);

    const handlePromptSave = useCallback(() => {
        setCustomPrompt(promptDraft.trim());
        setIsPromptModalOpen(false);
    }, [promptDraft]);

    useEffect(() => {
        if (!isPromptModalOpen) return;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closePromptConfigurator();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isPromptModalOpen, closePromptConfigurator]);

    const promptModalSurface = theme === 'dark'
        ? 'bg-slate-900 text-gray-100 border border-white/10'
        : 'bg-white text-gray-900 border border-gray-200';
    const promptModalMutedText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const promptModalTextArea = theme === 'dark'
        ? 'bg-slate-950 border border-white/10 text-gray-100 placeholder-gray-500'
        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400';
    const promptModalCancelClasses = theme === 'dark'
        ? 'text-gray-400 hover:text-gray-200 focus:ring-white/30'
        : 'text-gray-500 hover:text-gray-700 focus:ring-blue-200';

    useEffect(() => {
        if (!imagePreview) return;
        const onEsc = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setImagePreview(null);
            }
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [imagePreview]);

    // --- RENDER ---
    return (
        <div className={`z-50 ${isFullscreen 
            ? 'fixed inset-0 w-full h-full' 
            : 'fixed bottom-5 right-5'
        }`}>
            {!isOpen && (<button onClick={toggleChat} className="bg-gray-900 text-white rounded-lg p-2 flex"><div className="compact-lcd"><SevenSegmentDisplay text={displayText} className="animate-lcd-pulse" /></div></button>)}
            {isOpen && (
                <div
                    data-theme={theme}
                    className={`${theme === 'dark'
                        ? 'bg-gray-900 text-gray-100 border border-gray-800'
                        : 'bg-white text-gray-900 border border-gray-200'
                    } rounded-xl shadow-2xl flex flex-col ${isFullscreen ? 'w-full h-full' : 'w-80 sm:w-96 h-[500px]'} ${isClosing ? 'animate-collapse-chat' : 'animate-expand-chat'}`}
                >
                    <ChatHeader
                        displayText={displayText}
                        resetChat={() => { 
                            saveCurrentChatToHistory(); 
                            setMessages([]); 
                            try { sessionStorage.setItem('chatMessages', JSON.stringify([])); } catch (_) {}
                        }}
                        toggleFullscreen={() => setIsFullscreen(p => !p)}
                        toggleChat={toggleChat}
                        theme={theme}
                        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                        onToggleHistory={() => setIsHistoryOpen(v => !v)}
                        onDisplayClick={openPromptConfigurator}
                    />
                    <ChatHistoryPanel
                        theme={theme}
                        open={isHistoryOpen}
                        onClose={() => setIsHistoryOpen(false)}
                        sessions={historyItems}
                        projects={historyProjects}
                        onCreateProject={handleCreateProject}
                        onAssignChatToProject={handleAssignChatToProject}
                        onRemoveChatFromProject={handleRemoveChatFromProject}
                        onShare={handleShareHistory}
                        onDeleteProject={handleDeleteProject} 
                        onRename={handleRenameHistory}
                        onSelect={(s) => {
                            const restored = s.messages || [];
                            setMessages(restored);
                            try { sessionStorage.setItem('chatMessages', JSON.stringify(sanitizeMessagesForStorage(restored))); } catch (e) { console.warn('Skipping chatMessages persist:', e); }
                            // Continue autosaving into this existing session
                            setCurrentSessionId(s.id);
                            try { sessionStorage.setItem(CURRENT_SESSION_KEY, s.id); } catch {}
                            setIsHistoryOpen(false);
                        }}
                        onDelete={handleDeleteHistoryItem}
                    />
                    <ChatDisplay
                        messages={messages}
                        messagesEndRef={messagesEndRef}
                        siteLanguage={siteLanguage}
                        theme={theme}
                        onImagePreview={(img) => setImagePreview(img)}
                        programmaticScrollRef={programmaticScrollRef}
                        onScrollStateChange={(atBottom) => {
                            setIsAtBottom(atBottom);
                            if (atBottom) {
                                setAutoScrollPaused(false);
                            }
                            shouldAutoScrollRef.current = atBottom && !autoScrollPaused;
                        }}
                        onUserScrollAway={() => {
                            if (isLoading) {
                                setAutoScrollPaused(true);
                                shouldAutoScrollRef.current = false;
                            }
                        }}
                        shouldAutoScroll={isAtBottom && !autoScrollPaused}
                        onStartEdit={(id, text) => {
                            setCurrentMessage(text);
                            setEditingMessageId(id);
                            setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                    />
                    <ChatInput
                        currentMessage={currentMessage}
                        setCurrentMessage={handleInputChange}
                        theme={theme}
                        handleSendMessage={() => stableHandleSendMessage()}
                        handleKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                stableHandleSendMessage();
                            }
                        }}
                        handleRecordButtonClick={handleRecordButtonClick}
                        inputRef={inputRef}
                        isLoading={isLoading}
                        isTranscribing={isTranscribing}
                        isRecording={isRecording}
                        elapsedTime={elapsedTime}
                        siteLanguage={siteLanguage}
                        autoSendCountdown={autoSendCountdown}
                        cancelAutoSendTimer={cancelAutoSendTimer}
                        setIsSendTimerPaused={setIsSendTimerPaused}
                        autoRecordCountdown={autoRecordCountdown}
                        cancelAutoRecordTimer={cancelAutoRecordTimer}
                        setIsRecordTimerPaused={setIsRecordTimerPaused}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        translations={translations}
                        isEditing={Boolean(editingMessageId)}
                        cancelEdit={() => { setEditingMessageId(null); setCurrentMessage(''); }}
                        onImagesSelected={handleImagesSelected}
                        pendingImages={pendingImages}
                        onRemovePendingImage={removePendingImage}
                        hasPendingImages={pendingImages.length > 0}
                        isWebSearchEnabled={isWebSearchEnabled}
                        setIsWebSearchEnabled={setIsWebSearchEnabled}
                    />
                </div>
            )}
            {isPromptModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={closePromptConfigurator} />
                    <div className={`relative z-10 w-11/12 max-w-md ${promptModalSurface} rounded-xl shadow-2xl p-5`}
                        role="dialog"
                        aria-modal="true"
                    >
                        <h2 className="text-lg font-semibold">Custom instructions</h2>
                        <p className={`text-sm mt-1 ${promptModalMutedText}`}>
                            This text is sent as the first message in every conversation to give Aida extra context.
                        </p>
                        <textarea
                            value={promptDraft}
                            onChange={(e) => setPromptDraft(e.target.value)}
                            className={`w-full min-h-[140px] mt-4 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${promptModalTextArea}`}
                            placeholder="Add hidden guidance for Aida here..."
                        />
                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={closePromptConfigurator}
                                className={`px-4 py-2 text-sm rounded-lg border border-transparent bg-transparent focus:outline-none focus:ring-2 ${promptModalCancelClasses}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handlePromptSave}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {imagePreview && (
                <div className="fixed inset-0 z-[65] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setImagePreview(null)} />
                    <div className="relative z-10 max-w-4xl max-h-[90vh] w-full px-6">
                        <div className="flex justify-end mb-2">
                            <button
                                type="button"
                                onClick={() => setImagePreview(null)}
                                className={`${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-700 hover:text-gray-900'} p-2`}
                                aria-label="Close image preview"
                            >
                                ✕
                            </button>
                        </div>
                        <div className={`rounded-xl overflow-hidden border ${theme === 'dark' ? 'border-white/10 bg-black/60' : 'border-gray-200 bg-white'}`}>
                            <img
                                src={imagePreview.src}
                                alt={imagePreview.name || 'uploaded'}
                                className="w-full h-auto max-h-[80vh] object-contain bg-black"
                            />
                        </div>
                        {imagePreview.name && (
                            <p className={`mt-3 text-center text-sm truncate ${theme === 'dark' ? 'text-white/80' : 'text-gray-700'}`}>{imagePreview.name}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AidaWidget;