/* src/AidaWidget/LinkPopover.jsx */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiArrowTopRightOnSquare, HiPaperClip, HiEye } from 'react-icons/hi2';

const LinkPopover = ({
    url,
    onScrape,
    onEmbed,
    theme = 'dark',
    children,
    actions,
    anchorRef: externalAnchorRef,
    open,
    onOpenChange,
    title,
}) => {
    const isControlled = typeof open !== 'undefined';
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = isControlled ? open : internalOpen;

    const setOpen = useCallback((next) => {
        if (!isControlled) setInternalOpen(next);
        onOpenChange?.(next);
    }, [isControlled, onOpenChange]);

    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const isDark = theme === 'dark';

    const getAnchorEl = useCallback(
        () => externalAnchorRef?.current || triggerRef.current,
        [externalAnchorRef]
    );

    const computeCoords = useCallback(() => {
        const el = getAnchorEl();
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const PW = 244;

        const rowCount = actions
            ? actions.length
            : 1 + (onEmbed ? 1 : 0) + (onScrape ? 1 : 0);
        const PH = rowCount * 44 + 44;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const left = Math.max(8, Math.min(rect.left, vw - PW - 8));
        const top =
            rect.bottom + PH + 10 > vh
                ? Math.max(8, rect.top - PH - 6)
                : rect.bottom + 6;

        setCoords({ top, left });
    }, [getAnchorEl, actions, onEmbed, onScrape]);

    const handleClick = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isOpen) computeCoords();
            setOpen(!isOpen);
        },
        [isOpen, computeCoords, setOpen]
    );

    const close = useCallback(() => setOpen(false), [setOpen]);

    useEffect(() => {
        if (!isOpen) return;
        computeCoords();
    }, [isOpen, computeCoords]);

    useEffect(() => {
        if (!isOpen) return;
        const onDown = (e) => {
            if (
                !popoverRef.current?.contains(e.target) &&
                !getAnchorEl()?.contains(e.target)
            ) {
                close();
            }
        };
        const onKey = (e) => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen, close, getAnchorEl]);

    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const baseActionClass = `w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
        isDark ? 'hover:bg-white/10' : 'hover:bg-gray-50'
    }`;

    return (
        <>
            {children && (
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
            )}

            {isOpen &&
                typeof document !== 'undefined' &&
                document.body &&
                createPortal(
                    <div
                        ref={popoverRef}
                        role="dialog"
                        aria-label={title || (url ? 'Link options' : 'Options')}
                        className={`fixed z-[99999] w-60 rounded-xl overflow-hidden shadow-2xl border ${
                            isDark
                                ? 'bg-gray-800 border-gray-700 text-gray-100'
                                : 'bg-white border-gray-200 text-gray-900'
                        }`}
                        style={{ top: coords.top, left: coords.left }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className={`px-3 py-2 text-[10px] truncate border-b ${
                                isDark
                                    ? 'text-gray-400 border-gray-700 bg-gray-900/60'
                                    : 'text-gray-500 border-gray-100 bg-gray-50'
                            }`}
                            title={url || title}
                        >
                            {url || title || 'Options'}
                        </div>

                        {actions ? (
                            actions.map((action, idx) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.id}
                                        type="button"
                                        className={`${baseActionClass} ${
                                            idx > 0
                                                ? `border-t ${
                                                      isDark
                                                          ? 'border-gray-700'
                                                          : 'border-gray-100'
                                                  }`
                                                : ''
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            action.onClick?.();
                                            close();
                                        }}
                                    >
                                        {Icon && (
                                            <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                                        )}
                                        <span>{action.label}</span>
                                    </button>
                                );
                            })
                        ) : (
                            <>
                                {onEmbed && (
                                    <button
                                        type="button"
                                        className={baseActionClass}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEmbed(url);
                                            close();
                                        }}
                                    >
                                        <HiEye className="w-4 h-4 flex-shrink-0 opacity-70" />
                                        <span>Open here</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className={baseActionClass}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(
                                            url,
                                            '_blank',
                                            'noopener,noreferrer'
                                        );
                                        close();
                                    }}
                                >
                                    <HiArrowTopRightOnSquare className="w-4 h-4 flex-shrink-0 opacity-70" />
                                    <span>Open in new tab</span>
                                </button>

                                {onScrape && (
                                    <button
                                        type="button"
                                        className={`${baseActionClass} border-t ${
                                            isDark
                                                ? 'border-gray-700 text-blue-300'
                                                : 'border-gray-100 text-blue-600'
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
                            </>
                        )}
                    </div>,
                    document.body
                )}
        </>
    );
};

export default LinkPopover;