/* src/AidaWidget/OllamaModal.jsx */
import React, { useState, useEffect } from 'react';
import { HiXMark, HiArrowPath, HiOutlineCpuChip, HiExclamationTriangle } from 'react-icons/hi2';

const STATUS_META = {
    disconnected: { dot: 'bg-gray-500', label: 'Not connected', labelClass: 'text-gray-400' },
    connecting:   { dot: 'bg-amber-400 animate-pulse', label: 'Connecting', labelClass: 'text-amber-400' },
    connected:    { dot: 'bg-emerald-400', label: 'Connected', labelClass: 'text-emerald-400' },
    error:        { dot: 'bg-red-400', label: 'Connection failed', labelClass: 'text-red-400' },
};

const OllamaModal = ({
    isOpen,
    onClose,
    baseUrl,
    setBaseUrl,
    status,
    models,
    error,
    lastFetchedAt,
    onConnect,
    onDisconnect,
    onRefresh,
    theme = 'dark',
}) => {
    const [draftUrl, setDraftUrl] = useState(baseUrl);

    useEffect(() => {
        if (isOpen) setDraftUrl(baseUrl);
    }, [isOpen, baseUrl]);

    if (!isOpen) return null;

    const isDark = theme === 'dark';
    const meta = STATUS_META[status] || STATUS_META.disconnected;
    const isConnecting = status === 'connecting';
    const isConnected = status === 'connected';

    const cleanedDraft = (draftUrl || '').trim().replace(/\/+$/, '');
    const urlChanged = cleanedDraft !== baseUrl;

    const handleConnect = () => {
        if (!cleanedDraft || isConnecting) return;
        setBaseUrl(cleanedDraft);
        onConnect(cleanedDraft);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConnect();
        }
    };

    const lastFetchedLabel = lastFetchedAt
        ? new Date(lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : null;

    const primaryBtnClass = 'flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[92px]';
    const secondaryBtnClass = `flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
        isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-600'
    }`;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Ollama connection"
            // Keep the model selector underneath from closing while interacting here
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
                        <h3 className="text-sm font-semibold">Ollama · Local Models</h3>
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

                <div className="px-5 py-4 space-y-4">
                    {/* Status row */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                            <span className={`text-xs font-medium ${meta.labelClass}`}>{meta.label}</span>
                        </div>
                        {isConnected && (
                            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {models.length} model{models.length === 1 ? '' : 's'}
                                {lastFetchedLabel ? ` · ${lastFetchedLabel}` : ''}
                            </span>
                        )}
                    </div>

                    {/* Host input */}
                    <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Server address
                        </label>
                        <input
                            type="text"
                            value={draftUrl}
                            onChange={(e) => setDraftUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isConnecting}
                            placeholder="http://localhost:11434"
                            spellCheck={false}
                            autoComplete="off"
                            className={`w-full text-xs font-mono px-3 py-2.5 rounded-lg border outline-none transition-colors disabled:opacity-50 ${
                                isDark
                                    ? 'bg-gray-950 border-gray-700 text-gray-100 placeholder-gray-600 focus:border-teal-500/60'
                                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-teal-500'
                            }`}
                        />
                    </div>

                    {/* Error */}
                    {status === 'error' && error && (
                        <div className={`rounded-lg border p-3 text-xs leading-relaxed ${
                            isDark ? 'bg-red-500/5 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-600'
                        }`}>
                            <div className="flex items-start gap-2">
                                <HiExclamationTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="font-medium break-words">{error}</p>
                                    <p className="mt-1.5 opacity-70">
                                        If Ollama is running, allow browser access by starting it with{' '}
                                        <code className="font-mono">OLLAMA_ORIGINS=*</code>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Connected but empty */}
                    {isConnected && models.length === 0 && (
                        <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            No models installed yet. Pull one with{' '}
                            <code className="font-mono">ollama pull llama3.2</code>.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className={`flex items-center gap-2 px-5 py-3.5 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    {isConnected && (
                        <button
                            type="button"
                            onClick={onDisconnect}
                            className={`text-xs font-medium px-2 py-2 rounded-lg transition-colors ${
                                isDark ? 'text-red-400/90 hover:text-red-300 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                            }`}
                        >
                            Disconnect
                        </button>
                    )}
                    <div className="flex-1" />
                    {isConnected && !urlChanged && (
                        <button type="button" onClick={onRefresh} className={secondaryBtnClass}>
                            <HiArrowPath className="w-3.5 h-3.5" />
                            Refresh
                        </button>
                    )}
                    {isConnected && !urlChanged ? (
                        <button type="button" onClick={onClose} className={primaryBtnClass}>
                            Done
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleConnect}
                            disabled={isConnecting || !cleanedDraft}
                            className={primaryBtnClass}
                        >
                            {isConnecting && <HiArrowPath className="w-3.5 h-3.5 animate-spin" />}
                            {isConnecting ? 'Connecting' : isConnected ? 'Reconnect' : status === 'error' ? 'Retry' : 'Connect'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OllamaModal;