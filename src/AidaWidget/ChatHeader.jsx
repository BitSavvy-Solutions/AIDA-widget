import React from 'react';
import { HiXMark, HiArrowsPointingOut, HiPlus, HiOutlineSun, HiOutlineMoon, HiClock } from 'react-icons/hi2';
import SevenSegmentDisplay from './SevenSegmentDisplay';

const ChatHeader = ({ displayText, lastCost = 0, resetChat, toggleFullscreen, toggleChat, theme = 'dark', onToggleTheme, onToggleHistory, onDisplayClick }) => {
    // Use a solid dark shade so it looks identical in both themes
    const headerColors = 'bg-[#0f172a] text-white backdrop-blur-md border-b border-white/10';
    const hoverColor = 'hover:bg-white/10';

    const formatCost = (cost) => {
        if (cost === 0) return '$0.00000';
        if (cost < 0.00001) return `$${cost.toFixed(7)}`; // Extra precision for very small amounts
        return `$${cost.toFixed(5)}`;
    };

    return (
        <div className={`${headerColors} glass-header p-4 flex justify-between items-center rounded-t-xl`}>
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
                {/* ✅ NEW: Cost display beside the seven segment display */}
                <div className="flex flex-col items-start">
                    <div className="text-xs opacity-60 leading-tight">
                        Last Cost
                    </div>
                    <div className="text-xs font-mono font-semibold leading-tight">
                        {formatCost(lastCost)}
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                {onToggleTheme && (
                    <button onClick={onToggleTheme} className={`p-1 rounded-full ${hoverColor}`} aria-label="Toggle Theme" title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
                        {theme === 'dark' ? (
                            <HiOutlineMoon className="w-5 h-5" />
                        ) : (
                            <HiOutlineSun className="w-5 h-5" />
                        )}
                    </button>
                )}
                {onToggleHistory && (
                    <button onClick={onToggleHistory} className={`p-1 rounded-full ${hoverColor}`} aria-label="Open chat history" title="Chat history">
                        <HiClock className="w-5 h-5" />
                    </button>
                )}
                <button onClick={resetChat} className={`p-1 rounded-full ${hoverColor}`} aria-label="Reset Chat">
                    <HiPlus className="w-5 h-5" />
                </button>
                <button onClick={toggleFullscreen} className={`p-1 rounded-full ${hoverColor}`} aria-label="Toggle Fullscreen">
                    <HiArrowsPointingOut className="w-5 h-5" />
                </button>
                <button onClick={toggleChat} className={`p-1 rounded-full ${hoverColor}`} aria-label="Close Chat">
                    <HiXMark className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default ChatHeader;
