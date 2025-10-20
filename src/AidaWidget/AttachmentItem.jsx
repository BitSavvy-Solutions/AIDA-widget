/* src/AidaWidget/AttachmentItem.jsx */
import React from 'react';
import { HiXMark, HiDocumentText, HiPhoto, HiGlobeAlt } from 'react-icons/hi2';

const AttachmentItem = ({ attachment, onRemove, onPreview, theme = 'dark' }) => {
    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    const renderIcon = () => {
        switch (attachment.type) {
            case 'image':
                return <HiPhoto className="w-5 h-5 text-blue-400" />;
            case 'text':
                return <HiDocumentText className="w-5 h-5 text-green-400" />;
            case 'url':
                return <HiGlobeAlt className="w-5 h-5 text-purple-400" />;
            default:
                return <HiDocumentText className="w-5 h-5 text-gray-400" />;
        }
    };

    const renderPreview = () => {
        if (attachment.type === 'image') {
            return (
                <button
                    type="button"
                    onClick={() => onPreview && onPreview(attachment)}
                    className="w-12 h-12 rounded overflow-hidden border border-gray-300 dark:border-gray-700 hover:opacity-80 transition-opacity"
                    title="Preview image"
                >
                    <img
                        src={attachment.src}
                        alt={attachment.name}
                        className="w-full h-full object-cover"
                    />
                </button>
            );
        }
        
        if (attachment.type === 'text') {
            return (
                <button
                    type="button"
                    onClick={() => onPreview && onPreview(attachment)}
                    className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Preview text file"
                >
                    {renderIcon()}
                </button>
            );
        }

        return (
            <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
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
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {attachment.type === 'image' && formatSize(attachment.size)}
                    {attachment.type === 'text' && formatSize(attachment.size)}
                    {attachment.type === 'url' && 'Web URL'}
                </p>
            </div>
            <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                aria-label="Remove attachment"
            >
                <HiXMark className="w-4 h-4" />
            </button>
        </div>
    );
};

export default AttachmentItem;