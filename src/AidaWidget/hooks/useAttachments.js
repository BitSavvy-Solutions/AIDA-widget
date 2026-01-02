/* src/AidaWidget/hooks/useAttachments.js */
import { useState, useCallback } from 'react';
import { SCRAPE_URL } from '../utils/apiConfig';

const TEXT_MIME_TYPES = /^text\//;
// From AttachmentModal's file input `accept` attribute
const TEXT_EXTS = new Set([
    '.md', '.json', '.yml', '.yaml', '.ini', '.log', '.env', '.py', '.js', '.jsx',
    '.ts', '.tsx', '.html', '.css', '.scss', '.sh', '.bat', '.ps1', '.xml', '.csv',
    '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rb', '.php', '.sql', '.txt'
]);

const isKnownTextFile = (file) => {
    if (!file || !file.name) return false;
    if (TEXT_MIME_TYPES.test(file.type)) return true;
    const extensionIndex = file.name.lastIndexOf('.');
    if (extensionIndex === -1) return false;
    const extension = file.name.slice(extensionIndex).toLowerCase();
    return TEXT_EXTS.has(extension);
};

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
                const visionlessModels = new Set([
                    'deepseek/deepseek-r1',
                    'deepseek/deepseek-v3.2',
                    'deepseek/deepseek-chat-v3-0324',
                ]);
                setSelectedModel(prevModel => visionlessModels.has(prevModel) ? 'google/gemini-3-flash-preview' : prevModel);
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

    // ✅ MODIFIED: Accepts an array of `{file, path}` objects.
    const addFolderAttachments = useCallback(async (filesWithPaths) => {
        if (!filesWithPaths || filesWithPaths.length === 0) return;

        try {
            const promises = filesWithPaths.map(async (item) => {
                try {
                    // Expect `item` to be `{ file: File, path: string }`
                    const content = await readAsText(item.file);
                    return {
                        id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        type: 'text',
                        content,
                        name: item.path, // Use the full path for the name
                        size: item.file.size,
                    };
                } catch (readError) {
                    console.warn(`Could not read file: ${item.path}`, readError);
                    return null;
                }
            });

            const newAttachments = (await Promise.all(promises)).filter(Boolean);

            if (newAttachments.length > 0) {
                setAttachments(prev => [...prev, ...newAttachments]);
            }
            // Optional: You might want to remove this alert if it becomes noisy.
            if (newAttachments.length === 0 && filesWithPaths.length > 0) {
                alert('No supported text files found in the selected folder.');
            }
        } catch (error) {
            console.error('Failed to process folder', error);
            alert('An error occurred while processing the folder.');
        }
    }, []);


    const addUrlAttachment = useCallback(async (url) => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) return;

        try {
            new URL(trimmedUrl);
        } catch {
            alert('Please enter a valid URL');
            return;
        }

        const tempId = `scrape-${Date.now()}`;
        const placeholder = {
            id: tempId,
            type: 'url',
            url: trimmedUrl,
            name: trimmedUrl,
            status: 'scraping',
        };
        setAttachments(prev => [...prev, placeholder]);

        try {
            const response = await fetch(SCRAPE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: trimmedUrl, include_metadata: false }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }

            const responseBody = await response.json();
            let actualData;

            if (responseBody && typeof responseBody._HttpResponse__body === 'string') {
                try {
                    actualData = JSON.parse(responseBody._HttpResponse__body);
                } catch (e) {
                    throw new Error("Failed to parse nested JSON from response body.");
                }
            } else {
                actualData = responseBody;
            }

            const markdownContent = actualData.content || '';

            const finalAttachment = {
                id: tempId,
                type: 'text',
                content: markdownContent,
                name: trimmedUrl,
                size: new Blob([markdownContent]).size,
                status: 'success',
            };

            setAttachments(prev => prev.map(att => att.id === tempId ? finalAttachment : att));

        } catch (error) {
            console.error('Failed to scrape URL:', error);
            const errorAttachment = {
                ...placeholder,
                status: 'error',
                error: error.message || 'Scraping failed',
            };
            setAttachments(prev => prev.map(att => att.id === tempId ? errorAttachment : att));
        }
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
        setAttachments, // ✅ ADDED: Expose setter for editing functionality
        addImageAttachments,
        addTextAttachment,
        addFolderAttachments,
        addUrlAttachment,
        removeAttachment,
        clearAttachments,
        isAttachmentModalOpen,
        openModal,
        closeModal
    };
};