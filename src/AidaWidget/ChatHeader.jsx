// src/AidaWidget/ChatHeader.jsx
import React, { useState, useRef, useEffect } from 'react';
import { HiXMark, HiArrowsPointingOut, HiPlus, HiOutlineSun, HiOutlineMoon, HiClock, HiEllipsisVertical } from 'react-icons/hi2';
import SevenSegmentDisplay from './SevenSegmentDisplay';
import CreditsDisplay from './CreditsDisplay';

const ChatHeader = ({ displayText, lastCost = 0, userId, resetChat, toggleFullscreen, toggleChat, theme = 'dark', onToggleTheme, onToggleHistory, onDisplayClick }) => {
    // Use a solid dark shade so it looks identical in both themes
    const headerColors = 'bg-[#0f172a] text-white backdrop-blur-md border-b border-white/10';
    const hoverColor = 'hover:bg-white/10';
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

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


    const closeMenu = () => setIsMenuOpen(false);

    return (
        <div className={`${headerColors} glass-header pl-4 pr-1 py-4 flex justify-between items-center rounded-none relative`}>
            <div className="flex items-center">
                {onDisplayClick ? (
                    <button
                        type="button"
                        onClick={onDisplayClick}
                        className="mr-3 p-0 bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-md"
                        aria-label="Configure instructions"
                    >
                        <SevenSegmentDisplay text={displayText} />
                    </button>
                ) : (
                    <SevenSegmentDisplay text={displayText} className="mr-3" />
                )}
                {/* Use the new CreditsDisplay component */}
                <CreditsDisplay userId={userId} lastCost={lastCost} theme={theme} />
            </div>
            <div className="flex items-center space-x-2 pr-1">
                <button onClick={toggleFullscreen} className={`p-1 rounded-full ${hoverColor}`} aria-label="Toggle Fullscreen">
                    <HiArrowsPointingOut className="w-5 h-5" />
                </button>
                <button onClick={toggleChat} className={`p-1 rounded-full ${hoverColor}`} aria-label="Close Chat">
                    <HiXMark className="w-5 h-5" />
                </button>
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
                                <button
                                    onClick={() => { resetChat(); closeMenu(); }}
                                    className="w-full px-3 py-2 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 flex items-center gap-2"
                                    role="menuitem"
                                >
                                    <HiPlus className="w-4 h-4" />
                                    <span>New chat</span>
                                </button>
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
