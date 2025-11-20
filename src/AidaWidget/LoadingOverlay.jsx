/* src/AidaWidget/LoadingOverlay.jsx */
import React, { useState, useEffect, useRef } from 'react';
import SnakeGame from './SnakeGame';
import TetrisGame from './TetrisGame';
import ChessGame from './ChessGame';
import { 
    HiXMark, 
    HiChevronUp, 
    HiChevronDown, 
    HiChevronLeft, 
    HiChevronRight,
    HiChevronDoubleLeft,
    HiChevronDoubleRight,
    HiArrowPath // ✅ Import Refresh Icon
} from 'react-icons/hi2';

const LoadingOverlay = ({ isLoading, theme = 'dark' }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    // Game Switching State
    const [activeGame, setActiveGame] = useState('snake'); // 'snake' | 'tetris' | 'chess'
    const gameRef = useRef(null);
    
    // Joystick State
    const joystickRef = useRef(null);
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Button State for snappy visual feedback
    const [activeBtn, setActiveBtn] = useState(null); // 'A', 'B', 'NEW', or null

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

    const toggleGame = (direction) => {
        const games = ['snake', 'tetris', 'chess'];
        setActiveGame(prev => {
            const currentIndex = games.indexOf(prev);
            if (direction === 'next') {
                return games[(currentIndex + 1) % games.length];
            } else {
                return games[(currentIndex - 1 + games.length) % games.length];
            }
        });
    };

    const handleAction = (type, isPressed) => {
        if (gameRef.current) {
            gameRef.current.handleAction(type, isPressed);
        }
    };

    // ✅ Handle Reset
    const handleReset = () => {
        if (gameRef.current && gameRef.current.reset) {
            gameRef.current.reset();
        }
    };

    const pressBtn = (btn) => {
        setActiveBtn(btn);
        if (btn === 'NEW') {
            handleReset();
        } else {
            handleAction(btn, true);
        }
    };

    const releaseBtn = (btn) => {
        if (activeBtn === btn) {
            setActiveBtn(null);
            if (btn !== 'NEW') {
                handleAction(btn, false);
            }
        }
    };

    // Joystick Logic
    const handlePointerDown = (e) => {
        setIsDragging(true);
        e.preventDefault();
        handlePointerMove(e);
    };

    const handlePointerMove = (e) => {
        if (!isDragging || !joystickRef.current) return;

        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let dx = clientX - centerX;
        let dy = clientY - centerY;

        const maxRadius = 25;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > maxRadius) {
            const ratio = maxRadius / distance;
            dx *= ratio;
            dy *= ratio;
        }

        setKnobPos({ x: dx, y: dy });

        if (distance > 10) {
            let newDirection = null;
            if (Math.abs(dx) > Math.abs(dy)) {
                newDirection = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
            } else {
                newDirection = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
            }

            if (gameRef.current) {
                gameRef.current.handleInput(newDirection);
            }
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
    };

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

    const getBtnStyle = (btnType, colorClass, borderClass) => {
        const isPressed = activeBtn === btnType;
        return `w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-xs select-none touch-manipulation transition-all duration-75 ${
            isPressed 
                ? 'border-b-0 translate-y-1 shadow-none brightness-90' 
                : `border-b-4 ${borderClass} shadow-lg translate-y-0`
        }`;
    };

    return (
        <div 
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 transition-opacity duration-300"
            onClick={handleClose}
        >
            <div 
                className={`relative flex flex-col items-center p-4 rounded-2xl shadow-2xl transform transition-all scale-100 ${
                    isDark 
                        ? 'bg-gray-900 border border-gray-700 shadow-black/50' 
                        : 'bg-white border border-gray-200 shadow-xl'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
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

                {/* Game Switcher */}
                <div className="flex items-center justify-between w-full max-w-[200px] mb-3">
                    <button 
                        onClick={() => toggleGame('prev')}
                        className={`p-1 rounded hover:bg-white/10 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}
                    >
                        <HiChevronDoubleLeft className="w-5 h-5" />
                    </button>
                    
                    <span className={`font-black tracking-widest uppercase text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {activeGame.toUpperCase()}
                    </span>

                    <button 
                        onClick={() => toggleGame('next')}
                        className={`p-1 rounded hover:bg-white/10 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}
                    >
                        <HiChevronDoubleRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Game Area */}
                <div className="relative min-h-[280px] flex items-center justify-center">
                    {activeGame === 'snake' ? (
                        <SnakeGame ref={gameRef} isPaused={!isVisible} theme={theme} />
                    ) : activeGame === 'tetris' ? (
                        <TetrisGame ref={gameRef} isPaused={!isVisible} theme={theme} />
                    ) : (
                        <ChessGame ref={gameRef} isPaused={!isVisible} theme={theme} />
                    )}
                </div>

                {/* Controls Row */}
                <div className="flex justify-between items-center w-[280px] mt-3 px-4">
                    
                    {/* Joystick */}
                    <div 
                        ref={joystickRef}
                        className="relative w-20 h-20 touch-none select-none"
                        onPointerDown={handlePointerDown}
                    >
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] bg-gray-900/80"></div>
                        <HiChevronUp className={`absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 pointer-events-none transition-colors ${knobPos.y < -10 ? 'text-white' : 'text-cyan-600'}`} />
                        <HiChevronDown className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 pointer-events-none transition-colors ${knobPos.y > 10 ? 'text-white' : 'text-cyan-600'}`} />
                        <HiChevronLeft className={`absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${knobPos.x < -10 ? 'text-white' : 'text-cyan-600'}`} />
                        <HiChevronRight className={`absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${knobPos.x > 10 ? 'text-white' : 'text-cyan-600'}`} />

                        <div 
                            className="absolute top-1/2 left-1/2 w-10 h-10 -ml-5 -mt-5 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center cursor-grab active:cursor-grabbing"
                            style={{
                                transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                        >
                            <div className="w-4 h-4 rounded-full border-2 border-cyan-400 shadow-[0_0_8px_cyan] bg-cyan-900/50"></div>
                        </div>
                    </div>

                    {/* ✅ NEW BUTTON (Center) */}
                    <div className="flex items-center justify-center transform translate-y-2">
                        <button 
                            className={`w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center text-white shadow-lg border-b-4 border-yellow-900 active:border-b-0 active:translate-y-1 transition-all ${activeBtn === 'NEW' ? 'border-b-0 translate-y-1 shadow-none brightness-90' : ''}`}
                            onPointerDown={(e) => { e.preventDefault(); pressBtn('NEW'); }}
                            onPointerUp={(e) => { e.preventDefault(); releaseBtn('NEW'); }}
                            onPointerLeave={(e) => { e.preventDefault(); releaseBtn('NEW'); }}
                            title="New Game"
                        >
                            <HiArrowPath className="w-4 h-4 font-bold" />
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 transform translate-y-2">
                        {/* Button B */}
                        <div className="flex flex-col items-center gap-1 transform translate-y-4">
                            <button 
                                className={getBtnStyle('B', 'from-red-500 to-red-700', 'border-red-900')}
                                onPointerDown={(e) => { e.preventDefault(); pressBtn('B'); }}
                                onPointerUp={(e) => { e.preventDefault(); releaseBtn('B'); }}
                                onPointerLeave={(e) => { e.preventDefault(); releaseBtn('B'); }}
                                onPointerCancel={(e) => { e.preventDefault(); releaseBtn('B'); }}
                            >
                                B
                            </button>
                        </div>
                        {/* Button A */}
                        <div className="flex flex-col items-center gap-1">
                            <button 
                                className={getBtnStyle('A', 'from-green-500 to-green-700', 'border-green-900')}
                                onPointerDown={(e) => { e.preventDefault(); pressBtn('A'); }}
                                onPointerUp={(e) => { e.preventDefault(); releaseBtn('A'); }}
                                onPointerLeave={(e) => { e.preventDefault(); releaseBtn('A'); }}
                                onPointerCancel={(e) => { e.preventDefault(); releaseBtn('A'); }}
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