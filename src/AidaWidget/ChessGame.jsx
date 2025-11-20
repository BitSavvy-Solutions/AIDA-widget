/* src/AidaWidget/ChessGame.jsx */
import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { HiOutlineTrophy, HiArrowPath } from 'react-icons/hi2';

// Unicode Chess Pieces
const PIECES = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

const INITIAL_BOARD = [
    ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
    ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
    ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr'],
];

const loadState = (key, defaultVal) => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultVal;
    } catch {
        return defaultVal;
    }
};

const ChessGame = forwardRef(({ isPaused, theme = 'dark' }, ref) => {
    // State
    const [board, setBoard] = useState(() => loadState('aida-chess-board', INITIAL_BOARD));
    const [turn, setTurn] = useState(() => loadState('aida-chess-turn', 'w'));
    
    // ✅ NEW: Visual ViewPoint (Controls rotation). Defaults to current turn.
    const [viewPoint, setViewPoint] = useState(turn);

    const [captured, setCaptured] = useState(() => loadState('aida-chess-captured', { w: [], b: [] }));
    const [gameOver, setGameOver] = useState(() => loadState('aida-chess-gameover', false));
    const [winner, setWinner] = useState(() => loadState('aida-chess-winner', null));
    const [selected, setSelected] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [cursor, setCursor] = useState({ r: 6, c: 4 });

    const gameStateRef = useRef({ board, turn, selected, validMoves, cursor, gameOver });

    useEffect(() => {
        gameStateRef.current = { board, turn, selected, validMoves, cursor, gameOver };
    }, [board, turn, selected, validMoves, cursor, gameOver]);

    useEffect(() => {
        localStorage.setItem('aida-chess-board', JSON.stringify(board));
        localStorage.setItem('aida-chess-turn', JSON.stringify(turn));
        localStorage.setItem('aida-chess-captured', JSON.stringify(captured));
        localStorage.setItem('aida-chess-gameover', JSON.stringify(gameOver));
        localStorage.setItem('aida-chess-winner', JSON.stringify(winner));
    }, [board, turn, captured, gameOver, winner]);

    // ✅ DELAYED ROTATION LOGIC
    useEffect(() => {
        // When the logical 'turn' changes, wait 1 second before updating the visual 'viewPoint'
        if (turn !== viewPoint) {
            const timer = setTimeout(() => {
                setViewPoint(turn);
            }, 1000); // 1 second delay
            return () => clearTimeout(timer);
        }
    }, [turn, viewPoint]);

    const resetGame = () => {
        setBoard(INITIAL_BOARD);
        setTurn('w');
        setViewPoint('w'); // Reset view immediately
        setCaptured({ w: [], b: [] });
        setSelected(null);
        setValidMoves([]);
        setGameOver(false);
        setWinner(null);
        setCursor({ r: 6, c: 4 });
        
        localStorage.removeItem('aida-chess-board');
        localStorage.removeItem('aida-chess-turn');
        localStorage.removeItem('aida-chess-captured');
        localStorage.removeItem('aida-chess-gameover');
        localStorage.removeItem('aida-chess-winner');
    };

    const isValidPos = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

    const getMoves = (r, c, piece, currentBoard) => {
        const color = piece[0];
        const type = piece[1];
        const moves = [];

        const addIfValid = (nr, nc) => {
            if (isValidPos(nr, nc)) {
                const target = currentBoard[nr][nc];
                if (!target || target[0] !== color) {
                    moves.push({ r: nr, c: nc });
                    return !!target; 
                }
                return true; 
            }
            return true; 
        };

        const slide = (dr, dc) => {
            let nr = r + dr;
            let nc = c + dc;
            while (isValidPos(nr, nc)) {
                const target = currentBoard[nr][nc];
                if (!target) {
                    moves.push({ r: nr, c: nc });
                } else {
                    if (target[0] !== color) moves.push({ r: nr, c: nc });
                    break;
                }
                nr += dr;
                nc += dc;
            }
        };

        if (type === 'p') {
            const dir = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;
            if (isValidPos(r + dir, c) && !currentBoard[r + dir][c]) {
                moves.push({ r: r + dir, c });
                if (r === startRow && !currentBoard[r + dir * 2][c]) {
                    moves.push({ r: r + dir * 2, c });
                }
            }
            [[dir, -1], [dir, 1]].forEach(([dr, dc]) => {
                if (isValidPos(r + dr, c + dc)) {
                    const target = currentBoard[r + dr][c + dc];
                    if (target && target[0] !== color) moves.push({ r: r + dr, c: c + dc });
                }
            });
        }
        else if (type === 'n') {
            [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
        }
        else if (type === 'b') {
            [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr, dc]) => slide(dr, dc));
        }
        else if (type === 'r') {
            [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => slide(dr, dc));
        }
        else if (type === 'q') {
            [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => slide(dr, dc));
        }
        else if (type === 'k') {
            [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
        }

        return moves;
    };

    const handleSquareClick = (r, c) => {
        if (gameOver) return;

        const clickedPiece = board[r][c];
        const isFriendly = clickedPiece && clickedPiece[0] === turn;

        if (isFriendly) {
            setSelected({ r, c });
            setValidMoves(getMoves(r, c, clickedPiece, board));
            setCursor({ r, c });
            return;
        }

        if (selected) {
            const isMoveValid = validMoves.some(m => m.r === r && m.c === c);
            if (isMoveValid) {
                const newBoard = board.map(row => [...row]);
                const movingPiece = newBoard[selected.r][selected.c];
                const targetPiece = newBoard[r][c];

                if (targetPiece) {
                    setCaptured(prev => ({
                        ...prev,
                        [turn]: [...prev[turn], targetPiece]
                    }));
                    
                    if (targetPiece[1] === 'k') {
                        setGameOver(true);
                        setWinner(turn);
                    }
                }

                newBoard[r][c] = movingPiece;
                newBoard[selected.r][selected.c] = null;

                if (movingPiece[1] === 'p' && (r === 0 || r === 7)) {
                    newBoard[r][c] = movingPiece[0] + 'q';
                }

                setBoard(newBoard);
                setTurn(prev => prev === 'w' ? 'b' : 'w'); // Logic updates immediately
                setSelected(null);
                setValidMoves([]);
            } else {
                setSelected(null);
                setValidMoves([]);
            }
        }
    };

    const moveCursor = (dr, dc) => {
        setCursor(prev => {
            let effectiveDr = dr;
            let effectiveDc = dc;
            // Use viewPoint for controls so they match what the user sees
            if (viewPoint === 'b') {
                effectiveDr = -dr;
                effectiveDc = -dc;
            }
            let nr = prev.r + effectiveDr;
            let nc = prev.c + effectiveDc;
            if (nr < 0) nr = 7;
            if (nr > 7) nr = 0;
            if (nc < 0) nc = 7;
            if (nc > 7) nc = 0;
            return { r: nr, c: nc };
        });
    };

    useImperativeHandle(ref, () => ({
        handleInput: (dir) => {
            if (gameOver) return;
            if (dir.y !== 0) moveCursor(dir.y, 0);
            if (dir.x !== 0) moveCursor(0, dir.x);
        },
        handleAction: (type, isPressed) => {
            if (!isPressed) return;
            if (gameOver && type === 'A') {
                resetGame();
                return;
            }
            const { cursor } = gameStateRef.current;
            if (type === 'A') handleSquareClick(cursor.r, cursor.c);
            if (type === 'B') { setSelected(null); setValidMoves([]); }
        },
        reset: resetGame
    }));

    const isDark = theme === 'dark';

    const CapturedRow = ({ pieces }) => (
        <div className="flex flex-wrap gap-0.5 h-6 items-center justify-center overflow-hidden">
            {pieces.map((p, i) => (
                <span 
                    key={i} 
                    className={`text-sm leading-none ${
                        p[0] === 'w' 
                            ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                            : 'text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]'
                    }`}
                >
                    {PIECES[p[0]][p[1]]}
                </span>
            ))}
        </div>
    );

    // ✅ Use viewPoint to determine UI layout (so it flips with the board)
    const topStash = viewPoint === 'w' ? captured['b'] : captured['w'];
    const bottomStash = viewPoint === 'w' ? captured['w'] : captured['b'];

    return (
        <div className="flex flex-col items-center justify-center w-full h-full select-none outline-none pointer-events-auto">
            
            {/* TOP CAPTURED ROW */}
            <div className="w-full max-w-[240px] mb-1 px-1 flex justify-between items-end">
                <div className={`text-[10px] font-bold opacity-70 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {viewPoint === 'w' ? 'BLACK CAPTURES' : 'WHITE CAPTURES'}
                </div>
                <CapturedRow pieces={topStash} />
            </div>

            {/* Board Container */}
            <div 
                className={`relative border-4 rounded-lg shadow-2xl transition-transform duration-700 ease-in-out ${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-300 border-gray-400'
                }`}
                style={{
                    width: '240px',
                    height: '240px',
                    // ✅ Use viewPoint for rotation
                    transform: viewPoint === 'b' ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
            >
                {/* Game Over Overlay */}
                {gameOver && (
                    <div 
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white"
                        style={{ transform: viewPoint === 'b' ? 'rotate(-180deg)' : 'rotate(0deg)' }}
                    >
                        <h3 className="text-xl font-bold mb-2 text-yellow-400">CHECKMATE</h3>
                        <button 
                            onClick={resetGame}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:scale-105 transition-transform"
                        >
                            <HiArrowPath className="w-4 h-4" /> New Game
                        </button>
                    </div>
                )}

                {/* The Grid */}
                <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                    {board.map((row, r) => 
                        row.map((piece, c) => {
                            const isBlackSquare = (r + c) % 2 === 1;
                            const isSelected = selected?.r === r && selected?.c === c;
                            const isValidMove = validMoves.some(m => m.r === r && m.c === c);
                            const isCursor = cursor.r === r && cursor.c === c;

                            let bgClass = isBlackSquare 
                                ? (isDark ? 'bg-slate-600' : 'bg-slate-400') 
                                : (isDark ? 'bg-slate-400' : 'bg-slate-200');

                            if (isSelected) bgClass = 'bg-yellow-500/80';
                            else if (isValidMove) bgClass = isBlackSquare ? 'bg-green-600/60' : 'bg-green-400/60';

                            return (
                                <div 
                                    key={`${r}-${c}`}
                                    onClick={() => handleSquareClick(r, c)}
                                    className={`relative flex items-center justify-center text-2xl cursor-pointer ${bgClass}`}
                                >
                                    {isCursor && !gameOver && (
                                        <div className="absolute inset-0 border-2 border-cyan-400 animate-pulse z-10 pointer-events-none" />
                                    )}
                                    {isValidMove && !piece && (
                                        <div className="w-3 h-3 rounded-full bg-black/20" />
                                    )}
                                    {piece && (
                                        <span 
                                            className={`select-none relative z-10 transition-transform duration-700 ease-in-out ${
                                                piece[0] === 'w' 
                                                    ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' 
                                                    : 'text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]'
                                            }`}
                                            // ✅ Use viewPoint for counter-rotation
                                            style={{
                                                transform: viewPoint === 'b' ? 'rotate(180deg)' : 'rotate(0deg)'
                                            }}
                                        >
                                            {PIECES[piece[0]][piece[1]]}
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* BOTTOM CAPTURED ROW */}
            <div className="w-full max-w-[240px] mt-1 px-1 flex justify-between items-start">
                <div className={`text-[10px] font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    {viewPoint === 'w' ? 'WHITE CAPTURES' : 'BLACK CAPTURES'}
                </div>
                <CapturedRow pieces={bottomStash} />
            </div>
        </div>
    );
});

export default ChessGame;