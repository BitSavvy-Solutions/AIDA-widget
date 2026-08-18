/* src/AidaWidget/hooks/useChromeAI.js */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Chrome Built-in AI (Gemini Nano + expert models).
 *
 * Single source of truth for support, availability and download progress.
 * Lives at the widget level so the model selector, the chat pipeline and the
 * management panel all read the same state. Availability sweeps are cheap
 * (one parallel batch per activation) and sessions are destroyed immediately
 * after enable/test so no memory is held.
 */

const TRANSLATOR_TARGETS = [
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'hi', label: 'Hindi' },
    { code: 'zh', label: 'Chinese' },
];

// Summarizer gets outputLanguage to avoid Chrome's "No output language" warning.
const API_DEFS = [
    {
        key: 'prompt',
        label: 'Prompt API',
        globalName: 'LanguageModel',
        tagline: 'Gemini Nano · free-form prompts',
        availabilityOptions: () => ({}),
        createOptions: () => ({}),
        test: async (inst) => {
            const r = await inst.prompt('Reply with exactly: OK');
            return String(r || '').trim().slice(0, 80) || 'OK';
        },
    },
    {
        key: 'summarizer',
        label: 'Summarizer',
        globalName: 'Summarizer',
        tagline: 'Condense long text',
        availabilityOptions: () => ({ outputLanguage: 'en' }),
        createOptions: () => ({ outputLanguage: 'en' }),
        test: async (inst) => {
            const r = await inst.summarize('Chrome ships small on-device models. They run locally, work offline, and keep data private.');
            return String(r || '').trim().slice(0, 80) || 'OK';
        },
    },
    {
        key: 'translator',
        label: 'Translator',
        globalName: 'Translator',
        tagline: 'Per language-pair packs',
        availabilityOptions: (o) => ({ sourceLanguage: 'en', targetLanguage: o?.targetLanguage || 'es' }),
        createOptions: (o) => ({ sourceLanguage: 'en', targetLanguage: o?.targetLanguage || 'es' }),
        test: async (inst) => {
            const r = await inst.translate('Hello, how are you?');
            return String(r || '').trim().slice(0, 80) || 'OK';
        },
    },
    {
        key: 'detector',
        label: 'Language Detector',
        globalName: 'LanguageDetector',
        tagline: 'Identify text language',
        availabilityOptions: () => ({}),
        createOptions: () => ({}),
        test: async (inst) => {
            const r = await inst.detect('Bonjour tout le monde');
            return r?.[0] ? `${r[0].detectedLanguage} · ${Math.round(r[0].confidence * 100)}%` : 'No result';
        },
    },
    {
        key: 'writer',
        label: 'Writer',
        globalName: 'Writer',
        tagline: 'Generate new text',
        availabilityOptions: () => ({}),
        createOptions: () => ({}),
        test: async (inst) => {
            const r = await inst.write('One short cheerful greeting.');
            return String(r || '').trim().slice(0, 80) || 'OK';
        },
    },
    {
        key: 'rewriter',
        label: 'Rewriter',
        globalName: 'Rewriter',
        tagline: 'Restyle existing text',
        availabilityOptions: () => ({}),
        createOptions: () => ({}),
        test: async (inst) => {
            const r = await inst.rewrite('this text is kinda messy lol');
            return String(r || '').trim().slice(0, 80) || 'OK';
        },
    },
    {
        key: 'proofreader',
        label: 'Proofreader',
        globalName: 'Proofreader',
        tagline: 'Grammar and spelling',
        availabilityOptions: () => ({}),
        createOptions: () => ({}),
        test: async (inst) => {
            const r = await inst.proofread('This sentence is fine.');
            return typeof r === 'string' ? r.slice(0, 80) : 'OK';
        },
    },
];

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
    const [translatorTarget, setTranslatorTarget] = useState('es');
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
                const raw = await ctor.availability(
                    def.availabilityOptions({ targetLanguage: translatorTarget })
                );
                setStatus(def.key, { phase: normalizeAvailability(raw) });
            } catch (err) {
                // e.g. Translator pair not supported at all
                setStatus(def.key, { phase: 'unavailable' });
            }
        }));
    }, [translatorTarget, setStatus]);

    // One sweep per activation. Translator pair changes re-trigger a check
    // because checkAll depends on translatorTarget.
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
                ...def.createOptions({ targetLanguage: translatorTarget }),
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
    }, [translatorTarget, setStatus]);

    const testApi = useCallback(async (key) => {
        const def = API_DEFS.find(d => d.key === key);
        const ctor = def && window[def.globalName];
        if (!ctor) return;

        setStatus(key, { testing: true, testResult: undefined });
        try {
            const instance = await ctor.create(def.createOptions({ targetLanguage: translatorTarget }));
            const result = await def.test(instance);
            instance?.destroy?.();
            setStatus(key, { testing: false, testResult: result });
        } catch (err) {
            setStatus(key, { testing: false, testResult: `Failed: ${err?.message || err}` });
        }
    }, [translatorTarget, setStatus]);

    // Selector-ready view of the Prompt API. This is the only Chrome API that
    // makes sense as a chat model; the experts stay in the management panel.
    const chatModels = useMemo(() => {
        const phase = statuses.prompt?.phase || 'checking';
        return [{
            value: 'chrome:nano',
            label: 'Gemini Nano',
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
        translatorTarget,
        setTranslatorTarget,
        translatorTargets: TRANSLATOR_TARGETS,
        checkAll,
        enableApi,
        testApi,
    };
};