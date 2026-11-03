/* src/AidaWidget/headerInfo/HeaderInfoDisplay.jsx */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    HiCurrencyDollar, HiOutlineQueueList, HiOutlineCpuChip, HiOutlineGlobeAlt,
} from 'react-icons/hi2';

const DRAG_THRESHOLD = 25;

const DEFAULT_ICONS = {
    cost: HiCurrencyDollar,
    tokens: HiOutlineCpuChip,
    messages: HiOutlineQueueList,
    web: HiOutlineGlobeAlt,
};

/**
 * A "public transport"-style info panel for the chat header.
 * Two-line slides (label on top, value below) cycling via swipe, drag or wheel.
 */
const HeaderInfoDisplay = ({ slides = [], theme = 'dark' }) => {
    const [index, setIndex] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const viewportRef = useRef(null);
    const dragStartXRef = useRef(null);

    const count = slides.length;

    const clampIndex = useCallback(
        (i) => (count === 0 ? 0 : Math.max(0, Math.min(count - 1, i))),
        [count]
    );

    // --- Pointer drag (mouse + touch + pen) ---
    const onPointerDown = (e) => {
        if (count < 2) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        dragStartXRef.current = e.clientX;
        setIsDragging(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (!isDragging || dragStartXRef.current === null) return;
        setDragOffset(e.clientX - dragStartXRef.current);
    };

    const endDrag = (e) => {
        if (!isDragging) return;
        const delta = (e.clientX ?? dragStartXRef.current ?? 0) - dragStartXRef.current;
        dragStartXRef.current = null;
        setIsDragging(false);
        setDragOffset(0);

        if (Math.abs(delta) > DRAG_THRESHOLD) {
            setIndex((prev) => clampIndex(prev + (delta < 0 ? 1 : -1)));
        }
    };

    // --- Wheel ---
    useEffect(() => {
        const el = viewportRef.current;
        if (!el || count < 2) return;
        const onWheel = (e) => {
            e.preventDefault();
            setIndex((prev) => clampIndex(prev + (e.deltaY > 0 || e.deltaX > 0 ? 1 : -1)));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [count, clampIndex]);

    if (count === 0) return null;

    const active = slides[clampIndex(index)];

    return (
        <div
            className={`header-info-display ${isDragging ? 'header-info-display--dragging' : ''}`}
            role="group"
            aria-roledescription="Info carousel"
            aria-label={`${active.label}: ${active.value}`}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); setIndex((p) => clampIndex(p + 1)); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex((p) => clampIndex(p - 1)); }
            }}
        >
            <div
                ref={viewportRef}
                className="header-info-display__viewport"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{ transform: `translateX(calc(${-clampIndex(index) * 100}% + ${dragOffset}px))` }}
            >
                {slides.map((slide) => {
                    const Icon = slide.icon || DEFAULT_ICONS[slide.kind];
                    return (
                        <div key={slide.id} className="header-info-display__slide">
                            <div className="header-info-display__top">
                                {Icon && <Icon className="header-info-display__icon" aria-hidden="true" />}
                                <span className="header-info-display__label">{slide.label}</span>
                            </div>
                            <div className="header-info-display__value" title={slide.value}>
                                {slide.value}
                            </div>
                        </div>
                    );
                })}
            </div>

            {count > 1 && (
                <div className="header-info-display__dots" aria-hidden="true">
                    {slides.map((s, i) => (
                        <span
                            key={s.id}
                            className={`header-info-display__dot ${i === clampIndex(index) ? 'is-active' : ''}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HeaderInfoDisplay;