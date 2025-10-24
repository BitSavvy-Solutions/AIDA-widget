/* src/AidaWidget/AttachmentItem.jsx */
import React from 'react';
import { HiXMark, HiDocumentText, HiPhoto, HiGlobeAlt, HiArrowPath, HiExclamationCircle } from 'react-icons/hi2';

const AttachmentItem = ({ attachment, onRemove, onPreview, theme = 'dark' }) => {
    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    const renderIcon = () => {
        // ✅ ADDED: Handle scraping and error states
        if (attachment.status === 'scraping') {
            return <HiArrowPath className="w-5 h-5 text-blue-400 animate-spin" />;
        }
        if (attachment.status === 'error') {
            return <HiExclamationCircle className="w-5 h-5 text-red-400" />;
        }

        switch (attachment.type) {
            case 'image':
                return <HiPhoto className="w-5 h-5 text-blue-400" />;
            case 'text':
                return <HiDocumentText className="w-5 h-5 text-green-400" />;
            case 'url':
                 // This case should now only be hit for a brief moment
                return <HiGlobeAlt className="w-5 h-5 text-purple-400" />;
            default:
                return <HiDocumentText className="w-5 h-5 text-gray-400" />;
        }
    };

    const renderPreview = () => {
        const isActionable = attachment.type === 'image' || attachment.type === 'text';

        if (isActionable) {
            return (
                <button
                    type="button"
                    onClick={() => onPreview && onPreview(attachment)}
                    className="w-12 h-12 rounded flex items-center justify-center hover:opacity-80 transition-opacity"
                    title={attachment.type === 'image' ? "Preview image" : "Preview text"}
                >
                    {attachment.type === 'image' ? (
                        <img src={attachment.src} alt={attachment.name} className="w-full h-full object-cover rounded border border-gray-300 dark:border-gray-700" />
                    ) : (
                         <div className={`w-12 h-12 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            {renderIcon()}
                        </div>
                    )}
                </button>
            );
        }

        // Render non-clickable preview for loading/error states
        return (
            <div className={`w-12 h-12 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {renderIcon()}
            </div>
        );
    };

    return (
        <div className={`flex items-center gap-3 p-2 rounded-lg border ${
            theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-gray-50 border-gray-200'
        }`}>
            {renderPreview()}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={attachment.name}>
                    {attachment.name}
                </p>
                {/* ✅ ADDED: Display status text for scraping/error */}
                {attachment.status === 'scraping' && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>Scraping...</p>
                )}
                {attachment.status === 'error' && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`} title={attachment.error}>
                        Error: {attachment.error}
                    </p>
                )}
                {attachment.status !== 'scraping' && attachment.status !== 'error' && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {attachment.type === 'image' && formatSize(attachment.size)}
                        {attachment.type === 'text' && `Scraped page, ${formatSize(attachment.size)}`}
                    </p>
                )}
            </div>
            {/* ✅ MODIFIED: Only show remove button if onRemove is provided */}
            {onRemove && (
                <button
                    type="button"
                    onClick={() => onRemove(attachment.id)}
                    className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                    aria-label="Remove attachment"
                >
                    <HiXMark className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default AttachmentItem;