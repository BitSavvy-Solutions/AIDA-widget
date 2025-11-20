/* src/AidaWidget/SnakeGame.jsx */
import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { HiOutlineTrophy, HiArrowPath } from 'react-icons/hi2';

const GRID_SIZE = 15;
const INITIAL_SNAKE = [{ x: 7, y: 10 }, { x: 7, y: 11 }, { x: 7, y: 12 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 150;

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
    
    const directionRef = useRef(direction);
    const lastProcessedDirRef = useRef(direction);
    const gameLoopRef = useRef(null);
    const gameStateRef = useRef({ gameOver, hasStarted, isPaused });

    useEffect(() => {
        directionRef.current = direction;
        lastProcessedDirRef.current = direction;
    }, [direction]);

    useEffect(() => {
        gameStateRef.current = { gameOver, hasStarted, isPaused };
    }, [gameOver, hasStarted, isPaused]);

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
        lastProcessedDirRef.current = INITIAL_DIRECTION;
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

    const handleDirectionChange = useCallback((newDir) => {
        const { gameOver, isPaused } = gameStateRef.current;
        if (isPaused || gameOver) return;

        if (!gameStateRef.current.hasStarted) {
            setHasStarted(true);
        }

        const currentDir = lastProcessedDirRef.current;
        if (currentDir.y !== 0 && newDir.y !== 0) return;
        if (currentDir.x !== 0 && newDir.x !== 0) return;

        directionRef.current = newDir;
    }, []);

    useImperativeHandle(ref, () => ({
        handleInput: (newDir) => handleDirectionChange(newDir),
        handleAction: (actionType, isPressed) => {
            if (actionType === 'A' || actionType === 'B') setIsTurbo(isPressed);
        },
        // ✅ EXPOSE RESET
        reset: resetGame
    }));

    useEffect(() => {
        const handleKeyDown = (e) => {
            const { gameOver, hasStarted, isPaused } = gameStateRef.current;
            if (isPaused) return;

            if (e.key === 'Enter') {
                if (gameOver) {
                    resetGame();
                    return;
                } else if (!hasStarted) {
                    setHasStarted(true);
                    return;
                }
            }

            if (gameOver) return;

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

    useEffect(() => {
        if (isPaused || gameOver || !hasStarted) return;

        const moveSnake = () => {
            const moveDir = directionRef.current;
            lastProcessedDirRef.current = moveDir;

            setSnake(prevSnake => {
                const head = prevSnake[0];
                const newHead = {
                    x: head.x + moveDir.x,
                    y: head.y + moveDir.y
                };

                if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                    setGameOver(true);
                    return prevSnake;
                }

                if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                    setGameOver(true);
                    return prevSnake;
                }

                const newSnake = [newHead, ...prevSnake];

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

                {!hasStarted && !gameOver && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/20 text-white pointer-events-none">
                        <div className="bg-black/60 px-3 py-1 rounded text-xs font-bold animate-pulse">
                            Press Arrow or Touch to Start
                        </div>
                    </div>
                )}

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