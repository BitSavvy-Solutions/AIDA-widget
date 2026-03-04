// src/AidaWidget/hooks/useVAD.js
import { useState, useRef, useCallback, useEffect } from 'react';

const VAD_ONNX_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
const VAD_ASSET_BASE = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/';

/**
 * Loads the VAD library dynamically from CDN if not already present.
 */
const loadVADScript = () => {
    return new Promise((resolve, reject) => {
        // Already loaded
        if (window.vad) {
            resolve(window.vad);
            return;
        }

        // Load ONNX runtime first, then VAD bundle
        const loadScript = (src) =>
            new Promise((res, rej) => {
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    // Script tag exists but window.vad may not be ready yet — wait a tick
                    existing.addEventListener('load', res);
                    existing.addEventListener('error', rej);
                    // If already loaded (readyState), resolve immediately
                    if (existing.dataset.loaded === 'true') res();
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.onload = () => {
                    script.dataset.loaded = 'true';
                    res();
                };
                script.onerror = () => rej(new Error(`Failed to load script: ${src}`));
                document.head.appendChild(script);
            });

        (async () => {
            try {
                await loadScript(
                    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.wasm.min.js'
                );
                await loadScript(
                    'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/bundle.min.js'
                );
                if (!window.vad) {
                    reject(new Error('VAD library loaded but window.vad is not defined.'));
                    return;
                }
                resolve(window.vad);
            } catch (err) {
                reject(err);
            }
        })();
    });
};

const SILENCE_COUNTDOWN_SECONDS = 3;

/**
 * Hook that integrates @ricky0123/vad-web for voice activity detection.
 *
 * @param {object} config
 * @param {boolean} config.isEnabled        - Only activate when recording is active.
 * @param {Function} config.onSilenceTimeout - Called when silence countdown reaches zero.
 * @returns {{
 *   silenceCountdown: number|null,
 *   vadStatus: 'idle'|'loading'|'listening'|'speech'|'error',
 *   vadError: string|null,
 *   cancelSilenceCountdown: Function
 * }}
 */
export const useVAD = ({ isEnabled, onSilenceTimeout }) => {
    const [silenceCountdown, setSilenceCountdown] = useState(null);
    const [vadStatus, setVadStatus] = useState('idle');
    const [vadError, setVadError] = useState(null);

    const vadInstanceRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const onSilenceTimeoutRef = useRef(onSilenceTimeout);
    const isMountedRef = useRef(true);

    // Keep callback ref fresh
    useEffect(() => {
        onSilenceTimeoutRef.current = onSilenceTimeout;
    }, [onSilenceTimeout]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const clearCountdown = useCallback(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        if (isMountedRef.current) setSilenceCountdown(null);
    }, []);

    const startCountdown = useCallback(() => {
        clearCountdown();
        if (!isMountedRef.current) return;

        setSilenceCountdown(SILENCE_COUNTDOWN_SECONDS);
        let remaining = SILENCE_COUNTDOWN_SECONDS;

        countdownIntervalRef.current = setInterval(() => {
            remaining -= 1;
            if (!isMountedRef.current) {
                clearInterval(countdownIntervalRef.current);
                return;
            }
            if (remaining <= 0) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
                setSilenceCountdown(null);
                onSilenceTimeoutRef.current?.();
            } else {
                setSilenceCountdown(remaining);
            }
        }, 1000);
    }, [clearCountdown]);

    // Start / stop VAD based on isEnabled
    useEffect(() => {
        if (!isEnabled) {
            // Tear down VAD and any running countdown
            clearCountdown();
            if (vadInstanceRef.current) {
                try {
                    vadInstanceRef.current.pause();
                } catch (_) { /* ignore */ }
                vadInstanceRef.current = null;
            }
            if (isMountedRef.current) {
                setVadStatus('idle');
                setVadError(null);
            }
            return;
        }

        let cancelled = false;

        const initVAD = async () => {
            if (!isMountedRef.current) return;
            setVadStatus('loading');
            setVadError(null);

            try {
                const vadLib = await loadVADScript();

                if (cancelled || !isMountedRef.current) return;

                const instance = await vadLib.MicVAD.new({
                    onSpeechStart: () => {
                        if (!isMountedRef.current) return;
                        // User started speaking — cancel any pending silence countdown
                        clearCountdown();
                        setVadStatus('speech');
                    },
                    onSpeechEnd: (_audio) => {
                        if (!isMountedRef.current) return;
                        // User stopped speaking — begin silence countdown
                        setVadStatus('listening');
                        startCountdown();
                    },
                    onnxWASMBasePath: VAD_ONNX_BASE,
                    baseAssetPath: VAD_ASSET_BASE,
                    // Slightly more aggressive settings for responsiveness
                    positiveSpeechThreshold: 0.6,
                    negativeSpeechThreshold: 0.35,
                    redemptionFrames: 8,
                    minSpeechFrames: 3,
                });

                if (cancelled || !isMountedRef.current) {
                    try { instance.pause(); } catch (_) { /* ignore */ }
                    return;
                }

                vadInstanceRef.current = instance;
                instance.start();
                setVadStatus('listening');
            } catch (err) {
                if (!isMountedRef.current || cancelled) return;
                console.error('[useVAD] Initialization error:', err);
                setVadError(err.message || 'VAD failed to initialize.');
                setVadStatus('error');
            }
        };

        initVAD();

        return () => {
            cancelled = true;
            clearCountdown();
            if (vadInstanceRef.current) {
                try { vadInstanceRef.current.pause(); } catch (_) { /* ignore */ }
                vadInstanceRef.current = null;
            }
        };
    }, [isEnabled, clearCountdown, startCountdown]);

    const cancelSilenceCountdown = useCallback(() => {
        clearCountdown();
        // If VAD instance is alive, keep it in listening state
        if (vadInstanceRef.current) {
            setVadStatus('listening');
        }
    }, [clearCountdown]);

    return {
        silenceCountdown,
        vadStatus,
        vadError,
        cancelSilenceCountdown,
    };
};