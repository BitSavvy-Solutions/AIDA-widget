/* src/AidaWidget/ContextSelector.jsx */
import React, { useRef, useState, useEffect } from 'react';
import { HiOutlineQueueList, HiCheck } from 'react-icons/hi2';

const PRESETS = [2, 5, 10, 20, 50, 1000]; // 1000 represents "ALL"

const ContextSelector = ({ value, onChange, theme = 'dark' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const currentValRef = useRef(value);
    const menuRef = useRef(null);

    // Keep ref in sync for event handlers
    useEffect(() => {
        currentValRef.current = value;
    }, [value]);

    // Close menu on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const isAll = value >= 1000;
    const displayValue = isAll ? "ALL" : value;

    // --- LOGIC: The "Tumbler" Math ---
    const adjustValue = (direction) => {
        // direction: 1 (up/increment), -1 (down/decrement)
        let next;
        const current = currentValRef.current;

        if (direction === 1) {
            // Scrolling UP
            if (current >= 1000) next = 1; // Loop back to 1? Or stay? Let's go to 1 based on request
            else next = current + 1;
        } else {
            // Scrolling DOWN
            if (current <= 1) next = 1000; // Below 1 becomes ALL
            else if (current >= 1000) next = 1000; // Stay at ALL if scrolling down
            else next = current - 1;
        }

        // Cap at reasonable number for manual scrolling before jumping to ALL
        if (next > 100 && next < 1000) next = 100; 

        onChange(next);
    };

    // --- HANDLERS: Mouse Wheel ---
    const handleWheel = (e) => {
        e.preventDefault();
        // deltaY negative = scrolling up (increment)
        // deltaY positive = scrolling down (decrement)
        const direction = e.deltaY < 0 ? 1 : -1;
        adjustValue(direction);
    };

    // --- HANDLERS: Touch / Drag ---
    const handleTouchStart = (e) => {
        setIsDragging(true);
        startY.current = e.touches ? e.touches[0].clientY : e.clientY;
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const delta = startY.current - clientY; // Positive = Dragging Up

        // Sensitivity: Change every 15 pixels of drag
        if (Math.abs(delta) > 15) {
            const direction = delta > 0 ? 1 : -1; // Up = increment, Down = decrement
            adjustValue(direction);
            startY.current = clientY; // Reset reference to create "ticks"
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    // --- STYLES ---
    const isDark = theme === 'dark';
    
    // ✅ UPDATED: Much brighter text and distinct background/border
    const baseClass = isDark 
        ? 'text-gray-200 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 shadow-sm' 
        : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm';
    
    // ✅ UPDATED: Active state overrides the base style clearly
    const activeClass = isAll 
        ? (isDark ? '!text-blue-300 !bg-blue-500/20 !border-blue-500/40' : '!text-blue-600 !bg-blue-50 !border-blue-200')
        : '';

    return (
        <div className="relative" ref={menuRef}>
            {/* The Pill Trigger */}
            <div
                className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all cursor-ns-resize select-none
                    ${baseClass}
                    ${activeClass}
                    ${isDragging ? 'cursor-grabbing scale-105 ring-2 ring-blue-500/30' : ''}
                `}
                onWheel={handleWheel}
                
                // Touch Events for Mobile
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                
                // Click to open menu (if not dragging)
                onClick={() => !isDragging && setIsOpen(!isOpen)}
                
                title="Scroll or drag up/down to change context limit"
            >
                <HiOutlineQueueList className="w-4 h-4 opacity-80" />
                <span className="text-xs font-bold font-mono min-w-[1.2rem] text-center">
                    {displayValue}
                </span>
            </div>

            {/* The "Carousel" Menu (Dropdown) */}
            {isOpen && (
                <div className={`absolute bottom-full left-0 mb-2 w-28 rounded-lg shadow-xl border overflow-hidden z-50 flex flex-col-reverse ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    {PRESETS.map((preset) => {
                        const isSelected = value === preset || (preset === 1000 && value >= 1000);
                        return (
                            <button
                                key={preset}
                                onClick={() => { onChange(preset); setIsOpen(false); }}
                                className={`px-3 py-2 text-xs font-medium flex items-center justify-between w-full transition-colors ${
                                    isSelected 
                                        ? (isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-600') 
                                        : (isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-50')
                                }`}
                            >
                                <span>{preset === 1000 ? "ALL History" : `${preset} msgs`}</span>
                                {isSelected && <HiCheck className="w-3 h-3" />}
                            </button>
                        );
                    })}
                    <div className={`px-2 py-1.5 text-[10px] text-center uppercase tracking-wider border-b font-semibold ${isDark ? 'bg-gray-900/50 text-gray-500 border-gray-700' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        Context Limit
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContextSelector;