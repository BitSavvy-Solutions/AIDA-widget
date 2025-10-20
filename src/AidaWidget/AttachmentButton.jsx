/* src/AidaWidget/AttachmentButton.jsx */
import React from 'react';
import { HiPaperClip } from 'react-icons/hi2';

const AttachmentButton = ({ count = 0, onClick, disabled = false, theme = 'dark' }) => {
    const buttonClasses = theme === 'dark' 
        ? 'bg-gray-700 hover:bg-gray-600' 
        : 'bg-gray-900 hover:bg-gray-700';

    const badgeClasses = theme === 'dark'
        ? 'bg-blue-500 text-white'
        : 'bg-blue-600 text-white';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`relative ml-2 p-2 rounded-full text-white transition-opacity disabled:opacity-50 ${buttonClasses}`}
            aria-label="Manage attachments"
            title="Attachments"
        >
            <HiPaperClip className="w-5 h-5" />
            {count > 0 && (
                <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full ${badgeClasses} px-1`}>
                    {count}
                </span>
            )}
        </button>
    );
};

export default AttachmentButton;