/* src/AidaWidget/hooks/useWidgetState.js */
import { useState, useEffect, useCallback } from 'react';

/**
 * Manages the core UI state of the widget shell with LocalStorage persistence.
 */
export const useWidgetState = () => {
    // Helper to retrieve boolean values from localStorage
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
    const [isFullscreen, setIsFullscreen] = useState(() => getStoredBool('aida-is-fullscreen', false));
    
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('aida-theme') || 'dark';
        } catch (_) {
            return 'dark';
        }
    });

    // Persist UI states to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('aida-is-open', isOpen);
            localStorage.setItem('aida-is-fullscreen', isFullscreen);
            localStorage.setItem('aida-theme', theme);
        } catch (e) {
            console.warn('Could not save widget state to localStorage', e);
        }
    }, [isOpen, isFullscreen, theme]);

    /**
     * Toggles the chat panel's visibility with animations.
     */
    const toggleChatVisibility = useCallback(() => {
        if (isOpen) {
            setIsClosing(true);
            
            setTimeout(() => {
                setIsOpen(false);
                setIsClosing(false);
                // Note: We no longer reset isFullscreen to false here 
                // so that the preference is remembered next time it opens.
            }, 300); 
        } else {
            setIsOpen(true);
            // On mobile, automatically go fullscreen
            if (window.innerWidth <= 768) {
                setIsFullscreen(true);
            }
        }
    }, [isOpen]);

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