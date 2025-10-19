import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * A reusable hook for managing a countdown timer.
 * @param {Function} onComplete - The callback function to execute when the countdown finishes.
 * @param {number} duration - The duration of the countdown in seconds.
 * @returns An object containing the countdown state and control functions.
 */
export const useCountdown = (onComplete, duration = 3) => {
    const [countdown, setCountdown] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef(null);
    const onCompleteRef = useRef(onComplete);

    // Keep the onComplete callback reference up-to-date to avoid stale closures.
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const cancel = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setCountdown(null);
        setIsPaused(false);
    }, []);

    const start = useCallback(() => {
        cancel(); // Ensure any existing timer is cleared before starting a new one.
        setCountdown(duration);
    }, [cancel, duration]);

    // The main timer effect
    useEffect(() => {
        if (countdown === null || isPaused) {
            return;
        }

        intervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev !== null && prev <= 1) {
                    cancel();
                    onCompleteRef.current?.();
                    return null;
                }
                return prev ? prev - 1 : null;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [countdown, isPaused, cancel]);

    // Renaming the useCountdown return object to be more specific when used
    // e.g. const { countdown: autoSendCountdown, ... } = useTimers(...)
    return {
        countdown,
        isPaused,
        start,
        cancel,
        setIsPaused,
    };
};