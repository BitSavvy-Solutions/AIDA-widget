import { useState, useEffect, useCallback } from 'react';

export const useWidgetState = () => {
    // helper for boolean localStorage
    const getStoredBool = (key, fallback) => {
        try {
            const stored = localStorage.getItem(key);
            return stored !== null ? stored === 'true' : fallback;
        } catch {
            return fallback;
        }
    };

    const [isOpen, setIsOpen] = useState(() => getStoredBool('aida-is-open', false));
    const [isClosing, setIsClosing] = useState(false);
    const [isFullscreen, setIsFullscreenState] = useState(() => getStoredBool('aida-is-fullscreen', false));

    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('aida-theme') || 'dark';
        } catch {
            return 'dark';
        }
    });

    // Custom setter for fullscreen: updates state and persists synchronously.
    const setIsFullscreen = useCallback((value) => {
        setIsFullscreenState(value);
        try {
            localStorage.setItem('aida-is-fullscreen', String(value));
        } catch {
            // ignore storage errors
        }
    }, []);

    // Persist UI states to localStorage whenever they change.
    // We keep this effect for isOpen/theme, but fullscreen is already written above.
    useEffect(() => {
        try {
            localStorage.setItem('aida-is-open', isOpen);
            localStorage.setItem('aida-theme', theme);
        } catch (e) {
            console.warn('Could not save widget state to localStorage', e);
        }
    }, [isOpen, theme]);

    const toggleChatVisibility = useCallback(() => {
        if (isOpen) {
            setIsClosing(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsClosing(false);
            }, 300);
        } else {
            setIsOpen(true);
            if (window.innerWidth <= 768) {
                setIsFullscreen(true);
            }
        }
    }, [isOpen, setIsFullscreen]);

    return {
        isOpen,
        isClosing,
        isFullscreen,
        theme,
        setTheme,
        setIsFullscreen,
        toggleChatVisibility,
    };
};