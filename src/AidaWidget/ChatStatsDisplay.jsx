/* src/AidaWidget/ChatStatsDisplay.jsx */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const AUTO_ADVANCE_MS = 6500;
const DRAG_THRESHOLD = 36;      // px a drag must travel to commit a slide change
const WHEEL_THRESHOLD = 28;     // accumulated wheel delta before we advance
const AXIS_LOCK_PX = 6;         // min movement before we lock to an axis

/**
 * Public-transport style info panel for the chat header.
 *
 * Cycles through "slides" (chat cost, tokens, messages, ...). In the future
 * every slide can also be an ad or a custom render - any slide can provide its
 * own `content` node instead of the default `label`/`value` layout.
 *
 * Interactions:
 *  - Pointer drag (mouse) / touch swipe horizontally to navigate
 *  - Wheel or trackpad scroll (horizontal or vertical) to advance
 *  - Auto-advances every few seconds; pauses on hover / while dragging
 */
const ChatStatsDisplay = ({ slides = [] }) => {
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
    // Uses a native listener with { passive: false } so preventDefault actually
    // stops the wheel from scrolling whatever the widget is sitting on top of.
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

    const trackStyle = useMemo(() => ({
        transform: `translateX(calc(-${index * 100}% + ${dragX}px))`,
        transition: isDragging ? 'none' : 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
    }), [index, dragX, isDragging]);

    if (slideCount === 0) return null;

    const isStatic = slideCount <= 1;

    return (
        <div
            ref={rootRef}
            className={`chat-stats-display ${isDragging ? 'is-dragging' : ''} ${isStatic ? 'is-static' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => { if (!dragStateRef.current.active) setIsPaused(false); }}
            role="group"
            aria-label="Chat statistics"
        >
            <div className="chat-stats-display__viewport">
                <div className="chat-stats-display__track" style={trackStyle}>
                    {slides.map((slide) => (
                        <div className="chat-stats-display__slide" key={slide.id}>
                            {slide.content
                                ? slide.content
                                : (
                                    <>
                                        {slide.label && (
                                            <div className="chat-stats-display__label">{slide.label}</div>
                                        )}
                                        <div className="chat-stats-display__value">{slide.value}</div>
                                    </>
                                )}
                        </div>
                    ))}
                </div>
            </div>

            {!isStatic && (
                <div className="chat-stats-display__dots" aria-hidden="true">
                    {slides.map((slide, i) => (
                        <span
                            key={slide.id}
                            className={`chat-stats-display__dot ${i === index ? 'is-active' : ''}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChatStatsDisplay;