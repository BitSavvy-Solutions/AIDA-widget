/* src/AidaWidget/utils/reasoning.js */

// Known efforts, lowest to highest; used to order whatever a model reports
export const REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

// Offered when a model supports reasoning but does not list its efforts
const UNLISTED_EFFORTS = ['low', 'medium', 'high'];

/**
 * Effort options to offer for a model's reasoning metadata (from /models).
 * Empty when the model does not support reasoning.
 */
export const getSupportedEfforts = (reasoning) => {
    if (!reasoning) return [];
    const listed = Array.isArray(reasoning.supported_efforts) && reasoning.supported_efforts.length > 0
        ? reasoning.supported_efforts
        : UNLISTED_EFFORTS;
    const known = REASONING_EFFORTS.filter((effort) => (
        effort === 'none' ? !reasoning.mandatory : listed.includes(effort)
    ));
    // Keep any effort the server reports that we don't know about yet
    const unknown = listed.filter((effort) => !REASONING_EFFORTS.includes(effort));
    return [...known, ...unknown];
};

/** The model's own default effort, or null when it does not report a usable one. */
export const getDefaultEffort = (reasoning) => {
    const supported = getSupportedEfforts(reasoning);
    return supported.includes(reasoning?.default_effort) ? reasoning.default_effort : null;
};

/**
 * The effort to actually use: the user's pick if the model offers it,
 * otherwise the model's default. Null means "leave it to the model".
 */
export const resolveEffort = (reasoning, preferred) => {
    const supported = getSupportedEfforts(reasoning);
    if (supported.length === 0) return null;
    if (preferred && supported.includes(preferred)) return preferred;
    const defaultEffort = getDefaultEffort(reasoning);
    if (defaultEffort || !preferred) return defaultEffort;
    // The pick isn't offered and the model has no default: use the closest offered effort
    const target = REASONING_EFFORTS.indexOf(preferred);
    const distance = (effort) => Math.abs(REASONING_EFFORTS.indexOf(effort) - target);
    return [...supported].sort((a, b) => distance(a) - distance(b))[0];
};

export const buildReasoningConfig = (effort) => (
    effort === 'none' ? { enabled: false } : { effort, enabled: true }
);
