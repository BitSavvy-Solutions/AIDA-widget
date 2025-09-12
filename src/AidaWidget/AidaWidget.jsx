import React, { useState, useRef, useEffect, useCallback } from 'react';
import SevenSegmentDisplay from './SevenSegmentDisplay';
import ChatHeader from './ChatHeader';
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
    const [editingMessageId, setEditingMessageId] = useState(null);

    const lastInputWasVoiceRef = useRef(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const loadingIntervalRef = useRef(null);
    const blinkTimerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);

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
    
    // --- EFFECT HOOKS ---
    useEffect(() => {
        if (isOpen && !isLoading && !isTranscribing) inputRef.current?.focus();
    }, [isLoading, isTranscribing, isOpen]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'; 
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [currentMessage]);

    useEffect(() => {
        sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isLoading) {
            if (eyeState === 'open') setDisplayText(" I1 ");
            else if (eyeState === 'half-closed') setDisplayText(" TT ");
            else setDisplayText(" __ ");
        }
    }, [eyeState, isOpen, isLoading]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => () => { // General cleanup
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }, []);

    // --- CORE LOGIC FUNCTIONS ---
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
        if (!messageText.trim() || isLoading) return;

        cancelAutoSendTimer();
        cancelAutoRecordTimer();

        // If editing an existing user message, update it and re-run assistant
        if (editingMessageId) {
            const trimmed = messageText.trim();
            const idx = messages.findIndex(m => m.id === editingMessageId);
            if (idx === -1) return; // safety
            const userMessage = { ...messages[idx], text: trimmed, edited: true };
            const historyBefore = messages.slice(0, idx);
            const botMessageId = `bot-${Date.now()}`;

            // Replace thread after the edited user message and add fresh bot placeholder
            setMessages([...historyBefore, userMessage, { id: botMessageId, text: '', sender: 'bot' }]);
            setCurrentMessage('');
            setEditingMessageId(null);
            setIsLoading(true);
            startLoadingAnimation();

            const detectedLang = franc(userMessage.text);
            const detectedLanguageCode = supportedLanguages.includes(langMap[detectedLang]) ? langMap[detectedLang] : "en";

            try {
                const response = await fetch(chatUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_input: userMessage.text,
                        message_history: historyBefore.map(m => ({ type: m.sender === 'user' ? 'human' : 'ai', content: m.text })),
                        email: user.email,
                        page_path: window.location.pathname,
                        language: detectedLanguageCode,
                        model: selectedModel,
                    }),
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

        const userMessage = { id: `user-${Date.now()}`, text: messageText.trim(), sender: 'user' };
        const botMessageId = `bot-${Date.now()}`;
        setMessages(prev => [...prev, userMessage, { id: botMessageId, text: '', sender: 'bot' }]);
        setCurrentMessage('');
        setIsLoading(true);
        startLoadingAnimation();

        const detectedLang = franc(userMessage.text);
        const detectedLanguageCode = supportedLanguages.includes(langMap[detectedLang]) ? langMap[detectedLang] : "en";
        
        try {
            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_input: userMessage.text,
                    message_history: [...messages, userMessage].map(m => ({ type: m.sender === 'user' ? 'human' : 'ai', content: m.text })).slice(0, -1),
                    email: user.email,
                    page_path: window.location.pathname,
                    language: detectedLanguageCode,
                    model: selectedModel,
                }),
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
    }, [messages, currentMessage, isLoading, selectedModel, chatUrl, user.email, editingMessageId]);
    
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
    
    // --- RENDER ---
    return (
        <div className={`z-50 ${isFullscreen 
            ? 'fixed inset-0 w-full h-full' 
            : 'fixed bottom-5 right-5'
        }`}>
            {!isOpen && (<button onClick={toggleChat} className="bg-gray-900 text-white rounded-lg p-2 flex"><div className="compact-lcd"><SevenSegmentDisplay text={displayText} className="animate-lcd-pulse" /></div></button>)}
            {isOpen && (
                <div className={`bg-white rounded-xl shadow-2xl flex flex-col ${isFullscreen ? 'w-full h-full' : 'w-80 sm:w-96 h-[500px]'} border ${isClosing ? 'animate-collapse-chat' : 'animate-expand-chat'}`}>
                    <ChatHeader displayText={displayText} resetChat={() => setMessages([])} toggleFullscreen={() => setIsFullscreen(p => !p)} toggleChat={toggleChat} />
                    <ChatDisplay
                        messages={messages}
                        messagesEndRef={messagesEndRef}
                        siteLanguage={siteLanguage}
                        onStartEdit={(id, text) => {
                            setCurrentMessage(text);
                            setEditingMessageId(id);
                            setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                    />
                    <ChatInput
                        currentMessage={currentMessage}
                        setCurrentMessage={handleInputChange}
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
                    />
                </div>
            )}
        </div>
    );
};

export default AidaWidget;
