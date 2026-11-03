/* src/AidaWidget/headerInfo/HeaderInfoDisplay.jsx */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    HiCurrencyDollar, HiOutlineQueueList, HiOutlineCpuChip, HiOutlineGlobeAlt,
} from 'react-icons/hi2';

const AUTO_ADVANCE_MS = 6500;
const DRAG_THRESHOLD = 36;      // px a drag must travel to commit a slide change
const WHEEL_THRESHOLD = 28;     // accumulated wheel delta before we advance
const AXIS_LOCK_PX = 6;         // min movement before we lock to an axis

const DEFAULT_ICONS = {
    cost: HiCurrencyDollar,
    tokens: HiOutlineCpuChip,
    messages: HiOutlineQueueList,
    web: HiOutlineGlobeAlt,
};

/**
 * Public-transport style info panel for the chat header.
 *
 * Cycles through "slides" (chat cost, credits, tokens, ...). Any slide can
 * provide its own `content` node instead of the default icon/label/value
 * layout (this is the escape hatch for future ad slides).
 *
 * Interactions:
 *  - Pointer drag (mouse) / touch swipe horizontally to navigate
 *  - Wheel or trackpad scroll to advance
 *  - Auto-advances every few seconds; pauses on hover / while dragging
 *  - Arrow keys when focused
 */
const HeaderInfoDisplay = ({ slides = [], theme = 'dark' }) => {
    const [index, setIndex] = useState(0);
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const rootRef = useRef(null);
    const dragStateRef = useRef({
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        axis: null,
    });
    const dragXRef = useRef(0);
    const wheelAccumRef = useRef(0);
    const wheelResetTimerRef = useRef(null);

    const slideCount = slides.length;

    // Keep the index in range if slides array changes shape.
    useEffect(() => {
        if (slideCount === 0) {
            if (index !== 0) setIndex(0);
        } else if (index > slideCount - 1) {
            setIndex(slideCount - 1);
        }
    }, [slideCount, index]);

    const goNext = useCallback(() => {
        setIndex((prev) => (slideCount > 0 ? (prev + 1) % slideCount : 0));
    }, [slideCount]);

    const goPrev = useCallback(() => {
        setIndex((prev) => (slideCount > 0 ? (prev - 1 + slideCount) % slideCount : 0));
    }, [slideCount]);

    // Auto-advance. Depends on `index` so the timer restarts after every
    // transition (auto OR manual), effectively debouncing rapid interactions.
    useEffect(() => {
        if (slideCount <= 1 || isPaused || isDragging) return undefined;
        const timer = setTimeout(goNext, AUTO_ADVANCE_MS);
        return () => clearTimeout(timer);
    }, [slideCount, isPaused, isDragging, index, goNext]);

    // ---- Pointer (mouse + touch) drag navigation ----
    const handlePointerDown = useCallback((event) => {
        if (slideCount <= 1) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const state = dragStateRef.current;
        state.active = true;
        state.pointerId = event.pointerId;
        state.startX = event.clientX;
        state.startY = event.clientY;
        state.axis = null;
        dragXRef.current = 0;
        setIsDragging(true);
        setIsPaused(true);
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* noop */ }
    }, [slideCount]);

    const handlePointerMove = useCallback((event) => {
        const state = dragStateRef.current;
        if (!state.active || state.pointerId !== event.pointerId) return;

        const dx = event.clientX - state.startX;
        const dy = event.clientY - state.startY;

        if (!state.axis) {
            if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
            state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            if (state.axis === 'y') {
                // Vertical gesture: cancel drag, let the page/container scroll.
                state.active = false;
                state.pointerId = null;
                setIsDragging(false);
                setIsPaused(false);
                return;
            }
        }

        if (state.axis === 'x') {
            dragXRef.current = dx;
            setDragX(dx);
        }
    }, []);

    const finishDrag = useCallback((event) => {
        const state = dragStateRef.current;
        const wasHorizontalDrag = state.active && state.axis === 'x';
        const finalX = dragXRef.current;

        state.active = false;
        state.pointerId = null;
        state.axis = null;
        dragXRef.current = 0;

        setIsDragging(false);
        setIsPaused(false);
        setDragX(0);

        try { event?.currentTarget?.releasePointerCapture?.(event.pointerId); } catch { /* noop */ }

        if (!wasHorizontalDrag) return;
        if (finalX <= -DRAG_THRESHOLD) goNext();
        else if (finalX >= DRAG_THRESHOLD) goPrev();
    }, [goNext, goPrev]);

    // ---- Mouse wheel / trackpad navigation ----
    // Native listener with { passive: false } so preventDefault actually
    // stops the wheel from scrolling whatever the widget sits on top of.
    useEffect(() => {
        const el = rootRef.current;
        if (!el || slideCount <= 1) return undefined;

        const onWheel = (event) => {
            const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
                ? event.deltaX
                : event.deltaY;

            wheelAccumRef.current += dominantDelta;
            if (event.cancelable) event.preventDefault();

            if (Math.abs(wheelAccumRef.current) >= WHEEL_THRESHOLD) {
                if (wheelAccumRef.current > 0) goNext();
                else goPrev();
                wheelAccumRef.current = 0;
            }

            if (wheelResetTimerRef.current) clearTimeout(wheelResetTimerRef.current);
            wheelResetTimerRef.current = setTimeout(() => {
                wheelAccumRef.current = 0;
            }, 220);
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [slideCount, goNext, goPrev]);

    // Cleanup the wheel debounce timer on unmount.
    useEffect(() => () => {
        if (wheelResetTimerRef.current) clearTimeout(wheelResetTimerRef.current);
    }, []);

    // ---- Keyboard (when focused) ----
    const handleKeyDown = useCallback((event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); goNext(); }
        else if (event.key === 'ArrowLeft') { event.preventDefault(); goPrev(); }
    }, [goNext, goPrev]);

    const trackStyle = useMemo(() => ({
        transform: `translateX(calc(-${index * 100}% + ${dragX}px))`,
        transition: isDragging ? 'none' : 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
    }), [index, dragX, isDragging]);

    if (slideCount === 0) return null;

    const isStatic = slideCount <= 1;

    return (
        <div
            ref={rootRef}
            className={`header-info-display ${isDragging ? 'is-dragging' : ''} ${isStatic ? 'is-static' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onKeyDown={handleKeyDown}
            tabIndex={isStatic ? -1 : 0}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => { if (!dragStateRef.current.active) setIsPaused(false); }}
            role="group"
            aria-roledescription="Info carousel"
            aria-label={`Info: ${slides[index]?.label ?? ''} ${slides[index]?.value ?? ''}`}
        >
            <div className="header-info-display__viewport">
                <div className="header-info-display__track" style={trackStyle}>
                    {slides.map((slide) => {
                        // Custom-content slides (ads later) render as-is.
                        if (slide.content) {
                            return (
                                <div key={slide.id} className="header-info-display__slide">
                                    {slide.content}
                                </div>
                            );
                        }
                        const Icon = slide.icon || DEFAULT_ICONS[slide.kind];
                        return (
                            <div key={slide.id} className="header-info-display__slide">
                                <div className="header-info-display__top">
                                    {Icon && <Icon className="header-info-display__icon" aria-hidden="true" />}
                                    {slide.label && (
                                        <span className="header-info-display__label">{slide.label}</span>
                                    )}
                                </div>
                                <div className="header-info-display__value" title={slide.value}>
                                    {slide.value}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {!isStatic && (
                <div className="header-info-display__dots" aria-hidden="true">
                    {slides.map((slide, i) => (
                        <span
                            key={slide.id}
                            className={`header-info-display__dot ${i === index ? 'is-active' : ''}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HeaderInfoDisplay;