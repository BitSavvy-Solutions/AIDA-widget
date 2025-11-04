/* src/AidaWidget/hooks/useDisplayAnimation.js */
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Manages the text for a seven-segment display, showing idle "eye" animations,
 * a loading sequence, or a default string.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the parent container is open.
 * @param {boolean} props.isLoading - Whether an async operation is in progress.
 * @returns {string} The text string to be displayed.
 */
export const useDisplayAnimation = ({ isOpen, isLoading }) => {
    const [displayText, setDisplayText] = useState("AL:LY");
    const [eyeState, setEyeState] = useState('open');
    const blinkTimerRef = useRef(null);
    const loadingIntervalRef = useRef(null);

    const stopBlinking = useCallback(() => {
        if (blinkTimerRef.current) {
            clearTimeout(blinkTimerRef.current);
            blinkTimerRef.current = null;
        }
        setEyeState('open');
    }, []);

    const startBlinking = useCallback(() => {
        stopBlinking(); // Ensure no other timers are running
        const scheduleNextBlink = () => {
            const nextBlinkDelay = 2000 + Math.random() * 5000; // 2-7 seconds
            blinkTimerRef.current = setTimeout(() => {
                setEyeState('half-closed');
                setTimeout(() => setEyeState('closed'), 100);
                setTimeout(() => setEyeState('half-closed'), 160);
                setTimeout(() => {
                    setEyeState('open');
                    scheduleNextBlink();
                }, 260);
            }, nextBlinkDelay);
        };
        setEyeState('open');
        scheduleNextBlink();
    }, [stopBlinking]);

    // Effect to translate eye state into 7-segment characters
    useEffect(() => {
        if (isOpen && !isLoading) {
            if (eyeState === 'open') setDisplayText(" I1 ");
            else if (eyeState === 'half-closed') setDisplayText(" TT ");
            else setDisplayText(" __ ");
        }
    }, [eyeState, isOpen, isLoading]);

    // Main effect to orchestrate loading vs. blinking
    useEffect(() => {
        if (isLoading) {
            stopBlinking();
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
            const states = ["--:--", "=-:--", "==-:-", "==:=-", "==:=="];
            let i = 0;
            loadingIntervalRef.current = setInterval(() => {
                setDisplayText(states[i++ % states.length]);
            }, 300);
        } else {
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
                loadingIntervalRef.current = null;
            }
            if (isOpen) {
                startBlinking();
            } else {
                setDisplayText("AL:LY");
            }
        }
        // Cleanup on unmount or when dependencies change
        return () => {
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
            if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        };
    }, [isLoading, isOpen, startBlinking, stopBlinking]);

    return displayText; // The hook's only job is to return the final string
};