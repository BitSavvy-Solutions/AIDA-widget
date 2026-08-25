/* src/AidaWidget/CopyableCode.jsx */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HiClipboard, HiCheck } from 'react-icons/hi2';

/**
 * Click-to-copy code snippet.
 *
 * Two presentations:
 *  - inline (default): a small chip that fits inside a sentence
 *  - block: a full-width command row with a trailing copy button
 *
 * Both confirm with a check icon and a brief "Copied!" tooltip.
 */
const CopyableCode = ({ text, isDark, block = false, className = '' }) => {
    const [copied, setCopied] = useState(false);
    const resetTimerRef = useRef(null);

    useEffect(() => () => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    }, []);

    const handleCopy = useCallback(async (e) => {
        e.stopPropagation();

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-secure contexts without the async clipboard API
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            resetTimerRef.current = setTimeout(() => setCopied(false), 1600);
        } catch {
            // Clipboard access was blocked; nothing useful to surface here
        }
    }, [text]);

    if (block) {
        return (
            <div className={`relative flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${
                isDark ? 'bg-gray-950 border-gray-700/80' : 'bg-white/70 border-gray-300'
            } ${className}`}>
                <code className={`flex-1 min-w-0 text-[11px] font-mono break-all select-all ${
                    isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                    {text}
                </code>
                <button
                    type="button"
                    onClick={handleCopy}
                    title={`Copy "${text}"`}
                    aria-label={`Copy ${text} to clipboard`}
                    className={`shrink-0 p-1 rounded transition-colors ${
                        copied
                            ? 'text-emerald-400'
                            : (isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-black/5')
                    }`}
                >
                    {copied ? <HiCheck className="w-3.5 h-3.5" /> : <HiClipboard className="w-3.5 h-3.5" />}
                </button>
                {copied && (
                    <span
                        role="status"
                        className={`absolute -top-5 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap pointer-events-none shadow-sm ${
                            isDark
                                ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}
                    >
                        Copied!
                    </span>
                )}
            </div>
        );
    }

    return (
        <span className={`relative inline-block align-baseline ${className}`}>
            <button
                type="button"
                onClick={handleCopy}
                title={`Click to copy "${text}"`}
                aria-label={`Copy ${text} to clipboard`}
                className={`font-mono inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                    copied
                        ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                        : (isDark ? 'bg-black/30 hover:bg-black/50' : 'bg-black/5 hover:bg-black/10')
                }`}
            >
                {text}
                {copied
                    ? <HiCheck className="w-3 h-3 shrink-0" />
                    : <HiClipboard className="w-3 h-3 shrink-0 opacity-50" />}
            </button>

            {copied && (
                <span
                    role="status"
                    className={`absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap pointer-events-none shadow-sm ${
                        isDark
                            ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}
                >
                    Copied!
                </span>
            )}
        </span>
    );
};

export default CopyableCode;