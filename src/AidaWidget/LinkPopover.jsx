/* src/AidaWidget/LinkPopover.jsx */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiArrowTopRightOnSquare, HiPaperClip } from 'react-icons/hi2';

/**
 * Wraps any inline content (usually a URL label) and shows a small popover on
 * click with two choices:
 *   1. Open in a new browser tab.
 *   2. Fetch the page and add it as an attachment (same workflow as the URL
 *      input inside AttachmentModal).
 *
 * @param {string}   url       – The full URL string.
 * @param {Function} [onScrape] – Called with `url` when the user chooses "Fetch".
 *                                If omitted, that option is hidden.
 * @param {string}   [theme]   – 'dark' | 'light'
 * @param {*}        children  – The visible trigger content.
 */
const LinkPopover = ({ url, onScrape, theme = 'dark', children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const isDark = theme === 'dark';

    // ── Position ──────────────────────────────────────────────────────────────
    const computeCoords = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const PW = 244;                            // fixed popover width
        const PH = onScrape ? 112 : 70;            // estimated height
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const left = Math.max(8, Math.min(rect.left, vw - PW - 8));
        const top  =
            rect.bottom + PH + 10 > vh
                ? Math.max(8, rect.top - PH - 6)  // open above
                : rect.bottom + 6;                 // open below

        setCoords({ top, left });
    }, [onScrape]);

    // ── Toggle ────────────────────────────────────────────────────────────────
    const handleClick = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isOpen) computeCoords();
            setIsOpen((p) => !p);
        },
        [isOpen, computeCoords],
    );

    const close = useCallback(() => setIsOpen(false), []);

    // ── Close on outside-click / Escape ───────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const onDown = (e) => {
            if (
                !popoverRef.current?.contains(e.target) &&
                !triggerRef.current?.contains(e.target)
            ) close();
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen, close]);

    // ── Popover markup (portal → document.body) ───────────────────────────────
    const popoverNode = (
        <div
            ref={popoverRef}
            role="dialog"
            aria-label="Link options"
            className={`fixed z-[300] w-60 rounded-xl overflow-hidden shadow-2xl border ${
                isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-100'
                    : 'bg-white border-gray-200 text-gray-900'
            }`}
            style={{ top: coords.top, left: coords.left }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* URL preview */}
            <div
                className={`px-3 py-2 text-[10px] font-mono truncate border-b ${
                    isDark
                        ? 'text-gray-400 border-gray-700 bg-gray-900/60'
                        : 'text-gray-500 border-gray-100 bg-gray-50'
                }`}
                title={url}
            >
                {url}
            </div>

            {/* ① Open in new tab */}
            <button
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-50'
                }`}
                onClick={(e) => {
                    e.stopPropagation();
                    window.open(url, '_blank', 'noopener,noreferrer');
                    close();
                }}
            >
                <HiArrowTopRightOnSquare className="w-4 h-4 flex-shrink-0 opacity-70" />
                <span>Open in new tab</span>
            </button>

            {/* ② Fetch & attach */}
            {onScrape && (
                <button
                    type="button"
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors border-t ${
                        isDark
                            ? 'hover:bg-white/10 border-gray-700 text-blue-300'
                            : 'hover:bg-blue-50 border-gray-100 text-blue-600'
                    }`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onScrape(url);
                        close();
                    }}
                >
                    <HiPaperClip className="w-4 h-4 flex-shrink-0 opacity-70" />
                    <span>Fetch &amp; attach content</span>
                </button>
            )}
        </div>
    );

    return (
        <>
            <span
                ref={triggerRef}
                role="button"
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleClick(e);
                }}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                className="inline cursor-pointer underline decoration-dotted underline-offset-2 hover:decoration-solid transition-[text-decoration]"
                title="Click for link options"
            >
                {children}
            </span>
            {isOpen &&
                typeof document !== 'undefined' &&
                createPortal(popoverNode, document.body)}
        </>
    );
};

export default LinkPopover;