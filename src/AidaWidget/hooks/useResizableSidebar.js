import { useState, useEffect, useRef, useCallback } from 'react';

const SIDEBAR_WIDTH_STORAGE_KEY = 'aida-widget-sidebar-width';
const DEFAULT_DESKTOP_WIDTH = 420;
const MIN_DESKTOP_WIDTH = 360;
const MAX_DESKTOP_WIDTH = 720;
const VIEWPORT_PADDING = 48;

/**
 * Computes the effective min/max bounds for the sidebar given a viewport width.
 */
const getEffectiveBounds = (viewportWidth) => {
    const safeViewport = typeof viewportWidth === 'number' && viewportWidth > 0 ? viewportWidth : undefined;
    if (!safeViewport) {
        return { min: MIN_DESKTOP_WIDTH, max: MAX_DESKTOP_WIDTH };
    }
    const max = Math.min(MAX_DESKTOP_WIDTH, Math.max(240, safeViewport - VIEWPORT_PADDING));
    const min = Math.min(MIN_DESKTOP_WIDTH, max);
    return { min, max };
};

/**
 * Clamps a given width between the min/max values, considering viewport size.
 */
const clampSidebarWidth = (width, viewportWidth) => {
    const { min, max } = getEffectiveBounds(viewportWidth);
    return Math.min(Math.max(width, min), max);
};

/**
 * Encapsulates all logic for the resizable sidebar feature.
 * @param {object} config - The configuration object.
 * @param {boolean} config.isOpen - Is the main widget panel open?
 * @param {boolean} config.isFullscreen - Is the widget in fullscreen mode?
 * @param {boolean} config.isMobileViewport - Is the viewport considered mobile?
 * @param {boolean} config.isEnabled - Feature flag to enable/disable this hook's functionality.
 * @param {Function} [config.onRequestFullscreen] - Optional callback to switch to fullscreen.
 * @returns An object with sidebar state and props for the DOM elements.
 */
export const useResizableSidebar = ({ isOpen, isFullscreen, isMobileViewport, isEnabled, onRequestFullscreen }) => {
    const sidebarRef = useRef(null);
    const originalBodyPaddingRef = useRef(null);
    const resizeListenersRef = useRef({ move: null, up: null });
    const sidebarWidthRef = useRef(DEFAULT_DESKTOP_WIDTH);

    const [isResizing, setIsResizing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        if (typeof window === 'undefined' || !isEnabled) return DEFAULT_DESKTOP_WIDTH;
        try {
            const stored = Number.parseInt(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY) ?? '', 10);
            if (Number.isFinite(stored)) {
                return clampSidebarWidth(stored, window.innerWidth);
            }
        } catch (_) { /* ignore */ }
        return clampSidebarWidth(DEFAULT_DESKTOP_WIDTH, window.innerWidth);
    });

    // Keep a ref to the width to avoid stale closures in event listeners.
    useEffect(() => {
        if (!isEnabled) return;
        sidebarWidthRef.current = sidebarWidth;
    }, [sidebarWidth, isEnabled]);
    
    // Recalculate clamped width on viewport resize.
    useEffect(() => {
        if (typeof window === 'undefined' || !isEnabled) return;
        const handleResize = () => {
            const clamped = clampSidebarWidth(sidebarWidthRef.current, window.innerWidth || 0);
            if (clamped !== sidebarWidthRef.current) {
                setSidebarWidth(clamped);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        return () => window.removeEventListener('resize', handleResize);
    }, [isEnabled]);

    // Persist width to localStorage when resizing stops.
    useEffect(() => {
        if (typeof window === 'undefined' || !isEnabled || isResizing) return;
        try {
            localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
        } catch (_) { /* ignore */ }
    }, [sidebarWidth, isResizing, isEnabled]);

    // Main effect to handle body padding and ResizeObserver.
    useEffect(() => {
        if (typeof document === 'undefined' || !isEnabled) return;
        const body = document.body;
        if (!body) return;

        const updatePageOffset = () => {
            if (!sidebarRef.current) return;
            const width = sidebarRef.current.offsetWidth ?? 0;
            body.style.setProperty('--aida-widget-offset', `${Math.round(width)}px`);
        };

        let resizeObserver = null;
        if (isOpen && !isFullscreen && typeof ResizeObserver !== 'undefined') {
            if (originalBodyPaddingRef.current === null) {
                originalBodyPaddingRef.current = window.getComputedStyle(body).paddingRight || '0px';
                body.style.setProperty('--aida-original-padding-right', originalBodyPaddingRef.current);
            }
            body.classList.add('aida-widget-open');
            if (sidebarRef.current) {
                resizeObserver = new ResizeObserver(updatePageOffset);
                resizeObserver.observe(sidebarRef.current);
            }
            updatePageOffset();
        }

        return () => {
            resizeObserver?.disconnect();
            body.classList.remove('aida-widget-open');
            body.style.removeProperty('--aida-widget-offset');
            if (originalBodyPaddingRef.current !== null) {
                body.style.removeProperty('--aida-original-padding-right');
                originalBodyPaddingRef.current = null;
            }
        };
    }, [isOpen, isFullscreen, isEnabled]);

    // Cleanup drag listeners on unmount.
    useEffect(() => () => {
        const { move, up } = resizeListenersRef.current || {};
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (typeof document !== 'undefined') document.body.classList.remove('aida-widget-resizing');
    }, []);

    const handleResizeStart = useCallback((event) => {
        if (event.button !== 0 || isFullscreen || isMobileViewport || !isEnabled) return;
        event.preventDefault();
        event.stopPropagation();
        
        setIsResizing(true);
        document.body.classList.add('aida-widget-resizing');
        
        const startX = event.clientX;
        const viewportWidthAtStart = window.innerWidth || 0;
        const initialWidth = clampSidebarWidth(sidebarWidthRef.current, viewportWidthAtStart);
        
        const handlePointerMove = (moveEvent) => {
            const currentViewportWidth = window.innerWidth || viewportWidthAtStart || 0;
            const { max: currentMaxAllowedWidth } = getEffectiveBounds(currentViewportWidth);
            const delta = startX - moveEvent.clientX;
            const nextWidth = clampSidebarWidth(initialWidth + delta, currentViewportWidth);
            setSidebarWidth(nextWidth);

            if (
                typeof onRequestFullscreen === 'function' &&
                !isFullscreen &&
                nextWidth >= currentMaxAllowedWidth &&
                currentViewportWidth > 0 &&
                moveEvent.clientX <= currentViewportWidth * 0.5
            ) {
                onRequestFullscreen();
                finishResize();
            }
        };
        
        const finishResize = () => {
            setIsResizing(false);
            document.body.classList.remove('aida-widget-resizing');
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', finishResize);
            window.removeEventListener('pointercancel', finishResize);
        };

        resizeListenersRef.current = { move: handlePointerMove, up: finishResize };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', finishResize);
        window.addEventListener('pointercancel', finishResize);
    }, [isFullscreen, isMobileViewport, isEnabled, onRequestFullscreen]);

    // The props to be spread onto the respective DOM elements.
    const resizeHandleProps = {
        onPointerDown: handleResizeStart,
        className: `aida-resize-handle ${isResizing ? 'is-resizing' : ''}`,
    };

    const sidebarInlineStyle = {
        width: isEnabled && !isFullscreen ? `${sidebarWidth}px` : '100%',
        maxWidth: isEnabled && !isFullscreen ? 'min(100vw, 720px)' : '100%',
        height: '100%',
        transition: isResizing ? 'none' : 'width 0.3s ease, max-width 0.3s ease, height 0.3s ease, border-radius 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease'
    };

    return { sidebarRef, sidebarInlineStyle, resizeHandleProps, isResizing };
};
