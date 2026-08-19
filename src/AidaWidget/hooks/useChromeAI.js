/* src/AidaWidget/hooks/useChromeAI.js */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Chrome Built-in AI (Browser Local AI via the Prompt API).
 *
 * Single source of truth for support, availability and download progress.
 * Multimodal capabilities (image input, audio input) are probed independently
 * because a given Chromium build can support one but not the other.
 */

const API_DEFS = [
    {
        key: 'prompt',
        label: 'Prompt API',
        globalName: 'LanguageModel',
        tagline: 'Browser Local AI · text, image & audio prompts',
    },
];

// Some Chromium forks expose the LanguageModel global even when the feature
// flag is off, but availability() never resolves. Race it against a timeout.
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

// Options used to probe each non-text input modality on its own.
const MODALITY_PROBE_OPTIONS = {
    image: { expectedInputs: [{ type: 'text' }, { type: 'image' }] },
    audio: { expectedInputs: [{ type: 'text' }, { type: 'audio' }] },
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
            const ctor = window[def.globalName];

            try {
                const raw = await withTimeout(ctor.availability(), AVAILABILITY_TIMEOUT_MS);
                setStatus(def.key, { phase: normalizeAvailability(raw) });
            } catch (err) {
                if (err?.message === 'availability-timeout') {
                    // Global exists but never answered: flag is almost certainly off.
                    setStatus(def.key, { phase: 'flag-disabled' });
                } else {
                    setStatus(def.key, { phase: 'unavailable' });
                }
                return;
            }

            // Probe multimodal input support in parallel. Each capability is
            // independent, and unsupported ones throw NotSupportedError.
            const probe = async (modality) => {
                try {
                    const raw = await withTimeout(
                        ctor.availability(MODALITY_PROBE_OPTIONS[modality]),
                        AVAILABILITY_TIMEOUT_MS
                    );
                    return normalizeAvailability(raw);
                } catch {
                    return 'unavailable';
                }
            };

            const [imagePhase, audioPhase] = await Promise.all([probe('image'), probe('audio')]);
            setStatus(def.key, { modalities: { image: imagePhase, audio: audioPhase } });
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

        // Declare every modality this build can support so a single download
        // enables text, image and audio inputs together.
        const mods = statuses[key]?.modalities || {};
        const expectedInputs = [{ type: 'text', languages: ['en'] }];
        if (mods.image && mods.image !== 'unavailable') expectedInputs.push({ type: 'image' });
        if (mods.audio && mods.audio !== 'unavailable') expectedInputs.push({ type: 'audio' });

        setStatus(key, { phase: 'downloading', progress: 0, error: undefined });
        try {
            const instance = await ctor.create({
                expectedInputs,
                expectedOutputs: [{ type: 'text', languages: ['en'] }],
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        const pct = Math.max(0, Math.min(100, Math.round((e.loaded ?? 0) * 100)));
                        setStatus(key, { phase: 'downloading', progress: pct });
                    });
                },
            });
            instance?.destroy?.();
            setStatus(key, { phase: 'available', progress: undefined });
            checkAll(); // refresh modality states after the download completes
        } catch (err) {
            setStatus(key, { phase: 'error', progress: undefined, error: err?.message || 'Download failed.' });
        }
    }, [setStatus, statuses, checkAll]);

    // Selector-ready view of the Prompt API for chat. The modality string
    // reflects the input types that are actually ready on this device, and
    // drives the capability badges in the model selector.
    const chatModels = useMemo(() => {
        const phase = statuses.prompt?.phase || 'checking';
        const mods = statuses.prompt?.modalities || {};
        const imageReady = mods.image === 'available';
        const audioReady = mods.audio === 'available';
        const inputs = ['text'];
        if (imageReady) inputs.push('image');
        if (audioReady) inputs.push('audio');
        return [{
            value: 'chrome:localai',
            label: 'Browser Local AI',
            category: 'local',
            modality: `${inputs.join('+')}->text`,
            description: 'Chrome built-in',
            chrome: true,
            status: phase,
            selectable: phase === 'available',
            supportsImageInput: imageReady,
            supportsAudioInput: audioReady,
        }];
    }, [statuses.prompt]);

    // On-device audio transcription, exposed as audio models so it appears
    // next to Whisper / Saaras in the audio model list. Only listed when the
    // audio input capability is actually ready on this device.
    const audioModels = useMemo(() => {
        const phase = statuses.prompt?.phase;
        const audioPhase = statuses.prompt?.modalities?.audio;
        if (phase !== 'available' || audioPhase !== 'available') return [];
        const base = {
            category: 'audio',
            modality: 'audio->text',
            description: 'Chrome built-in',
            chrome: true,
            status: 'available',
            selectable: true,
        };
        return [
            { ...base, value: 'chrome:localai-transcribe', label: 'Browser Local AI (On-device)' },
            { ...base, value: 'chrome:localai-transcribe|translate', label: 'Browser Local AI (Translate to EN)' },
        ];
    }, [statuses.prompt]);

    return {
        defs: API_DEFS,
        statuses,
        support: getChromeAISupport(),
        chatModels,
        audioModels,
        checkAll,
        enableApi,
    };
};