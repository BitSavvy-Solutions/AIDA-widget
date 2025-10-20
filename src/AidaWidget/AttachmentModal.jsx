/* src/AidaWidget/AttachmentModal.jsx */
import React, { useRef, useState } from 'react';
import { HiXMark, HiPhoto, HiDocumentText, HiGlobeAlt } from 'react-icons/hi2';
import AttachmentItem from './AttachmentItem';
import AttachmentPreview from './AttachmentPreview';

const AttachmentModal = ({
    isOpen,
    onClose,
    attachments,
    onAddImages,
    onAddText,
    onAddUrl,
    onRemove,
    onImagePreview,
    theme = 'dark'
}) => {
    const imageInputRef = useRef(null);
    const textInputRef = useRef(null);
    const [urlInput, setUrlInput] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [previewingAttachment, setPreviewingAttachment] = useState(null);

    if (!isOpen) return null;

    const handleAddUrl = () => {
        if (urlInput.trim()) {
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
                            <h2 className="text-lg font-semibold">Attachments ({attachments.length})</h2>
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
                                    className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                                        activeTab === tab
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
                                        onRemove={onRemove}
                                        onPreview={handlePreview}
                                        theme={theme}
                                    />
                                ))
                            )}
                        </div>
                        <div className={`p-4 border-t space-y-3 ${borderClasses}`}>
                            <div className="flex items-center gap-2">
                                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) onAddImages(files); e.target.value = ''; }}/>
                                <button type="button" onClick={() => imageInputRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                                    <HiPhoto className="w-5 h-5" />
                                    <span className="text-sm font-medium">Add Images</span>
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <input ref={textInputRef} type="file" accept=".txt,.md,.json,.xml,.csv,.js,.jsx,.py" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onAddText(file); e.target.value = ''; }}/>
                                <button type="button" onClick={() => textInputRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                                    <HiDocumentText className="w-5 h-5" />
                                    <span className="text-sm font-medium">Add Text File</span>
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }} placeholder="https://example.com" className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500`}/>
                                <button type="button" onClick={handleAddUrl} disabled={!urlInput.trim()} className={`px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                                    <HiGlobeAlt className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AttachmentModal;