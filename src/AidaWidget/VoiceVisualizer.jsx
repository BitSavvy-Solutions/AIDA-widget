/* src/AidaWidget/VoiceVisualizer.jsx */
import React from 'react';

const VoiceVisualizer = ({ volume = 0, theme = 'dark' }) => {
    // We create 4 bars. We'll use the volume to determine height.
    // We add slight randomization/offsets so they don't move exactly in unison.
    
    // Base height is 4px, Max height is 24px
    const getHeight = (modifier) => {
        const v = Math.max(0, Math.min(100, volume * modifier));
        // Map 0-100 to 4px-24px
        return 4 + (v / 100) * 20;
    };

    const barColor = theme === 'dark' ? 'bg-white' : 'bg-white'; 

    return (
        <div className="flex items-center justify-center gap-[3px] h-6 w-8">
            {/* Bar 1 */}
            <div 
                className={`w-1 rounded-full transition-all duration-75 ease-out ${barColor}`}
                style={{ height: `${getHeight(0.8)}px` }}
            />
            {/* Bar 2 (Main) */}
            <div 
                className={`w-1 rounded-full transition-all duration-75 ease-out ${barColor}`}
                style={{ height: `${getHeight(1.2)}px` }}
            />
            {/* Bar 3 */}
            <div 
                className={`w-1 rounded-full transition-all duration-75 ease-out ${barColor}`}
                style={{ height: `${getHeight(0.9)}px` }}
            />
            {/* Bar 4 */}
            <div 
                className={`w-1 rounded-full transition-all duration-75 ease-out ${barColor}`}
                style={{ height: `${getHeight(0.6)}px` }}
            />
        </div>
    );
};

export default VoiceVisualizer;