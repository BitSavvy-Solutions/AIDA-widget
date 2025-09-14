import React from 'react';
import { HiXMark, HiArrowsPointingOut, HiPlus, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi2';
import SevenSegmentDisplay from './SevenSegmentDisplay';

const ChatHeader = ({ displayText, resetChat, toggleFullscreen, toggleChat, theme = 'dark', onToggleTheme }) => {
    const isDark = theme === 'dark';
    // Use a solid dark shade so it looks identical in both themes
    const headerColors = 'bg-[#0f172a] text-white backdrop-blur-md border-b border-white/10';
    const hoverColor = 'hover:bg-white/10';
    return (
        <div className={`${headerColors} glass-header p-4 flex justify-between items-center rounded-t-xl`}>
            <div className="flex items-center">
                <SevenSegmentDisplay text={displayText} className="mr-3" />
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
