/* src/AidaWidget/hooks/useOllama.js */
import { useState, useEffect, useCallback, useRef } from 'react';

const OLLAMA_URL_KEY = 'aida-ollama-url';
const OLLAMA_CONNECTED_KEY = 'aida-ollama-connected';
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const CONNECT_TIMEOUT_MS = 6000;

// Prettify "llama3.2:latest" -> "Llama 3.2", "qwen2.5:7b" -> "Qwen 2.5 7b"
const prettifyName = (name = '') => {
    const base = name.replace(/:latest$/, '');
    const [family, ...rest] = base.split(':');
    const version = rest.length ? ` ${rest.join(':')}` : '';
    const prettyFamily = family
        .replace(/([a-z])([0-9])/gi, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    return `${prettyFamily}${version}`.trim();
};

export const formatSize = (bytes) => {
    if (!bytes) return null;
    const gb = bytes / (1024 ** 3);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / (1024 ** 2))} MB`;
};

const normalizeOllamaModel = (raw) => {
    const families = raw?.details?.families || [];
    const hasVision = families.some((f) => /clip|vision|mllama/i.test(f));
    return {
        value: `ollama:${raw.name}`,
        label: prettifyName(raw.name),
        category: 'local',
        modality: hasVision ? 'text+image->text' : 'text->text',
        description: formatSize(raw.size),
        ollama: true,
        // Extra metadata for the settings screen
        name: raw.name,
        sizeBytes: raw.size ?? 0,
        modifiedAt: raw.modified_at || null,
        parameterSize: raw?.details?.parameter_size || null,
        quantization: raw?.details?.quantization_level || null,
    };
};

const friendlyError = (err, url) => {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
        return `Connection timed out. Is Ollama running at ${url}?`;
    }
    if (/failed to fetch|networkerror/i.test(err?.message || '')) {
        return `Cannot reach Ollama at ${url}. Make sure it is running and allows this origin.`;
    }
    return err?.message || 'Unknown connection error.';
};

/**
 * Manages the connection to a local (or remote) Ollama server:
 * host configuration, model listing, model pulling, status, and refresh.
 */
export const useOllama = () => {
    const [baseUrl, setBaseUrlState] = useState(() => {
        try { return localStorage.getItem(OLLAMA_URL_KEY) || DEFAULT_OLLAMA_URL; }
        catch { return DEFAULT_OLLAMA_URL; }
    });
    const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected | error
    const [models, setModels] = useState([]);
    const [error, setError] = useState(null);
    const [lastFetchedAt, setLastFetchedAt] = useState(null);

    // Pull state: { name, status, completed, total, percent, phase: 'pulling'|'success'|'error', error }
    const [pullState, setPullState] = useState(null);

    const mountedRef = useRef(true);
    const pullAbortRef = useRef(null);

    useEffect(() => () => {
        mountedRef.current = false;
        pullAbortRef.current?.abort();
    }, []);

    const setBaseUrl = useCallback((url) => {
        const cleaned = (url || '').trim().replace(/\/+$/, '') || DEFAULT_OLLAMA_URL;
        setBaseUrlState(cleaned);
        try { localStorage.setItem(OLLAMA_URL_KEY, cleaned); } catch { /* ignore */ }
    }, []);

    const fetchModels = useCallback(async (urlOverride) => {
        const url = (urlOverride || baseUrl).trim().replace(/\/+$/, '');
        setStatus('connecting');
        setError(null);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

        try {
            const res = await fetch(`${url}/api/tags`, { signal: controller.signal });
            if (!res.ok) throw new Error(`Ollama responded with HTTP ${res.status}`);
            const data = await res.json();
            const normalized = (data.models || [])
                .map(normalizeOllamaModel)
                .sort((a, b) => a.label.localeCompare(b.label));
            if (!mountedRef.current) return normalized;
            setModels(normalized);
            setStatus('connected');
            setLastFetchedAt(Date.now());
            try { localStorage.setItem(OLLAMA_CONNECTED_KEY, 'true'); } catch { /* ignore */ }
            return normalized;
        } catch (err) {
            if (!mountedRef.current) return [];
            setModels([]);
            setStatus('error');
            setError(friendlyError(err, url));
            try { localStorage.setItem(OLLAMA_CONNECTED_KEY, 'false'); } catch { /* ignore */ }
            return [];
        } finally {
            clearTimeout(timeout);
        }
    }, [baseUrl]);

    const disconnect = useCallback(() => {
        pullAbortRef.current?.abort();
        setPullState(null);
        setStatus('disconnected');
        setModels([]);
        setError(null);
        try { localStorage.setItem(OLLAMA_CONNECTED_KEY, 'false'); } catch { /* ignore */ }
    }, []);

    // Called by the chat layer when an Ollama request fails mid-session,
    // so the UI can surface a stale connection and offer a refresh.
    const reportRuntimeError = useCallback((message) => {
        setStatus('error');
        setError(message || 'The Ollama request failed. Try refreshing the model list.');
    }, []);

    /**
     * Downloads a model via POST /api/pull and tracks aggregate progress.
     * Ollama streams one JSON line per status update; download layers report
     * { digest, completed, total }, so we sum across layers for a stable percent.
     */
    const pullModel = useCallback(async (name) => {
        const modelName = (name || '').trim();
        if (!modelName || pullAbortRef.current) return; // already pulling

        const url = baseUrl.trim().replace(/\/+$/, '');
        const controller = new AbortController();
        pullAbortRef.current = controller;
        const layers = new Map();

        setPullState({
            name: modelName,
            status: 'Connecting...',
            completed: 0,
            total: 0,
            percent: null,
            phase: 'pulling',
            error: null,
        });

        try {
            const res = await fetch(`${url}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: modelName, stream: true }),
                signal: controller.signal,
            });

            if (!res.ok) {
                let msg = `Pull failed (HTTP ${res.status})`;
                try {
                    const errData = await res.json();
                    if (errData?.error) msg = errData.error;
                } catch { /* ignore */ }
                throw new Error(msg);
            }

            if (!res.body) throw new Error('Ollama returned an empty response body.');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    let data;
                    try { data = JSON.parse(trimmed); } catch { continue; }

                    if (data.error) {
                        throw new Error(typeof data.error === 'string' ? data.error : 'Pull failed.');
                    }

                    // Track per-layer progress so the total percent is smooth
                    if (data.digest && typeof data.total === 'number') {
                        const prev = layers.get(data.digest) || { completed: 0, total: 0 };
                        layers.set(data.digest, {
                            completed: Math.max(prev.completed, data.completed ?? 0),
                            total: Math.max(prev.total, data.total),
                        });
                    }

                    let completed = 0;
                    let total = 0;
                    for (const layer of layers.values()) {
                        completed += layer.completed;
                        total += layer.total;
                    }

                    const isSuccess = data.status === 'success';
                    const percent = total > 0
                        ? Math.min(100, Math.floor((completed / total) * 100))
                        : (isSuccess ? 100 : null);

                    if (!mountedRef.current) return;

                    setPullState({
                        name: modelName,
                        status: isSuccess ? 'Download complete' : (data.status || 'Downloading...'),
                        completed,
                        total,
                        percent,
                        phase: isSuccess ? 'success' : 'pulling',
                        error: null,
                    });
                }
            }

            // Refresh the installed model list once the stream ends
            await fetchModels();
        } catch (err) {
            if (!mountedRef.current) return;
            if (err?.name === 'AbortError') {
                setPullState(prev => prev ? { ...prev, phase: 'error', status: 'Cancelled', error: 'Download cancelled.' } : null);
            } else {
                const msg = /failed to fetch|networkerror/i.test(err?.message || '')
                    ? `Lost connection to Ollama at ${url}.`
                    : (err?.message || 'Pull failed.');
                setPullState(prev => prev ? { ...prev, phase: 'error', status: 'Failed', error: msg } : null);
            }
        } finally {
            pullAbortRef.current = null;
        }
    }, [baseUrl, fetchModels]);

    const cancelPull = useCallback(() => {
        pullAbortRef.current?.abort();
    }, []);

    const clearPullState = useCallback(() => setPullState(null), []);

    // Silently reconnect on load if the user was connected last time
    useEffect(() => {
        let wasConnected = false;
        try { wasConnected = localStorage.getItem(OLLAMA_CONNECTED_KEY) === 'true'; } catch { /* ignore */ }
        if (wasConnected) fetchModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        baseUrl,
        setBaseUrl,
        status,
        models,
        error,
        lastFetchedAt,
        fetchModels,
        disconnect,
        reportRuntimeError,
        pullState,
        pullModel,
        cancelPull,
        clearPullState,
    };
};