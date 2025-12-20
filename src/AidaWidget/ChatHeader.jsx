// src/AidaWidget/ChatHeader.jsx
import React, { useState, useRef, useEffect } from 'react';
import { HiPlus, HiOutlineSun, HiOutlineMoon, HiClock, HiEllipsisVertical, HiMinusSmall, HiOutlineArrowsPointingOut, HiPencilSquare, HiCheck, HiXMark } from 'react-icons/hi2';
import { LuHandHeart } from 'react-icons/lu'; // ✨ ADDED: Import the heart-in-hand icon
import SevenSegmentDisplay from './SevenSegmentDisplay';
import CreditsDisplay from './CreditsDisplay';

const ChatHeader = ({
    displayText,
    lastCost = 0,
    userId,
    resetChat,
    toggleFullscreen,
    toggleChat,
    theme = 'dark',
    paymentLinkConfig, 
    onToggleTheme,
    onToggleHistory,
    onDisplayClick,
    showFullscreenToggle = true,
    isMobileViewport = false,
    sessionTitle = "New Chat",
    onRenameSession,
    isSessionActive = false,
}) => {
    // Use a solid dark shade so it looks identical in both themes
    const headerColors = 'bg-[#0f172a] text-white backdrop-blur-md border-b border-white/10';
    const hoverColor = theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-200/70';
    const accentColor = '#ffffff';
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    
    // ✨ NEW: Ref for measuring header width
    const headerRef = useRef(null);
    const [isNarrow, setIsNarrow] = useState(false);

    // ✨ NEW: State for title editing
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(sessionTitle);
    const titleInputRef = useRef(null);

    useEffect(() => {
        if (!isMenuOpen) return;
        const handleClick = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isMenuOpen]);

    // ✨ NEW: Observe header width to toggle layout mode
    useEffect(() => {
        if (!headerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // If width is less than 480px, hide extras to show title
                setIsNarrow(entry.contentRect.width < 480);
            }
        });

        observer.observe(headerRef.current);
        return () => observer.disconnect();
    }, []);

    // ✨ NEW: Sync draft with prop when not editing
    useEffect(() => {
        if (!isEditingTitle) {
            setTitleDraft(sessionTitle);
        }
    }, [sessionTitle, isEditingTitle]);

    // ✨ NEW: Focus input when editing starts
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const closeMenu = () => setIsMenuOpen(false);

    // ✨ NEW: Handle title save
    const handleSaveTitle = () => {
        if (titleDraft.trim() && onRenameSession) {
            onRenameSession(titleDraft.trim());
        } else {
            setTitleDraft(sessionTitle); // Revert if empty
        }
        setIsEditingTitle(false);
    };

    const handleCancelEdit = () => {
        setTitleDraft(sessionTitle);
        setIsEditingTitle(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveTitle();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEdit();
        }
    };

    return (
        <div ref={headerRef} className={`${headerColors} glass-header pl-2 pr-1 py-2 flex justify-between items-center rounded-none relative`}>
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                {onDisplayClick ? (
                    <button
                        type="button"
                        onClick={onDisplayClick}
                        className="p-0 bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-md shrink-0"
                        aria-label="Configure instructions"
                    >
                        <SevenSegmentDisplay text={displayText} />
                    </button>
                ) : (
                    <SevenSegmentDisplay text={displayText} />
                )}

                {/* ✨ NEW: Editable Session Title */}
                <div className="flex-1 min-w-0 flex items-center">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-1 w-full max-w-[200px]">
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={titleDraft}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleSaveTitle}
                                className="w-full bg-white/10 border border-white/20 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 min-w-0 group cursor-pointer" onClick={() => isSessionActive && setIsEditingTitle(true)}>
                            <span className="text-sm font-medium truncate text-gray-200 group-hover:text-white transition-colors" title={sessionTitle}>
                                {sessionTitle}
                            </span>
                            {isSessionActive && (
                                <HiPencilSquare className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            )}
                        </div>
                    )}
                </div>

                {/* ✨ MODIFIED: Hide Balance and Support on narrow screens to prioritize Title */}
                {!isNarrow && (
                    <div className="shrink-0 flex items-center gap-2">
                        <CreditsDisplay userId={userId} lastCost={lastCost} theme={theme} />

                        {/* ✨ NEW: Support/Payment Button */}
                        {paymentLinkConfig?.show && paymentLinkConfig?.url && (
                            <a
                                href={paymentLinkConfig.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-md transition-colors bg-white/10 hover:bg-white/20 text-white shadow-sm"
                                title={paymentLinkConfig.text || 'Support Us'}
                            >
                                <LuHandHeart className="w-4 h-4 text-brand-coral" />
                                {paymentLinkConfig.text}
                            </a>
                        )}
                    </div>
                )}
            </div>
            <div className="flex items-center space-x-2 pr-1 shrink-0">
                {showFullscreenToggle && typeof toggleFullscreen === 'function' && (
                    <button
                        onClick={toggleFullscreen}
                        className={`p-1 rounded-full ${hoverColor} transition-colors`}
                        style={{ color: accentColor }}
                        aria-label="Toggle Fullscreen"
                        title="Toggle fullscreen"
                    >
                        <HiOutlineArrowsPointingOut className="w-5 h-5" />
                    </button>
                )}
                <button onClick={toggleChat} className={`p-1 rounded-full ${hoverColor}`} aria-label="Minimize Chat">
                    <HiMinusSmall className="w-5 h-5" />
                </button>
                {isMobileViewport && (
                    <button
                        onClick={resetChat}
                        className={`p-1 rounded-full ${hoverColor}`}
                        aria-label="New chat"
                        title="New chat"
                    >
                        <HiPlus className="w-5 h-5" />
                    </button>
                )}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen((open) => !open)}
                        className={`p-1 rounded-full ${hoverColor}`}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        aria-label="More actions"
                        title="More actions"
                    >
                        <HiEllipsisVertical className="w-5 h-5" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-40 rounded-lg bg-slate-800/95 text-sm shadow-lg border border-white/10 py-1 z-50">
                                {!isMobileViewport && (
                                    <button
                                        onClick={() => { resetChat(); closeMenu(); }}
                                        className="w-full px-3 py-2 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 flex items-center gap-2"
                                        role="menuitem"
                                    >
                                        <HiPlus className="w-4 h-4" />
                                        <span>New chat</span>
                                    </button>
                                )}
                                {onToggleHistory && (
                                    <button
                                        onClick={() => { onToggleHistory(); closeMenu(); }}
                                        className="w-full px-3 py-2 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 flex items-center gap-2"
                                        role="menuitem"
                                    >
                                        <HiClock className="w-4 h-4" />
                                        <span>Chat history</span>
                                    </button>
                                )}
                                {onToggleTheme && (
                                    <button
                                        onClick={() => { onToggleTheme(); closeMenu(); }}
                                        className="w-full px-3 py-2 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 flex items-center gap-2"
                                        role="menuitem"
                                    >
                                        {theme === 'dark' ? <HiOutlineMoon className="w-4 h-4" /> : <HiOutlineSun className="w-4 h-4" />}
                                        <span>Toggle theme</span>
                                    </button>
                                )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatHeader;