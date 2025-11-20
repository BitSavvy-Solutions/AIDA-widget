/* src/AidaWidget/TetrisGame.jsx */
import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { HiOutlineTrophy, HiArrowPath } from 'react-icons/hi2';

const COLS = 10;
const ROWS = 20;
const BASE_SPEED = 800;

const TETROMINOS = {
    0: { shape: [[0]], color: '0,0,0' },
    I: { shape: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]], color: '6, 182, 212' },
    J: { shape: [[0, 2, 0], [0, 2, 0], [2, 2, 0]], color: '59, 130, 246' },
    L: { shape: [[0, 3, 0], [0, 3, 0], [0, 3, 3]], color: '249, 115, 22' },
    O: { shape: [[4, 4], [4, 4]], color: '234, 179, 8' },
    S: { shape: [[0, 5, 5], [5, 5, 0], [0, 0, 0]], color: '34, 197, 94' },
    T: { shape: [[0, 6, 0], [6, 6, 6], [0, 0, 0]], color: '168, 85, 247' },
    Z: { shape: [[7, 7, 0], [0, 7, 7], [0, 0, 0]], color: '239, 68, 68' },
};

const randomTetromino = () => {
    const keys = 'IJLOSTZ';
    const randKey = keys[Math.floor(Math.random() * keys.length)];
    return TETROMINOS[randKey];
};

const createGrid = () => Array.from(Array(ROWS), () => new Array(COLS).fill([0, 'clear']));

const loadState = (key, defaultVal) => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultVal;
    } catch {
        return defaultVal;
    }
};

const TetrisGame = forwardRef(({ isPaused, theme = 'dark' }, ref) => {
    const [grid, setGrid] = useState(() => loadState('aida-tetris-grid', createGrid()));
    const [player, setPlayer] = useState(() => loadState('aida-tetris-player', { 
        pos: { x: COLS / 2 - 2, y: 0 }, 
        tetromino: TETROMINOS[0].shape, 
        collided: false 
    }));
    const [score, setScore] = useState(() => loadState('aida-tetris-score', 0));
    const [gameOver, setGameOver] = useState(() => loadState('aida-tetris-gameover', false));
    const [hasStarted, setHasStarted] = useState(() => loadState('aida-tetris-started', false));
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('aida-tetris-highscore') || '0'));
    const [dropTime, setDropTime] = useState(null);

    const gameStateRef = useRef({ grid, player, gameOver, hasStarted, isPaused, score, highScore });

    useEffect(() => {
        gameStateRef.current = { grid, player, gameOver, hasStarted, isPaused, score, highScore };
    }, [grid, player, gameOver, hasStarted, isPaused, score, highScore]);

    useEffect(() => {
        if (!gameOver) {
            localStorage.setItem('aida-tetris-grid', JSON.stringify(grid));
            localStorage.setItem('aida-tetris-player', JSON.stringify(player));
            localStorage.setItem('aida-tetris-score', JSON.stringify(score));
            localStorage.setItem('aida-tetris-started', JSON.stringify(hasStarted));
            localStorage.setItem('aida-tetris-gameover', JSON.stringify(gameOver));
        }
    }, [grid, player, score, hasStarted, gameOver]);

    useEffect(() => {
        if (hasStarted && !gameOver && !isPaused) {
            setDropTime(BASE_SPEED);
        } else {
            setDropTime(null);
        }
    }, [hasStarted, gameOver, isPaused]);

    const checkCollision = (playerObj, gridObj, { x: moveX, y: moveY }) => {
        for (let y = 0; y < playerObj.tetromino.length; y += 1) {
            for (let x = 0; x < playerObj.tetromino[y].length; x += 1) {
                if (playerObj.tetromino[y][x] !== 0) {
                    if (
                        !gridObj[y + playerObj.pos.y + moveY] ||
                        !gridObj[y + playerObj.pos.y + moveY][x + playerObj.pos.x + moveX] ||
                        gridObj[y + playerObj.pos.y + moveY][x + playerObj.pos.x + moveX][1] !== 'clear'
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const drop = () => {
        const { player, grid, gameOver, isPaused, score, highScore } = gameStateRef.current;
        if (gameOver || isPaused) return;

        if (!checkCollision(player, grid, { x: 0, y: 1 })) {
            setPlayer(prev => ({ ...prev, pos: { x: prev.pos.x, y: prev.pos.y + 1 } }));
        } else {
            if (player.pos.y < 1) {
                setGameOver(true);
                setDropTime(null);
                setHasStarted(false);
                localStorage.setItem('aida-tetris-gameover', 'true');
                return;
            }

            const newGrid = grid.map(row => [...row]);
            player.tetromino.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        newGrid[y + player.pos.y][x + player.pos.x] = [value, 'merged'];
                    }
                });
            });

            let rowsCleared = 0;
            const sweepedGrid = newGrid.reduce((ack, row) => {
                if (row.findIndex(cell => cell[0] === 0) === -1) {
                    rowsCleared += 1;
                    ack.unshift(new Array(COLS).fill([0, 'clear']));
                    return ack;
                }
                ack.push(row);
                return ack;
            }, []);

            if (rowsCleared > 0) {
                const newScore = score + (rowsCleared * 10);
                setScore(newScore);
                if (newScore > highScore) {
                    setHighScore(newScore);
                    localStorage.setItem('aida-tetris-highscore', newScore.toString());
                }
            }

            const newTetromino = randomTetromino();
            const newPlayer = {
                pos: { x: COLS / 2 - 2, y: 0 },
                tetromino: newTetromino.shape,
                collided: false,
            };

            if (checkCollision(newPlayer, sweepedGrid, { x: 0, y: 0 })) {
                setGameOver(true);
                setDropTime(null);
                setHasStarted(false);
                localStorage.setItem('aida-tetris-gameover', 'true');
            }

            setGrid(sweepedGrid);
            setPlayer(newPlayer);
            setDropTime(BASE_SPEED);
        }
    };

    const dropPlayer = () => {
        setDropTime(null);
        drop();
    };

    const movePlayer = (dir) => {
        const { player, grid } = gameStateRef.current;
        if (!checkCollision(player, grid, { x: dir, y: 0 })) {
            setPlayer(prev => ({ ...prev, pos: { x: prev.pos.x + dir, y: prev.pos.y } }));
        }
    };

    const playerRotate = (dir) => {
        const { player, grid } = gameStateRef.current;
        const clonedPlayer = JSON.parse(JSON.stringify(player));
        
        const rotated = clonedPlayer.tetromino.map((_, index) => 
            clonedPlayer.tetromino.map(col => col[index])
        );
        if (dir > 0) clonedPlayer.tetromino = rotated.map(row => row.reverse());
        else clonedPlayer.tetromino = rotated.reverse();

        const pos = clonedPlayer.pos.x;
        let offset = 1;
        while (checkCollision(clonedPlayer, grid, { x: 0, y: 0 })) {
            clonedPlayer.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > clonedPlayer.tetromino[0].length) {
                clonedPlayer.tetromino = player.tetromino; 
                clonedPlayer.pos.x = pos;
                return;
            }
        }
        setPlayer(clonedPlayer);
    };

    const startGame = () => {
        setGrid(createGrid());
        setScore(0);
        setGameOver(false);
        setHasStarted(true);
        setDropTime(BASE_SPEED);
        
        const newTetromino = randomTetromino();
        setPlayer({
            pos: { x: COLS / 2 - 2, y: 0 },
            tetromino: newTetromino.shape,
            collided: false,
        });
    };

    useEffect(() => {
        if (!hasStarted || gameOver || isPaused) return;
        const interval = setInterval(() => {
            drop();
        }, dropTime || BASE_SPEED);
        return () => clearInterval(interval);
    }, [dropTime, hasStarted, gameOver, isPaused]);

    useImperativeHandle(ref, () => ({
        handleInput: (dir) => {
            if (!gameStateRef.current.hasStarted && !gameStateRef.current.gameOver) startGame();
            if (gameStateRef.current.gameOver) return;

            if (dir.x === -1) movePlayer(-1);
            if (dir.x === 1) movePlayer(1);
            if (dir.y === 1) dropPlayer();
            if (dir.y === -1) playerRotate(1);
        },
        handleAction: (type, isPressed) => {
            if (!isPressed || gameStateRef.current.gameOver) return;
            if (!gameStateRef.current.hasStarted) startGame();

            if (type === 'A') playerRotate(1);
            if (type === 'B') playerRotate(-1);
        },
        // ✅ EXPOSE RESET
        reset: startGame
    }));

    useEffect(() => {
        const handleKeyDown = (e) => {
            const { isPaused, gameOver, hasStarted, grid } = gameStateRef.current;
            
            if (isPaused) return;

            if (e.key === 'Enter') {
                if (gameOver || !hasStarted) {
                    startGame();
                    return;
                }
            }

            if (gameOver) return;

            if (!hasStarted && ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'a', 'b'].includes(e.key)) {
                startGame();
            }

            if (e.key === 'ArrowLeft') movePlayer(-1);
            else if (e.key === 'ArrowRight') movePlayer(1);
            else if (e.key === 'ArrowDown') dropPlayer();
            else if (e.key === 'ArrowUp') playerRotate(1);
            else if (e.key === 'a' || e.key === 'A') playerRotate(1);
            else if (e.key === 'b' || e.key === 'B') playerRotate(-1);
        };
        
        const handleKeyUp = (e) => {
            if (e.key === 'ArrowDown') setDropTime(BASE_SPEED);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const isDark = theme === 'dark';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full select-none outline-none pointer-events-auto">
            <div className="flex justify-between w-full max-w-[200px] mb-2 px-1">
                <div className={`text-xs font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
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
                    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                    width: '200px',
                    height: '280px'
                }}
            >
                {gameOver && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                        <h3 className="text-xl font-bold mb-2 text-red-400">GAME OVER</h3>
                        <button 
                            onClick={startGame}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:scale-105 transition-transform"
                        >
                            <HiArrowPath className="w-4 h-4" /> Try Again
                        </button>
                    </div>
                )}

                {!hasStarted && !gameOver && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/20 text-white pointer-events-none">
                        <div className="bg-black/60 px-3 py-1 rounded text-xs font-bold animate-pulse text-center">
                            Press Controls  
to Start
                        </div>
                    </div>
                )}

                {grid.map((row, y) => 
                    row.map((cell, x) => {
                        let isPlayer = false;
                        let cellColor = null;

                        if (hasStarted && !gameOver) {
                            const pY = y - player.pos.y;
                            const pX = x - player.pos.x;
                            if (pY >= 0 && pY < player.tetromino.length && pX >= 0 && pX < player.tetromino[pY].length) {
                                if (player.tetromino[pY][pX] !== 0) {
                                    isPlayer = true;
                                    const shapeId = player.tetromino[pY][pX];
                                    const map = [null, 'I', 'J', 'L', 'O', 'S', 'T', 'Z'];
                                    cellColor = TETROMINOS[map[shapeId]]?.color;
                                }
                            }
                        }

                        if (!isPlayer && cell[0] !== 0) {
                             const map = [null, 'I', 'J', 'L', 'O', 'S', 'T', 'Z'];
                             cellColor = TETROMINOS[map[cell[0]]]?.color;
                        }

                        let style = {};
                        if (cellColor) {
                            style = {
                                backgroundColor: `rgb(${cellColor})`,
                                boxShadow: `inset 0 0 4px rgba(0,0,0,0.2), 0 0 2px rgb(${cellColor})`
                            };
                        } else {
                            style = {
                                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)'
                            };
                        }

                        return <div key={`${y}-${x}`} className="w-full h-full border-[0.5px] border-white/5" style={style} />;
                    })
                )}
            </div>
        </div>
    );
});

export default TetrisGame;