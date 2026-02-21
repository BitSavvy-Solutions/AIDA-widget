/* src/AidaWidget/ErrorModal.jsx */
import React from 'react';
import { HiExclamationTriangle, HiXMark } from 'react-icons/hi2';

const ErrorModal = ({ isOpen, onClose, error, userEmail, theme = 'dark' }) => {
    if (!isOpen || !error) return null;

    const isDark = theme === 'dark';
    
    // Construct feedback URL
    const feedbackUrl = `https://feedback.iverse.space/?source=aida&user=${encodeURIComponent(userEmail || 'anonymous')}`;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div className={`relative z-10 w-full max-w-md rounded-xl shadow-2xl transform transition-all scale-100 ${
                isDark 
                    ? 'bg-gray-900 border border-gray-700 text-gray-100' 
                    : 'bg-white border border-gray-200 text-gray-900'
            }`}>
                {/* Header */}
                <div className={`flex items-center gap-3 p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className={`p-2 rounded-full ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}>
                        <HiExclamationTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold">Error</h3>
                    <button 
                        onClick={onClose}
                        className={`ml-auto p-1 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                        }`}
                    >
                        <HiXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {error.message || "An unexpected error occurred."}
                    </p>
                    {error.status && (
                        <p className="mt-2 text-xs font-mono opacity-50">
                            Status Code: {error.status}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-end gap-3 p-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <a 
                        href={feedbackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                            isDark 
                                ? 'border-gray-700 hover:bg-gray-800 text-gray-300' 
                                : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                    >
                        Raise Feedback
                    </a>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-sm"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorModal;