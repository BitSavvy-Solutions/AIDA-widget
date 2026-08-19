/* src/AidaWidget/localModels/OllamaPanel.jsx */
import React, { useState, useEffect } from 'react';
import {
    HiXMark, HiArrowPath, HiExclamationTriangle,
    HiCheckCircle, HiOutlineArrowDownTray,
} from 'react-icons/hi2';
import { formatSize } from '../hooks/useOllama';

export const OLLAMA_STATUS_DOT = {
    disconnected: 'bg-gray-500',
    connecting: 'bg-amber-400 animate-pulse',
    connected: 'bg-emerald-400',
    error: 'bg-red-400',
};

const STATUS_META = {
    disconnected: { dot: OLLAMA_STATUS_DOT.disconnected, label: 'Not connected', labelClass: 'text-gray-400' },
    connecting:   { dot: OLLAMA_STATUS_DOT.connecting, label: 'Connecting', labelClass: 'text-amber-400' },
    connected:    { dot: OLLAMA_STATUS_DOT.connected, label: 'Connected', labelClass: 'text-emerald-400' },
    error:        { dot: OLLAMA_STATUS_DOT.error, label: 'Connection failed', labelClass: 'text-red-400' },
};

const OllamaPanel = ({ ollama, theme = 'dark', onClose }) => {
    const {
        baseUrl, setBaseUrl, status, models, error, lastFetchedAt,
        fetchModels, disconnect, pullState, pullModel, cancelPull, clearPullState,
    } = ollama;

    const [draftUrl, setDraftUrl] = useState(baseUrl);
    const [pullName, setPullName] = useState('');

    // Panel remounts each time its tab opens, so this just keeps the draft in
    // sync if the connected URL changes underneath.
    useEffect(() => {
        setDraftUrl(baseUrl);
    }, [baseUrl]);

    const isDark = theme === 'dark';
    const meta = STATUS_META[status] || STATUS_META.disconnected;
    const isConnecting = status === 'connecting';
    const isConnected = status === 'connected';

    const cleanedDraft = (draftUrl || '').trim().replace(/\/+$/, '');
    const urlChanged = cleanedDraft !== baseUrl;

    const isPulling = pullState?.phase === 'pulling';
    const pullPercent = pullState?.percent ?? null;
    const totalInstalledBytes = models.reduce((sum, m) => sum + (m.sizeBytes || 0), 0);

    const handleConnect = () => {
        if (!cleanedDraft || isConnecting) return;
        setBaseUrl(cleanedDraft);
        fetchModels(cleanedDraft);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConnect();
        }
    };

    const handlePull = () => {
        const name = pullName.trim();
        if (!name || isPulling || !pullModel) return;
        pullModel(name);
    };

    const handlePullInputChange = (e) => {
        setPullName(e.target.value);
        if (pullState && pullState.phase !== 'pulling') clearPullState?.();
    };

    const handlePullKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handlePull();
        }
    };

    const lastFetchedLabel = lastFetchedAt
        ? new Date(lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : null;

    const sectionLabelClass = `text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`;
    const primaryBtnClass = 'flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[92px]';
    const secondaryBtnClass = `flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
        isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-600'
    }`;

    const errorMessage = typeof error === 'object' ? error?.message : error;
    const errorRaw = typeof error === 'object' ? error?.raw : null;

    return (
        <div className="flex flex-col">
            {/* Body */}
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
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
                    <label className={sectionLabelClass}>
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
                {status === 'error' && errorMessage && (
                    <div className={`rounded-lg border p-3 text-xs leading-relaxed ${
                        isDark ? 'bg-red-500/5 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                        <div className="flex items-start gap-2">
                            <HiExclamationTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <p className="font-medium break-words">{errorMessage}</p>

                                {errorRaw && (
                                    <div className={`mt-2 rounded p-2 text-[10px] font-mono break-all ${
                                        isDark ? 'bg-gray-950 text-gray-400' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {errorRaw}
                                    </div>
                                )}

                                <p className="mt-1.5 opacity-70">
                                    If Ollama is running, allow browser access by starting it with{' '}
                                    <code className="font-mono">OLLAMA_ORIGINS=*</code>.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {isConnected && (
                    <>
                        {/* Install a model */}
                        <div className={`space-y-2 pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                            <label className={sectionLabelClass}>
                                Install a{' '}
                                    <a
                                        href="https://ollama.com/search"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:opacity-80"
                                    >
                                        model
                                    </a>
                            </label>

                            {isPulling ? (
                                <div className={`rounded-lg border p-3 space-y-2 ${
                                    isDark ? 'bg-gray-950 border-gray-700' : 'bg-gray-50 border-gray-200'
                                }`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-xs font-semibold font-mono truncate ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                                            {pullState.name}
                                        </span>
                                        <span className={`text-xs font-mono shrink-0 ${isDark ? 'text-teal-300' : 'text-teal-600'}`}>
                                            {pullPercent !== null ? `${pullPercent}%` : ''}
                                        </span>
                                    </div>

                                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                        {pullPercent !== null ? (
                                            <div
                                                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                                                style={{ width: `${pullPercent}%` }}
                                            />
                                        ) : (
                                            <div className="h-full w-full rounded-full bg-teal-500/40 animate-pulse" />
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-[10px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {pullState.total > 0
                                                ? `${pullState.status} · ${formatSize(pullState.completed) || '0 MB'} / ${formatSize(pullState.total)}`
                                                : pullState.status}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={cancelPull}
                                            className={`text-[10px] font-semibold shrink-0 transition-colors ${
                                                isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'
                                            }`}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={pullName}
                                        onChange={handlePullInputChange}
                                        onKeyDown={handlePullKeyDown}
                                        placeholder="e.g. llama3.2 or qwen3:4b"
                                        spellCheck={false}
                                        autoComplete="off"
                                        className={`flex-1 min-w-0 text-xs font-mono px-3 py-2.5 rounded-lg border outline-none transition-colors ${
                                            isDark
                                                ? 'bg-gray-950 border-gray-700 text-gray-100 placeholder-gray-600 focus:border-teal-500/60'
                                                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-teal-500'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={handlePull}
                                        disabled={!pullName.trim()}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                    >
                                        <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
                                        Pull
                                    </button>
                                </div>
                            )}

                            {pullState?.phase === 'success' && (
                                <div className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                                    isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                                }`}>
                                    <span className={`flex items-center gap-1.5 text-xs min-w-0 ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                                        <HiCheckCircle className="w-4 h-4 shrink-0" />
                                        <span className="truncate">Installed <span className="font-mono">{pullState.name}</span></span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={clearPullState}
                                        className="opacity-60 hover:opacity-100 shrink-0"
                                        aria-label="Dismiss"
                                    >
                                        <HiXMark className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {pullState?.phase === 'error' && (
                                <div className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 ${
                                    isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                                }`}>
                                    <span className={`flex items-start gap-1.5 text-xs min-w-0 ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                                        <HiExclamationTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span className="break-words">{pullState.error}</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={clearPullState}
                                        className="opacity-60 hover:opacity-100 shrink-0"
                                        aria-label="Dismiss"
                                    >
                                        <HiXMark className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Installed models */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className={sectionLabelClass}>Installed models</label>
                                {totalInstalledBytes > 0 && (
                                    <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {formatSize(totalInstalledBytes)} total
                                    </span>
                                )}
                            </div>

                            {models.length === 0 ? (
                                <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    No models installed yet. Use the field above to pull your first one.
                                </p>
                            ) : (
                                <div className={`max-h-36 overflow-y-auto custom-scrollbar rounded-lg border divide-y ${
                                    isDark ? 'border-gray-700 divide-gray-800' : 'border-gray-200 divide-gray-100'
                                }`}>
                                    {models.map((m) => (
                                        <div
                                            key={m.value}
                                            className={`flex items-center justify-between gap-2 px-3 py-2 ${
                                                isDark ? 'bg-gray-950/50' : 'bg-white'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-xs font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                    {m.label}
                                                </p>
                                                <p className={`text-[10px] font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {m.name}
                                                    {m.parameterSize ? ` · ${m.parameterSize}` : ''}
                                                    {m.quantization ? ` · ${m.quantization}` : ''}
                                                </p>
                                            </div>
                                            {m.description && (
                                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                                    isDark ? 'bg-teal-500/10 text-teal-300' : 'bg-teal-50 text-teal-600'
                                                }`}>
                                                    {m.description}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className={`flex items-center gap-2 px-5 py-3.5 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                {isConnected && (
                    <button
                        type="button"
                        onClick={disconnect}
                        className={`text-xs font-medium px-2 py-2 rounded-lg transition-colors ${
                            isDark ? 'text-red-400/90 hover:text-red-300 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                        }`}
                    >
                        Disconnect
                    </button>
                )}
                <div className="flex-1" />
                {isConnected && !urlChanged && (
                    <button type="button" onClick={() => fetchModels()} className={secondaryBtnClass}>
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
    );
};

export default OllamaPanel;