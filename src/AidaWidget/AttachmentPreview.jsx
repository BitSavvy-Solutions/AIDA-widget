/* src/AidaWidget/AttachmentPreview.jsx */
import React from 'react';
import { HiArrowLeft } from 'react-icons/hi2';

const AttachmentPreview = ({ attachment, onBack, theme = 'dark' }) => {
    if (!attachment) return null;

    // This component is now more generic and can preview any string content,
    // but the check remains for logical consistency.
    if (attachment.type !== 'text') {
        console.warn('AttachmentPreview is designed for text files.');
        onBack();
        return null;
    }

    const isDark = theme === 'dark';

    return (
        <div className="flex flex-col h-full w-full min-h-0">
            <div className={`flex items-center gap-4 p-4 border-b shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <button
                    type="button"
                    onClick={onBack}
                    className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
                    aria-label="Back to attachments"
                >
                    <HiArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                     <h2 className="text-lg font-semibold truncate" title={attachment.name}>
                        {attachment.name}
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Text File Preview
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <pre className="p-4 text-sm whitespace-pre-wrap break-words">
                    {String(attachment.content || '')}
                </pre>
            </div>
        </div>
    );
};

export default AttachmentPreview;