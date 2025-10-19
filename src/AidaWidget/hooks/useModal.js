import { useState, useCallback, useEffect } from 'react';

/**
 * A generic hook to manage the state and "Escape" key closing of a modal.
 * @param {boolean} [initialState=false] - The initial open state of the modal.
 * @returns An object with modal state and control functions.
 */
export const useModal = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState);
    
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(p => !p), []);

    // Effect to listen for the "Escape" key to close the modal.
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                close();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, close]);

    return { isOpen, open, close, toggle };
};