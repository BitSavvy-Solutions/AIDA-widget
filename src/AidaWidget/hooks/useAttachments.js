/* src/AidaWidget/hooks/useAttachments.js */
import { useState, useCallback } from 'react';

/**
 * Hook to manage all types of attachments (images, text files, URLs)
 * @param {Function} setSelectedModel - Function to update AI model selection
 * @returns {object} Attachment state and handlers
 */
export const useAttachments = (setSelectedModel) => {
    const [attachments, setAttachments] = useState([]);
    const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

    const readAsDataURL = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const readAsText = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });

    const estimateBytes = (dataUrl) => {
        const base64 = String(dataUrl || '').split(',')[1] || '';
        return Math.ceil(base64.length * 0.75);
    };

    const compressDataURL = async (dataUrl, { maxDim = 1280, quality = 0.85, minQuality = 0.5, targetMaxBytes = 3 * 1024 * 1024 }) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = dataUrl;
        });

        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        let q = quality;
        let out = canvas.toDataURL('image/jpeg', q);
        while (estimateBytes(out) > targetMaxBytes && q > minQuality) {
            q = Math.max(minQuality, q - 0.1);
            out = canvas.toDataURL('image/jpeg', q);
        }
        return out;
    };

    const addImageAttachments = useCallback(async (files) => {
        if (!files || files.length === 0) return;

        try {
            const results = [];
            for (const file of Array.from(files)) {
                const original = await readAsDataURL(file);
                const shouldCompress = file.size > 1 * 1024 * 1024 || !file.type.includes('jpeg');
                const processed = shouldCompress ? await compressDataURL(original, {}) : original;

                const bytes = estimateBytes(processed);
                if (bytes > 5 * 1024 * 1024) {
                    alert(`Image "${file.name}" is too large after compression.`);
                    continue;
                }
                results.push({
                    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    type: 'image',
                    src: processed,
                    name: file.name,
                    size: bytes
                });
            }

            if (results.length > 0) {
                setAttachments(prev => [...prev, ...results]);
                const visionlessModels = new Set(['deepseek/deepseek-r1', 'deepseek/deepseek-chat-v3.1']);
                setSelectedModel(prevModel => visionlessModels.has(prevModel) ? 'google/gemini-2.5-flash' : prevModel);
            }
        } catch (e) {
            console.error('Failed to process image(s)', e);
        }
    }, [setSelectedModel]);

    const addTextAttachment = useCallback(async (file) => {
        try {
            const content = await readAsText(file);
            const newAttachment = {
                id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: 'text',
                content,
                name: file.name,
                size: file.size
            };
            setAttachments(prev => [...prev, newAttachment]);
        } catch (e) {
            console.error('Failed to read text file', e);
            alert('Failed to read text file. Please try again.');
        }
    }, []);

    const addUrlAttachment = useCallback(async (url) => {
        const trimmed = url.trim();
        if (!trimmed) return;

        try {
            new URL(trimmed);
        } catch {
            alert('Please enter a valid URL');
            return;
        }

        const newAttachment = {
            id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'url',
            url: trimmed,
            name: trimmed
        };
        setAttachments(prev => [...prev, newAttachment]);
    }, []);

    const removeAttachment = useCallback((id) => {
        setAttachments(prev => prev.filter(att => att.id !== id));
    }, []);

    const clearAttachments = useCallback(() => {
        setAttachments([]);
    }, []);

    const openModal = useCallback(() => setIsAttachmentModalOpen(true), []);
    const closeModal = useCallback(() => setIsAttachmentModalOpen(false), []);

    return {
        attachments,
        addImageAttachments,
        addTextAttachment,
        addUrlAttachment,
        removeAttachment,
        clearAttachments,
        isAttachmentModalOpen,
        openModal,
        closeModal
    };
};