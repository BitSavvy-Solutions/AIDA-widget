import React from 'react';
import { HiXMark, HiArrowsPointingOut, HiPlus } from 'react-icons/hi2';
import SevenSegmentDisplay from './SevenSegmentDisplay';

const ChatHeader = ({ displayText, resetChat, toggleFullscreen, toggleChat }) => {
    return (
        <div className="bg-gray-900 text-white p-4 flex justify-between items-center rounded-t-xl">
            <div className="flex items-center">
                <SevenSegmentDisplay text={displayText} className="mr-3" />
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={resetChat} className="p-1 hover:bg-gray-800 rounded-full" aria-label="Reset Chat">
                    <HiPlus className="w-5 h-5" />
                </button>
                <button onClick={toggleFullscreen} className="p-1 hover:bg-gray-800 rounded-full" aria-label="Toggle Fullscreen">
                    <HiArrowsPointingOut className="w-5 h-5" />
                </button>
                <button onClick={toggleChat} className="p-1 hover:bg-gray-800 rounded-full" aria-label="Close Chat">
                    <HiXMark className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default ChatHeader;