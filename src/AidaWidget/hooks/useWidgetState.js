import { useState, useEffect, useCallback } from 'react';

/**
 * Manages the core UI state of the widget shell.
 * @returns An object with state and handlers for the widget's UI.
 */
export const useWidgetState = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Load theme from localStorage or default to 'dark'
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('aida-theme') || 'dark';
        } catch (_) {
            return 'dark';
        }
    });

    // Persist theme to localStorage whenever it changes.
    useEffect(() => {
        try {
            localStorage.setItem('aida-theme', theme);
        } catch (_) {
            console.warn('Could not save theme to localStorage.');
        }
    }, [theme]);

    /**
     * Toggles the chat panel's visibility with animations.
     * The main AidaWidget component will wrap this with other logic (like stopping streams).
     */
    const toggleChatVisibility = useCallback(() => {
        if (isOpen) {
            // Start the closing animation
            setIsClosing(true);
            
            // After the animation duration, fully close the widget
            setTimeout(() => {
                setIsOpen(false);
                setIsClosing(false);
                setIsFullscreen(false); // Always reset fullscreen on close
            }, 300); // Must match animation duration in CSS
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