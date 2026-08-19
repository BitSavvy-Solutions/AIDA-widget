/* src/AidaWidget/localModels/LocalModelsModal.jsx */
import React from 'react';
import { HiXMark, HiOutlineCpuChip } from 'react-icons/hi2';
import { getChromeAISupport } from '../hooks';
import OllamaPanel, { OLLAMA_STATUS_DOT } from './OllamaPanel';
import ChromeAIPanel from './ChromeAIPanel';

/**
 * Shell for the Local Models feature. Owns only the dialog chrome (header,
 * tabs, backdrop) and delegates each provider to its panel. All state lives
 * in hooks above, so switching tabs never cancels an Ollama pull or loses
 * Chrome download progress.
 */
const LocalModelsModal = ({
    isOpen,
    onClose,
    theme = 'dark',
    activeTab = 'ollama',
    onTabChange,
    ollama,
    chromeAI,
}) => {
    if (!isOpen) return null;

    const isDark = theme === 'dark';
    const chromeSupported = getChromeAISupport().supported;
    const ollamaDot = OLLAMA_STATUS_DOT[ollama?.status] || 'bg-gray-500';

    const renderTab = (id, label, dotClass, badgeText) => {
        const active = activeTab === id;
        return (
            <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange?.(id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                    active
                        ? (isDark ? 'border-teal-500 text-teal-300 bg-gray-800/60' : 'border-teal-500 text-teal-600 bg-teal-50/60')
                        : (isDark ? 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/40' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50')
                }`}
            >
                {dotClass && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />}
                {label}
                {badgeText && (
                    <span className={`text-[9px] font-bold px-1 py-px rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                        {badgeText}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Local models"
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative z-10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${
                isDark ? 'bg-gray-900 border border-gray-700/80 text-gray-100' : 'bg-white border border-gray-200 text-gray-900'
            }`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                            <HiOutlineCpuChip className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold">Local Models</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                        aria-label="Close"
                    >
                        <HiXMark className="w-4 h-4" />
                    </button>
                </div>

                {/* Tab bar */}
                <div className={`flex gap-1 px-4 pt-2 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`} role="tablist">
                    {renderTab('ollama', 'Ollama', ollamaDot, null)}
                    {renderTab('chrome', 'Chromium', null, chromeSupported ? null : 'N/A')}
                </div>

                {/* Panels own their body and footer */}
                {activeTab === 'chrome'
                    ? <ChromeAIPanel chromeAI={chromeAI} theme={theme} onClose={onClose} />
                    : <OllamaPanel ollama={ollama} theme={theme} onClose={onClose} />}
            </div>
        </div>
    );
};

export default LocalModelsModal;