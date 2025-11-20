/* src/AidaWidget/SnakeGame.jsx */
import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { HiOutlineTrophy, HiArrowPath } from 'react-icons/hi2';

const GRID_SIZE = 15;
const INITIAL_SNAKE = [{ x: 7, y: 10 }, { x: 7, y: 11 }, { x: 7, y: 12 }];
const INITIAL_DIRECTION = { x: 0, y: -1 }; // Moving Up
const BASE_SPEED = 150;

// Helper to load state from local storage
const loadState = (key, defaultVal) => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultVal;
    } catch {
        return defaultVal;
    }
};

const SnakeGame = forwardRef(({ isPaused, theme = 'dark' }, ref) => {
    const [snake, setSnake] = useState(() => loadState('aida-snake-body', INITIAL_SNAKE));
    const [food, setFood] = useState(() => loadState('aida-snake-food', { x: 5, y: 5 }));
    const [score, setScore] = useState(() => loadState('aida-snake-score', 0));
    const [direction, setDirection] = useState(() => loadState('aida-snake-dir', INITIAL_DIRECTION));
    const [hasStarted, setHasStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(() => loadState('aida-snake-highscore', 0));
    
    const [isTurbo, setIsTurbo] = useState(false);
    
    // Ref for the requested direction (what the user pressed)
    const directionRef = useRef(direction);
    
    // ✅ NEW: Ref for the direction actually executed in the last frame
    // This prevents the "Rapid Input" bug where the snake turns 180 degrees and dies
    const lastProcessedDirRef = useRef(direction);
    
    const gameLoopRef = useRef(null);

    // Sync refs with state
    useEffect(() => {
        directionRef.current = direction;
        lastProcessedDirRef.current = direction;
    }, [direction]);

    // Save state
    useEffect(() => {
        if (!gameOver) {
            localStorage.setItem('aida-snake-body', JSON.stringify(snake));
            localStorage.setItem('aida-snake-food', JSON.stringify(food));
            localStorage.setItem('aida-snake-score', JSON.stringify(score));
            localStorage.setItem('aida-snake-dir', JSON.stringify(directionRef.current));
        }
    }, [snake, food, score, gameOver]);

    const generateFood = useCallback((currentSnake) => {
        let newFood;
        let isOnSnake;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
        } while (isOnSnake);
        return newFood;
    }, []);

    const resetGame = () => {
        setSnake(INITIAL_SNAKE);
        setDirection(INITIAL_DIRECTION);
        directionRef.current = INITIAL_DIRECTION;
        lastProcessedDirRef.current = INITIAL_DIRECTION; // Reset processed dir
        setScore(0);
        setGameOver(false);
        setHasStarted(false);
        setFood(generateFood(INITIAL_SNAKE));
        setIsTurbo(false);
        
        localStorage.removeItem('aida-snake-body');
        localStorage.removeItem('aida-snake-food');
        localStorage.removeItem('aida-snake-score');
        localStorage.removeItem('aida-snake-dir');
    };

    // Centralized direction handler
    const handleDirectionChange = useCallback((newDir) => {
        if (isPaused || gameOver) return;

        if (!hasStarted) {
            setHasStarted(true);
        }

        // ✅ FIX: Check against the LAST PROCESSED direction, not the current ref.
        // This ensures we validate against where the snake is physically moving right now.
        const currentDir = lastProcessedDirRef.current;

        // Prevent 180 degree turns
        // If moving vertically, ignore vertical inputs
        if (currentDir.y !== 0 && newDir.y !== 0) return;
        // If moving horizontally, ignore horizontal inputs
        if (currentDir.x !== 0 && newDir.x !== 0) return;

        directionRef.current = newDir;
    }, [isPaused, gameOver, hasStarted]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        handleInput: (newDir) => {
            handleDirectionChange(newDir);
        },
        handleAction: (actionType, isPressed) => {
            if (actionType === 'A' || actionType === 'B') {
                setIsTurbo(isPressed);
            }
        }
    }));

    // Handle Keyboard Input
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case 'ArrowUp': handleDirectionChange({ x: 0, y: -1 }); break;
                case 'ArrowDown': handleDirectionChange({ x: 0, y: 1 }); break;
                case 'ArrowLeft': handleDirectionChange({ x: -1, y: 0 }); break;
                case 'ArrowRight': handleDirectionChange({ x: 1, y: 0 }); break;
                case ' ': setIsTurbo(true); break;
                default: break;
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === ' ') setIsTurbo(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleDirectionChange]);

    // Game Loop
    useEffect(() => {
        if (isPaused || gameOver || !hasStarted) return;

        const moveSnake = () => {
            // ✅ UPDATE PROCESSED DIRECTION
            // We lock in the direction we are about to use for this frame.
            // This prevents multiple inputs within one tick from causing a self-collision.
            const moveDir = directionRef.current;
            lastProcessedDirRef.current = moveDir;

            setSnake(prevSnake => {
                const head = prevSnake[0];
                const newHead = {
                    x: head.x + moveDir.x,
                    y: head.y + moveDir.y
                };

                // Wall Collision
                if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                    setGameOver(true);
                    return prevSnake;
                }

                // Self Collision
                if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                    setGameOver(true);
                    return prevSnake;
                }

                const newSnake = [newHead, ...prevSnake];

                // Food Collision
                if (newHead.x === food.x && newHead.y === food.y) {
                    setScore(s => {
                        const newScore = s + 1;
                        if (newScore > highScore) {
                            setHighScore(newScore);
                            localStorage.setItem('aida-snake-highscore', newScore.toString());
                        }
                        return newScore;
                    });
                    setFood(generateFood(newSnake));
                } else {
                    newSnake.pop();
                }

                return newSnake;
            });
        };

        const currentSpeed = isTurbo ? BASE_SPEED / 2.5 : BASE_SPEED;

        gameLoopRef.current = setInterval(moveSnake, currentSpeed);
        return () => clearInterval(gameLoopRef.current);
    }, [isPaused, gameOver, food, highScore, generateFood, hasStarted, isTurbo]);

    const isDark = theme === 'dark';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full select-none outline-none pointer-events-auto">
            <div className="flex justify-between w-full max-w-[280px] mb-2 px-1">
                <div className={`text-xs font-mono font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    SCORE: {score}
                </div>
                <div className={`flex items-center gap-1 text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <HiOutlineTrophy className="w-3 h-3" /> {highScore}
                </div>
            </div>

            <div 
                className={`relative grid border-4 rounded-lg overflow-hidden shadow-2xl ${
                    isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
                }`}
                style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    width: '280px',
                    height: '280px'
                }}
            >
                {/* Game Over Overlay */}
                {gameOver && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                        <h3 className="text-xl font-bold mb-2 text-red-400">GAME OVER</h3>
                        <button 
                            onClick={resetGame}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:scale-105 transition-transform"
                        >
                            <HiArrowPath className="w-4 h-4" /> Try Again
                        </button>
                    </div>
                )}

                {/* Start Prompt Overlay */}
                {!hasStarted && !gameOver && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/20 text-white pointer-events-none">
                        <div className="bg-black/60 px-3 py-1 rounded text-xs font-bold animate-pulse">
                            Press Arrow or Touch to Start
                        </div>
                    </div>
                )}

                {/* Grid Rendering */}
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                    const x = i % GRID_SIZE;
                    const y = Math.floor(i / GRID_SIZE);
                    
                    const isSnakeHead = snake[0].x === x && snake[0].y === y;
                    const isSnakeBody = snake.some((s, idx) => idx !== 0 && s.x === x && s.y === y);
                    const isFood = food.x === x && food.y === y;

                    let cellClass = isDark ? 'bg-gray-800/50' : 'bg-white/50';
                    
                    if (isSnakeHead) cellClass = 'bg-green-400 rounded-sm z-10';
                    else if (isSnakeBody) cellClass = 'bg-green-600/80 rounded-sm';
                    else if (isFood) cellClass = 'bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]';

                    return <div key={i} className={`w-full h-full ${cellClass}`} />;
                })}
            </div>
        </div>
    );
});

export default SnakeGame;