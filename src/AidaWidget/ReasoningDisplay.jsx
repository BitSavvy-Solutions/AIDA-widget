/* src/AidaWidget/ReasoningDisplay.jsx */
import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineLightBulb, HiChevronDown } from 'react-icons/hi2';

const ReasoningDisplay = ({ text, theme = 'dark', isLive, startTime, finalDuration }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        const cleanup = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        if (isLive && startTime) {
            // It's live! Start the timer.
            cleanup(); // Clear previous interval just in case.

            const updateElapsedTime = () => {
                const seconds = Math.floor((Date.now() - startTime) / 1000);
                setElapsedSeconds(seconds);
            };

            updateElapsedTime(); // Update immediately to show 0s instead of flashing old values.
            intervalRef.current = setInterval(updateElapsedTime, 1000);
        } else {
            // Not live, stop the timer.
            cleanup();
        }

        return cleanup; // Cleanup on unmount or when props change.
    }, [isLive, startTime]);

    if (!text || !text.trim()) {
        return null;
    }

    const getTitle = () => {
        if (isLive) {
            return `AI is reasoning for ${elapsedSeconds}s...`;
        }
        if (typeof finalDuration === 'number') {
            return `AI reasoned for ${Math.round(finalDuration)}s`;
        }
        // Fallback for older messages that don't have duration data
        return 'Agent Reasoning';
    };

    const isDark = theme === 'dark';

    return (
        <div className={`mb-3 p-2 rounded-lg border text-xs ${
            isDark 
                ? 'bg-gray-800/50 border-gray-700/80 text-gray-400' 
                : 'bg-gray-100/50 border-gray-200/80 text-gray-600'
        }`}>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left"
                aria-expanded={isExpanded}
                aria-controls="reasoning-content"
            >
                <div className="flex items-center gap-2 font-medium">
                    <HiOutlineLightBulb className="w-4 h-4" />
                    <span>{getTitle()}</span>
                </div>
                <HiChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div 
                    id="reasoning-content" 
                    className={`mt-2 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                >
                    <pre className={`whitespace-pre-wrap font-mono text-xs leading-relaxed custom-scrollbar max-h-48 overflow-y-auto ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        {text}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default ReasoningDisplay;