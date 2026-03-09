/* src/AidaWidget/EmbedModal.jsx */
import React, { useState, useEffect } from 'react';
import { HiXMark, HiArrowTopRightOnSquare, HiExclamationTriangle } from 'react-icons/hi2';

const EmbedModal = ({ url, isOpen, onClose, theme = 'dark' }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    // Reset state when URL changes
    useEffect(() => {
        setIsLoading(true);
        setLoadError(false);
    }, [url]);

    if (!isOpen || !url) return null;

    const isDark = theme === 'dark';

    // --- URL Transformation Logic ---
    let embedSrc = url;

    // 1. Handle YouTube
    // Converts: https://www.youtube.com/watch?v=dQw4w9WgXcQ -> https://www.youtube.com/embed/dQw4w9WgXcQ
    // Converts: https://youtu.be/dQw4w9WgXcQ -> https://www.youtube.com/embed/dQw4w9WgXcQ
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {

        // ── Parse the timestamp from the original URL ──────────────────────
        let startSeconds = 0;
        try {
            const urlObj = new URL(url);

            // Standard query param: ?t=90 or ?t=1m30s
            let tParam = urlObj.searchParams.get('t');

            // youtu.be short links sometimes put it in the hash: #t=90
            if (!tParam && urlObj.hash) {
                const hashMatch = urlObj.hash.match(/[#&]t=([^&]+)/);
                if (hashMatch) tParam = hashMatch[1];
            }

            if (tParam) {
                if (/^\d+$/.test(tParam)) {
                    // Plain integer seconds → "?t=90"
                    startSeconds = parseInt(tParam, 10);
                } else {
                    // Human-readable format → "?t=1h30m20s"
                    const h = tParam.match(/(\d+)h/);
                    const m = tParam.match(/(\d+)m/);
                    const s = tParam.match(/(\d+)s?$/);
                    startSeconds =
                        (h ? parseInt(h[1], 10) * 3600 : 0) +
                        (m ? parseInt(m[1], 10) * 60 : 0) +
                        (s ? parseInt(s[1], 10) : 0);
                }
            }
        } catch (_) {
            // Malformed URL — just play from the start
        }

        embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1${startSeconds > 0 ? `&start=${startSeconds}` : ''
            }`;
    }

    // 2. Handle Vimeo (basic)
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
        embedSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Container */}
            <div className={`relative w-full max-w-5xl h-[85vh] flex flex-col rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
                    }`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
                        <h3 className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            {url}
                        </h3>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-1.5 rounded hover:bg-opacity-10 transition-colors ${isDark ? 'text-gray-400 hover:bg-white' : 'text-gray-500 hover:bg-black'
                                }`}
                            title="Open in new tab"
                        >
                            <HiArrowTopRightOnSquare className="w-4 h-4" />
                        </a>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                            }`}
                    >
                        <HiXMark className="w-6 h-6" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative bg-black">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}

                    {loadError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20 bg-gray-900 text-gray-300">
                            <HiExclamationTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                            <h4 className="text-lg font-semibold mb-2">Cannot Embed This Site</h4>
                            <p className="max-w-md text-sm text-gray-400 mb-6">
                                This website ({new URL(url).hostname}) prevents itself from being displayed in a window (X-Frame-Options).
                            </p>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Open in New Tab Instead
                            </a>
                        </div>
                    ) : (
                        <iframe
                            src={embedSrc}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                            onLoad={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setLoadError(true);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmbedModal;