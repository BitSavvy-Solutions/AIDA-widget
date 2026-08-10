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

const formatSize = (bytes) => {
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
 * host configuration, model listing, status, and refresh.
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
    const mountedRef = useRef(true);

    useEffect(() => () => { mountedRef.current = false; }, []);

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
    };
};