/* src/AidaWidget/AttachmentModal.jsx */
import React, { useRef, useState } from 'react';
import { HiXMark, HiPhoto, HiDocumentText, HiGlobeAlt, HiArrowPath, HiOutlineFolder, HiOutlineComputerDesktop } from 'react-icons/hi2';
import AttachmentItem from './AttachmentItem';
import AttachmentPreview from './AttachmentPreview';

const AttachmentModal = ({
    isOpen,
    onClose,
    attachments,
    onAddImages,
    onAddText,
    onAddFolder,
    onAddUrl,
    onReadPage,
    isReadingPage,
    onRemove,
    onClearAll,
    onImagePreview,
    theme = 'dark',
    isReadOnly = false
}) => {
    const imageInputRef = useRef(null);
    const textInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const [urlInput, setUrlInput] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [previewingAttachment, setPreviewingAttachment] = useState(null);

    // A derived state to check if any URL is currently being scraped.
    const isScraping = attachments.some(att => att.status === 'scraping');

    if (!isOpen) return null;

    const handleAddUrl = () => {
        // Prevent adding new URL while one is already scraping.
        if (urlInput.trim() && !isScraping) {
            onAddUrl(urlInput);
            setUrlInput('');
        }
    };

    const handlePreview = (attachment) => {
        if (attachment.type === 'image') {
            if (onImagePreview) onImagePreview(attachment);
        } else if (attachment.type === 'text') {
            setPreviewingAttachment(attachment);
        }
    };

    const filteredAttachments = activeTab === 'all'
        ? attachments
        : attachments.filter(att => {
            if (activeTab === 'images') return att.type === 'image';
            if (activeTab === 'text') return att.type === 'text';
            // Also show scraped URLs in the 'text' tab after success
            if (activeTab === 'urls') return att.type === 'url';
            return true;
        });

    const isDark = theme === 'dark';
    const surfaceClasses = isDark ? 'bg-gray-900 text-gray-100 border border-gray-800' : 'bg-white text-gray-900 border border-gray-200';
    const borderClasses = isDark ? 'border-gray-800' : 'border-gray-200';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className={`relative z-10 w-11/12 max-w-lg ${surfaceClasses} rounded-xl shadow-2xl flex flex-col max-h-[80vh]`}>

                {previewingAttachment ? (
                    <AttachmentPreview
                        attachment={previewingAttachment}
                        onBack={() => setPreviewingAttachment(null)}
                        theme={theme}
                    />
                ) : (
                    <>
                        <div className={`flex items-center justify-between p-4 border-b ${borderClasses}`}>
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold">Attachments ({attachments.length})</h2>
                                {attachments.length > 0 && onClearAll && !isReadOnly && (
                                    <button
                                        type="button"
                                        onClick={onClearAll}
                                        className={`text-sm font-medium transition-colors ${isDark
                                                ? 'text-red-400/90 hover:text-red-400'
                                                : 'text-red-600 hover:text-red-700'
                                            }`}
                                        title="Clear all attachments"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            <button type="button" onClick={onClose} className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`} aria-label="Close">
                                <HiXMark className="w-5 h-5" />
                            </button>
                        </div>
                        <div className={`flex gap-1 px-4 pt-3 border-b ${borderClasses}`}>
                            {['all', 'images', 'text', 'urls'].map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab
                                            ? (isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900')
                                            : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
                                        }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px] max-h-[400px] custom-scrollbar">
                            {filteredAttachments.length === 0 ? (
                                <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <p>No attachments yet</p>
                                    <p className="text-sm mt-1">Add images, text files, or URLs below</p>
                                </div>
                            ) : (
                                filteredAttachments.map(attachment => (
                                    <AttachmentItem
                                        key={attachment.id}
                                        attachment={attachment}
                                        onRemove={onRemove} // ✅ MODIFIED: Pass onRemove directly. The parent now controls if removal is possible.
                                        onPreview={handlePreview}
                                        theme={theme}
                                    />
                                ))
                            )}
                        </div>

                        {!isReadOnly && (
                            <div className={`p-4 border-t space-y-3 ${borderClasses}`}>

                                {/* Hidden file inputs */}
                                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) onAddImages(files); e.target.value = ''; }} />
                                <input ref={textInputRef} type="file" accept="text/*,.md,.json,.yml,.yaml,.ini,.log,.env,.py,.js,.jsx,.ts,.tsx,.html,.css,.scss,.sh,.bat,.ps1,.xml,.csv,.java,.c,.cpp,.h,.cs,.go,.rb,.php,.sql" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onAddText(file); e.target.value = ''; }} />

                                <input
                                    ref={folderInputRef}
                                    type="file"
                                    webkitdirectory=""
                                    directory=""
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length > 0) {
                                            const filesWithPaths = files.map(file => ({
                                                file: file,
                                                path: file.webkitRelativePath,
                                            }));
                                            onAddFolder(filesWithPaths);
                                        }
                                        e.target.value = ''; // Clear input for re-selection
                                    }}
                                />

                                {/* Action buttons */}
                                <div className="grid grid-cols-3 gap-3">
                                    <button type="button" onClick={() => imageInputRef.current?.click()} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg border transition-colors ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`} title="Add Images">
                                        <HiPhoto className="w-6 h-6" />
                                        <span className="text-xs font-medium">Images</span>
                                    </button>
                                    <button type="button" onClick={() => textInputRef.current?.click()} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg border transition-colors ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`} title="Add Text File">
                                        <HiDocumentText className="w-6 h-6" />
                                        <span className="text-xs font-medium">Text File</span>
                                    </button>
                                    <button type="button" onClick={() => folderInputRef.current?.click()} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg border transition-colors ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`} title="Add Folder">
                                        <HiOutlineFolder className="w-6 h-6" />
                                        <span className="text-xs font-medium">Folder</span>
                                    </button>

                                    {onReadPage && (
                                        <button
                                            type="button"
                                            onClick={onReadPage}
                                            disabled={isReadingPage}
                                            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-wait ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                                            title="Read Current Page"
                                        >
                                            {isReadingPage ? <HiArrowPath className="w-6 h-6 animate-spin" /> : <HiOutlineComputerDesktop className="w-6 h-6" />}
                                            <span className="text-xs font-medium">Read Page</span>
                                        </button>
                                    )}
                                </div>

                                {/* URL input */}
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {isScraping
                                            ? <HiArrowPath className={`w-5 h-5 animate-spin ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                            : <HiGlobeAlt className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                        }
                                    </span>

                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                                        placeholder="Paste URL to read a webpage"
                                        disabled={isScraping}
                                        className={`w-full text-sm pl-10 pr-20 py-2.5 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed`}
                                    />

                                    <button
                                        type="button"
                                        onClick={handleAddUrl}
                                        disabled={!urlInput.trim() || isScraping}
                                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-wait ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-600/50' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-600/50'}`}
                                    >
                                        {isScraping ? "Reading..." : "Read"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AttachmentModal;