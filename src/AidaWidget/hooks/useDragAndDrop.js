/* src/AidaWidget/hooks/useDragAndDrop.js */
import { useState, useCallback, useRef } from 'react';

// --- File Handling Utilities ---
const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const TEXT_MIME_TYPES = /^text\//;
const TEXT_EXTS = new Set([
    '.md', '.json', '.yml', '.yaml', '.ini', '.log', '.env', '.py', '.js', '.jsx',
    '.ts', '.tsx', '.html', '.css', '.scss', '.sh', '.bat', '.ps1', '.xml', '.csv',
    '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rb', '.php', '.sql', '.txt'
]);

const isImageFile = (file) => file?.type.startsWith('image/') || (typeof file?.name === 'string' && IMAGE_FILE_PATTERN.test(file.name));

const isKnownTextFile = (file) => {
    if (!file || !file.name) return false;
    if (TEXT_MIME_TYPES.test(file.type)) return true;
    const extensionIndex = file.name.lastIndexOf('.');
    if (extensionIndex === -1) return false;
    const extension = file.name.slice(extensionIndex).toLowerCase();
    return TEXT_EXTS.has(extension);
};

const eventContainsFiles = (event) => {
    const dt = event?.dataTransfer;
    if (!dt?.items) return false;
    return Array.from(dt.items).some(item => item.kind === 'file');
};

/**
 * Recursively traverses a directory entry, returning a flat list of all files.
 * @param {FileSystemDirectoryEntry} entry The directory entry to read.
 * @returns {Promise<Array<{file: File, path: string}>>} A promise resolving to an array of custom file objects.
 */
const readDirectory = (entry) => {
    const directoryReader = entry.createReader();
    return new Promise((resolve, reject) => {
        const allEntries = [];
        const readEntries = () => {
            directoryReader.readEntries(async (entries) => {
                if (entries.length === 0) {
                    try {
                        const filePromises = allEntries.map((innerEntry) => {
                            if (innerEntry.isFile) {
                                return new Promise((fileResolve, fileReject) => {
                                    innerEntry.file(file => {
                                        // ✅ FIXED: Create a wrapper object instead of modifying the File prototype.
                                        const fileWithPath = {
                                            file: file,
                                            path: innerEntry.fullPath.startsWith('/')
                                                ? innerEntry.fullPath.substring(1)
                                                : innerEntry.fullPath,
                                        };
                                        fileResolve(fileWithPath);
                                    }, fileReject);
                                });
                            }
                            if (innerEntry.isDirectory) {
                                return readDirectory(innerEntry);
                            }
                            return Promise.resolve(null);
                        });
                        const files = (await Promise.all(filePromises)).flat().filter(Boolean);
                        resolve(files);
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    allEntries.push(...entries);
                    readEntries();
                }
            }, reject);
        };
        readEntries();
    });
};


/**
 * A hook to manage drag-and-drop functionality for file attachments.
 * @param {object} config - Configuration object.
 * @param {Function} config.addImageAttachments - Handler to add image files.
 * @param {Function} config.addTextAttachment - Handler to add a single text file.
 * @param {Function} config.addFolderAttachments - Handler to add multiple files from a folder structure.
 * @param {boolean} config.isEnabled - Feature flag to enable/disable the hook.
 * @returns {object} An object containing the drag state and props for the drop zone.
 */
export const useDragAndDrop = ({
    addImageAttachments,
    addTextAttachment,
    addFolderAttachments,
    isEnabled
}) => {
    const [isDragOverWidget, setIsDragOverWidget] = useState(false);
    const dragCounterRef = useRef(0);

    const onDragEnter = useCallback((e) => {
        if (isEnabled && eventContainsFiles(e)) {
            e.preventDefault();
            dragCounterRef.current++;
            setIsDragOverWidget(true);
        }
    }, [isEnabled]);

    const onDragOver = useCallback((e) => {
        if (isEnabled && eventContainsFiles(e)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    }, [isEnabled]);

    const onDragLeave = useCallback((e) => {
        if (isEnabled) {
            e.preventDefault();
            dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
            if (dragCounterRef.current === 0) {
                setIsDragOverWidget(false);
            }
        }
    }, [isEnabled]);

    const onDrop = useCallback(async (e) => {
        if (!isEnabled || !e.dataTransfer?.items) return;

        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDragOverWidget(false);

        const items = Array.from(e.dataTransfer.items);

        const processingPromises = items.map(item => {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                if (entry.isFile) {
                    return new Promise(res => entry.file(f => res(f), () => res(null)));
                }
                if (entry.isDirectory) {
                    return readDirectory(entry);
                }
            }
            return Promise.resolve(null);
        });

        try {
            const allFilesNested = await Promise.all(processingPromises);
            const allItems = allFilesNested.flat().filter(Boolean);

            const imageFiles = [];
            const textFilesFromFolders = [];
            const individualTextFiles = [];

            for (const item of allItems) {
                // Case 1: Item is a wrapper object from a directory scan
                if (item.file && item.path) {
                    if (isImageFile(item.file)) {
                        imageFiles.push(item.file);
                    } else if (isKnownTextFile(item.file)) {
                        textFilesFromFolders.push(item);
                    }
                } 
                // Case 2: Item is a standard File object from a single file drop
                else if (item instanceof File) {
                    if (isImageFile(item)) {
                        imageFiles.push(item);
                    } else if (isKnownTextFile(item)) {
                        individualTextFiles.push(item);
                    }
                }
            }

            if (imageFiles.length > 0) {
                addImageAttachments(imageFiles);
            }
            if (textFilesFromFolders.length > 0) {
                addFolderAttachments(textFilesFromFolders);
            }
            if (individualTextFiles.length > 0) {
                individualTextFiles.forEach(file => addTextAttachment(file));
            }
        } catch (error) {
            console.error("Error processing dropped files:", error);
            alert("An error occurred while trying to attach the dropped files. Please try again.");
        }
    }, [isEnabled, addImageAttachments, addTextAttachment, addFolderAttachments]);
    
    return {
        isDragOverWidget,
        dropZoneProps: {
            onDragEnter,
            onDragOver,
            onDragLeave,
            onDrop
        }
    };
};