import { useState, useCallback, useEffect } from 'react';

// Helper: read a file and return it as a Data URL.
const readAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

// Helper: compress an image Data URL to a reasonable size.
const compressImageDataURL = async (dataUrl) => {
    const maxDim = 1280;
    const quality = 0.85;

    const img = new Image();
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
    });

    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    
    return canvas.toDataURL('image/jpeg', quality);
};

/**
 * Manages pending attachments (images, etc.), including file processing and previewing.
 * @param {Function} setSelectedModel - a setter to change the AI model if a vision model is needed.
 * @returns An object with attachment state and handler functions.
 */
export const useAttachments = (setSelectedModel) => {
    const [pendingImages, setPendingImages] = useState([]);
    
    const handleImagesSelected = useCallback(async (files) => {
        if (!files || files.length === 0) return;

        const results = [];
        for (const file of Array.from(files)) {
            try {
                const originalDataUrl = await readAsDataURL(file);
                const shouldCompress = file.size > 1 * 1024 * 1024 || !file.type.includes('jpeg');
                const processedDataUrl = shouldCompress ? await compressImageDataURL(originalDataUrl) : originalDataUrl;

                results.push({
                    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    src: processedDataUrl,
                    name: file.name,
                    type: file.type,
                });
            } catch (error) {
                console.error(`Failed to process image ${file.name}:`, error);
                alert(`There was an error processing the image: ${file.name}`);
            }
        }

        if (results.length > 0) {
            setPendingImages(prev => [...prev.slice(0, 5), ...results].slice(0, 5)); // Limit to 5 images
            
            // Auto-switch to a vision model if a non-vision one is selected
            const visionlessModels = new Set(['deepseek/deepseek-r1', 'deepseek/deepseek-chat-v3.1']);
            setSelectedModel(prevModel => {
                if (visionlessModels.has(prevModel)) {
                    return 'google/gemini-2.5-flash'; // Default vision model
                }
                return prevModel;
            });
        }
    }, [setSelectedModel]);

    const removePendingImage = useCallback((id) => {
        setPendingImages(prev => prev.filter(img => img.id !== id));
    }, []);

    const clearPendingImages = useCallback(() => {
        setPendingImages([]);
    }, []);

    return {
        pendingImages,
        handleImagesSelected,
        removePendingImage,
        clearPendingImages,
    };
};