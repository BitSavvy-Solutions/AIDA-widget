/* src/AidaWidget/utils/modelCapabilities.js */

/**
 * Central place for deciding which attachments a model can process.
 *
 * Capability tokens mirror the tokens used in model `modality` strings
 * ("text+image->text"), so tokens the backend starts reporting tomorrow
 * (audio, video, file, ...) flow through without changes here.
 */

/**
 * Maps each attachment type to the input capability it requires.
 * Types not listed (text, url) are inlined into the message body and only
 * need plain text input, which every usable model provides.
 * Register new attachment types here as they are introduced.
 */
export const ATTACHMENT_REQUIREMENTS = {
    image: 'image',
    pdf: 'file',
    audio: 'audio',
    video: 'video',
};

/** Parses "text+image->text" into { inputs, outputs } token arrays. */
export const parseModality = (modality) => {
    if (!modality || typeof modality !== 'string') return null;
    const [inputsRaw, outputsRaw] = modality.split('->');
    if (!inputsRaw) return null;
    const inputs = inputsRaw.split('+').map((t) => t.trim().toLowerCase()).filter(Boolean);
    const outputs = outputsRaw
        ? outputsRaw.split('+').map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];
    return { inputs, outputs };
};

const isLocalModelValue = (value) =>
    typeof value === 'string' && (value.startsWith('ollama:') || value.startsWith('chrome:'));

/**
 * Resolves the set of input capabilities a model supports.
 *
 * - Local models (Ollama, Browser Local AI) accept exactly what their
 *   modality advertises, and never generic files: their request builders
 *   inline text and images only, so PDFs would be silently dropped.
 * - Hosted models are authoritative on images via their modality string
 *   (images are forwarded raw as image_data_urls). PDFs keep flowing
 *   through the backend's pdf_attachments pipeline regardless of modality.
 * - Models without modality metadata stay permissive; the backend decides.
 *
 * If those policies change, adjust this one function. The send guard and
 * the mismatch dialog follow automatically.
 */
export const resolveInputCapabilities = (model) => {
    const value = typeof model === 'string' ? model : model?.value || '';
    const modality = typeof model === 'object' ? model.modality : null;
    const parsed = parseModality(modality);

    if (isLocalModelValue(value)) {
        const inputs = parsed?.inputs?.length ? parsed.inputs : ['text'];
        return new Set(inputs);
    }

    if (!parsed) {
        return new Set(['text', 'image', 'file']);
    }

    const caps = new Set(parsed.inputs);
    caps.add('text'); // a chat model always takes a text prompt
    caps.add('file'); // PDFs go through the backend pipeline
    return caps;
};

/** Types whose input requirement the model lacks, e.g. { 'image', 'pdf' }. */
export const getUnsupportedAttachmentTypes = (model) => {
    const caps = resolveInputCapabilities(model);
    const types = new Set();
    for (const [type, token] of Object.entries(ATTACHMENT_REQUIREMENTS)) {
        if (!caps.has(token)) types.add(type);
    }
    return types;
};

/**
 * Returns descriptors for tray attachments the model cannot process.
 * Shape: { id, type, name, source: 'current' } so the dialog and the
 * send flow can filter by id and label by source.
 */
export const findUnsupportedAttachments = (attachments, model) => {
    if (!attachments || attachments.length === 0) return [];
    const caps = resolveInputCapabilities(model);
    return attachments
        .filter((att) => {
            const requirement = ATTACHMENT_REQUIREMENTS[att?.type];
            return Boolean(requirement) && !caps.has(requirement);
        })
        .map((att) => ({ id: att.id, type: att.type, name: att.name || att.type, source: 'current' }));
};

/**
 * Scans conversation history for attachments the model cannot process.
 * Mirrors what buildMessageHistoryPayload actually serializes: images
 * come from message.images, PDFs from message.attachments. If a new
 * attachment type starts flowing into the payload, it is picked up here
 * automatically through ATTACHMENT_REQUIREMENTS.
 */
export const findUnsupportedAttachmentsInHistory = (history, model) => {
    const unsupportedTypes = getUnsupportedAttachmentTypes(model);
    if (unsupportedTypes.size === 0 || !history?.length) return [];

    const items = [];
    for (const message of history) {
        if (message?.sender !== 'user') continue;

        if (unsupportedTypes.has('image')) {
            for (const img of message.images || []) {
                items.push({
                    id: img?.id || `history-img-${items.length}`,
                    type: 'image',
                    name: img?.name || 'Image',
                    source: 'history',
                });
            }
        }

        const hasImagesArray = Array.isArray(message.images);
        for (const att of message.attachments || []) {
            // Images are counted via message.images; skip the duplicate
            // entries in attachments unless images were never split out.
            if (att?.type === 'image' && hasImagesArray) continue;
            if (unsupportedTypes.has(att?.type)) {
                items.push({ id: att?.id, type: att?.type, name: att?.name || att?.type, source: 'history' });
            }
        }
    }
    return items;
};