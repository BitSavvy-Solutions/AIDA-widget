/* src/AidaWidget/hooks/useChromeAI.js */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Chrome Built-in AI (Browser Local AI via the Prompt API).
 *
 * Single source of truth for support, availability and download progress.
 * Lives at the widget level so the model selector, the chat pipeline and the
 * management panel all read the same state. Availability sweeps are cheap
 * (one call per activation) and sessions are destroyed immediately after
 * enable/test so no memory is held.
 */

const API_DEFS = [
    {
        key: 'prompt',
        label: 'Prompt API',
        globalName: 'LanguageModel',
        tagline: 'Browser Local AI · free-form prompts',
        availabilityOptions: () => ({}),
        createOptions: () => ({}),
    },
];

// Some Chromium forks (e.g. Opera) expose the LanguageModel global even when
// the feature flag is off, but availability() never resolves. Racing it
// against a timeout prevents the UI from getting stuck in "checking".
const AVAILABILITY_TIMEOUT_MS = 5000;

const withTimeout = (promise, ms) => Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
        setTimeout(() => reject(new Error('availability-timeout')), ms);
    }),
]);

// Normalize old ('readily', 'after-download', 'no') and new spec values.
const normalizeAvailability = (raw) => {
    switch (raw) {
        case 'available':
        case 'readily':
            return 'available';
        case 'downloadable':
        case 'after-download':
            return 'downloadable';
        case 'downloading':
            return 'downloading';
        case 'unavailable':
        case 'no':
        default:
            return 'unavailable';
    }
};

// Synchronous support probe, safe to call anywhere (tab badges, gating).
export const getChromeAISupport = () => {
    const apis = {};
    let supported = false;
    if (typeof window !== 'undefined') {
        for (const def of API_DEFS) {
            const present = def.globalName in window;
            apis[def.key] = present;
            if (present) supported = true;
        }
    }
    return { supported, apis };
};

export const useChromeAI = (isActive) => {
    const [statuses, setStatuses] = useState({});
    const mountedRef = useRef(true);

    useEffect(() => () => { mountedRef.current = false; }, []);

    const setStatus = useCallback((key, patch) => {
        if (!mountedRef.current) return;
        setStatuses(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    }, []);

    const checkAll = useCallback(async () => {
        const support = getChromeAISupport();

        setStatuses(prev => {
            const next = { ...prev };
            for (const def of API_DEFS) {
                next[def.key] = support.apis[def.key]
                    ? { ...next[def.key], phase: 'checking', error: undefined }
                    : { phase: 'unsupported' };
            }
            return next;
        });

        await Promise.all(API_DEFS.map(async (def) => {
            if (!support.apis[def.key]) return;
            try {
                const ctor = window[def.globalName];
                const raw = await withTimeout(
                    ctor.availability(def.availabilityOptions()),
                    AVAILABILITY_TIMEOUT_MS
                );
                setStatus(def.key, { phase: normalizeAvailability(raw) });
            } catch (err) {
                if (err?.message === 'availability-timeout') {
                    // Global exists but never answered: flag is almost certainly off.
                    setStatus(def.key, { phase: 'flag-disabled' });
                } else {
                    setStatus(def.key, { phase: 'unavailable' });
                }
            }
        }));
    }, [setStatus]);

    // One sweep per activation.
    useEffect(() => {
        if (isActive) checkAll();
    }, [isActive, checkAll]);

    const enableApi = useCallback(async (key) => {
        const def = API_DEFS.find(d => d.key === key);
        const ctor = def && window[def.globalName];
        if (!ctor) return;

        setStatus(key, { phase: 'downloading', progress: 0, error: undefined });
        try {
            const instance = await ctor.create({
                ...def.createOptions(),
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        const pct = Math.max(0, Math.min(100, Math.round((e.loaded ?? 0) * 100)));
                        setStatus(key, { phase: 'downloading', progress: pct });
                    });
                },
            });
            instance?.destroy?.();
            setStatus(key, { phase: 'available', progress: undefined });
        } catch (err) {
            setStatus(key, { phase: 'error', progress: undefined, error: err?.message || 'Download failed.' });
        }
    }, [setStatus]);


    // Selector-ready view of the Prompt API. This is the model the chat
    // pipeline uses when a "chrome:" model is selected.
    const chatModels = useMemo(() => {
        const phase = statuses.prompt?.phase || 'checking';
        return [{
            value: 'chrome:localai',
            label: 'Browser Local AI',
            category: 'local',
            modality: 'text->text',
            description: 'Chrome built-in',
            chrome: true,
            status: phase,
            selectable: phase === 'available',
        }];
    }, [statuses.prompt?.phase]);

    return {
        defs: API_DEFS,
        statuses,
        support: getChromeAISupport(),
        chatModels,
        checkAll,
        enableApi,
    };
};