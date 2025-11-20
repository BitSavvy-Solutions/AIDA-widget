/* src/AidaWidget/LoadingOverlay.jsx */
import React, { useState, useEffect, useRef } from 'react';
import SnakeGame from './SnakeGame';
import { HiXMark, HiChevronUp, HiChevronDown, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

const LoadingOverlay = ({ isLoading, theme = 'dark' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const gameRef = useRef(null);
    
    // ✅ JOYSTICK STATE
    const joystickRef = useRef(null);
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lastCommandRef = useRef(null); // To prevent spamming the same direction

    useEffect(() => {
        if (isLoading) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [isLoading]);

    const handleClose = () => {
        setIsVisible(false);
    };

    const handleAction = (type, isPressed) => {
        if (gameRef.current) {
            gameRef.current.handleAction(type, isPressed);
        }
    };

    // ✅ JOYSTICK LOGIC
    const handlePointerDown = (e) => {
        setIsDragging(true);
        e.preventDefault(); // Prevent scrolling on touch
        handlePointerMove(e); // Immediate update
    };

    const handlePointerMove = (e) => {
        if (!isDragging || !joystickRef.current) return;

        // 1. Get Joystick Center
        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 2. Calculate Delta (Mouse vs Center)
        // Support both Touch and Mouse events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let dx = clientX - centerX;
        let dy = clientY - centerY;

        // 3. Clamp Distance (Keep knob inside ring)
        const maxRadius = 25; // How far the knob can move (pixels)
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > maxRadius) {
            const ratio = maxRadius / distance;
            dx *= ratio;
            dy *= ratio;
        }

        setKnobPos({ x: dx, y: dy });

        // 4. Determine Direction (Deadzone check)
        if (distance > 10) { // 10px deadzone
            let newDirection = null;

            // Determine if Horizontal or Vertical movement is stronger
            if (Math.abs(dx) > Math.abs(dy)) {
                newDirection = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 }; // Right : Left
            } else {
                newDirection = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 }; // Down : Up
            }

            // Only send command if it's different from the last frame (optional, but good for perf)
            // Or just send it continuously (SnakeGame handles the logic)
            if (gameRef.current) {
                gameRef.current.handleInput(newDirection);
            }
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 }); // Snap back to center
    };

    // Attach global listeners when dragging starts to handle moving outside the div
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            window.addEventListener('touchmove', handlePointerMove, { passive: false });
            window.addEventListener('touchend', handlePointerUp);
        } else {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [isDragging]);


    if (!isVisible) return null;

    const isDark = theme === 'dark';

    return (
        <div 
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 transition-opacity duration-300"
            onClick={handleClose}
        >
            {/* Modal Container */}
            <div 
                className={`relative flex flex-col items-center p-4 rounded-2xl shadow-2xl transform transition-all scale-100 ${
                    isDark 
                        ? 'bg-gray-900 border border-gray-700 shadow-black/50' 
                        : 'bg-white border border-gray-200 shadow-xl'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button 
                    onClick={handleClose}
                    className={`absolute top-2 right-2 p-1 rounded-full transition-colors z-20 ${
                        isDark 
                            ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    aria-label="Close game"
                >
                    <HiXMark className="w-5 h-5" />
                </button>

                {/* Header Status */}
                <div className="flex items-center gap-2 mb-2 animate-fade-in">
                    <div className="w-3 h-3 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
                    <span className={`text-xs font-bold tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Generating...
                    </span>
                </div>

                {/* The Game Component */}
                <div className="relative">
                    <SnakeGame ref={gameRef} isPaused={!isVisible} theme={theme} />
                </div>

                {/* ✅ CONTROLS ROW */}
                <div className="flex justify-between items-center w-[280px] mt-3 px-4">
                    
                    {/* LEFT: DRAGGABLE ANALOG STICK */}
                    <div 
                        ref={joystickRef}
                        className="relative w-20 h-20 touch-none select-none"
                        onPointerDown={handlePointerDown}
                    >
                        {/* Outer Glow Ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] bg-gray-900/80"></div>
                        
                        {/* Directional Arrows (Visual) */}
                        <HiChevronUp className={`absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 pointer-events-none transition-colors ${knobPos.y < -10 ? 'text-white' : 'text-cyan-600'}`} />
                        <HiChevronDown className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 pointer-events-none transition-colors ${knobPos.y > 10 ? 'text-white' : 'text-cyan-600'}`} />
                        <HiChevronLeft className={`absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${knobPos.x < -10 ? 'text-white' : 'text-cyan-600'}`} />
                        <HiChevronRight className={`absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${knobPos.x > 10 ? 'text-white' : 'text-cyan-600'}`} />

                        {/* The Draggable Knob */}
                        <div 
                            className="absolute top-1/2 left-1/2 w-10 h-10 -ml-5 -mt-5 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center cursor-grab active:cursor-grabbing"
                            style={{
                                transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' // Snap back animation
                            }}
                        >
                            {/* Inner Detail */}
                            <div className="w-4 h-4 rounded-full border-2 border-cyan-400 shadow-[0_0_8px_cyan] bg-cyan-900/50"></div>
                        </div>
                    </div>

                    {/* RIGHT: ACTION BUTTONS (A / B) */}
                    <div className="flex gap-3 transform translate-y-2">
                        {/* Button B */}
                        <div className="flex flex-col items-center gap-1 transform translate-y-4">
                            <button 
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-lg border-b-4 border-red-900 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center text-white font-bold text-xs select-none touch-manipulation"
                                onPointerDown={(e) => { e.preventDefault(); handleAction('B', true); }}
                                onPointerUp={(e) => { e.preventDefault(); handleAction('B', false); }}
                                onPointerLeave={(e) => { e.preventDefault(); handleAction('B', false); }}
                            >
                                B
                            </button>
                        </div>

                        {/* Button A */}
                        <div className="flex flex-col items-center gap-1">
                            <button 
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 shadow-lg border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center text-white font-bold text-xs select-none touch-manipulation"
                                onPointerDown={(e) => { e.preventDefault(); handleAction('A', true); }}
                                onPointerUp={(e) => { e.preventDefault(); handleAction('A', false); }}
                                onPointerLeave={(e) => { e.preventDefault(); handleAction('A', false); }}
                            >
                                A
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LoadingOverlay;