/* src/AidaWidget/localModels/ChromeAIPanel.jsx */
import React, { useEffect } from 'react';
import {
    HiArrowPath, HiCheckCircle, HiExclamationTriangle, HiOutlineSparkles,
    HiOutlineArrowDownTray,
} from 'react-icons/hi2';

const badgeFor = (phase, isDark) => {
    const map = {
        checking:        { label: 'Checking', cls: isDark ? 'bg-gray-700/60 text-gray-400' : 'bg-gray-100 text-gray-500', pulse: true },
        available:       { label: 'Ready', cls: isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600' },
        downloadable:    { label: 'Needs download', cls: isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600' },
        downloading:     { label: 'Downloading', cls: isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600' },
        unavailable:     { label: 'Unavailable', cls: isDark ? 'bg-gray-700/60 text-gray-500' : 'bg-gray-100 text-gray-400' },
        unsupported:     { label: 'Not in this Chrome', cls: isDark ? 'bg-gray-700/60 text-gray-500' : 'bg-gray-100 text-gray-400' },
        'flag-disabled': { label: 'Flag disabled', cls: isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600' },
        error:           { label: 'Error', cls: isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-600' },
    };
    return map[phase] || map.checking;
};

const ChromeAIPanel = ({ chromeAI, theme = 'dark', onClose }) => {
    const {
        defs, statuses, support,
        checkAll, enableApi, testApi,
    } = chromeAI;

    const isDark = theme === 'dark';

    // Mounting this panel means its tab just became visible: re-sweep so the
    // panel always reflects the latest download state.
    useEffect(() => {
        checkAll();
    }, [checkAll]);

    const readyCount = defs.filter(d => statuses[d.key]?.phase === 'available').length;
    const anyChecking = defs.some(d => statuses[d.key]?.phase === 'checking');

    const subText = isDark ? 'text-gray-500' : 'text-gray-400';
    const tealBtn = 'flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const ghostBtn = `flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-600'
    }`;

    const renderCard = (def) => {
        const state = statuses[def.key] || { phase: 'checking' };
        const { phase, progress, error, testing, testResult } = state;
        const badge = badgeFor(phase, isDark);
        const isDead = phase === 'unavailable' || phase === 'unsupported';
        const isBusy = phase === 'checking' || phase === 'downloading' || testing;

        return (
            <div
                key={def.key}
                className={`rounded-lg border p-3 transition-opacity ${
                    isDark ? 'bg-gray-950 border-gray-700' : 'bg-gray-50 border-gray-200'
                } ${isDead ? 'opacity-60' : ''}`}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <HiOutlineSparkles className={`w-4 h-4 shrink-0 ${isDead ? 'opacity-50' : 'text-teal-400'}`} />
                        <span className={`text-xs font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                            {def.label}
                        </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${badge.cls} ${badge.pulse ? 'animate-pulse' : ''}`}>
                        {phase === 'downloading' && typeof progress === 'number' ? `Downloading ${progress}%` : badge.label}
                    </span>
                </div>

                <p className={`mt-1 text-[11px] ${subText}`}>{def.tagline}</p>

                {/* Hint while the availability probe is running */}
                {phase === 'checking' && (
                    <p className={`mt-2 text-[11px] leading-relaxed ${subText}`}>
                        Checking availability. If this takes more than a few seconds, enable the
                        Prompt API flag at <code className="font-mono">chrome://flags</code>,
                        relaunch the browser, then re-check.
                    </p>
                )}

                {/* Probe timed out: the flag is almost certainly off in this Chromium fork */}
                {phase === 'flag-disabled' && (
                    <div className={`mt-2 rounded-lg border p-2.5 text-[11px] leading-relaxed flex items-start gap-2 ${
                        isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                        <HiExclamationTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p>
                            The Prompt API exists in this browser but is not responding, which usually
                            means the flag is off. Open <code className="font-mono">chrome://flags</code>,
                            search for <span className="font-semibold">Prompt API</span>, set it to
                            Enabled, relaunch the browser, then press Re-check.
                        </p>
                    </div>
                )}

                {phase === 'downloading' && (
                    <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                        {typeof progress === 'number' ? (
                            <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                        ) : (
                            <div className="h-full w-full rounded-full bg-teal-500/40 animate-pulse" />
                        )}
                    </div>
                )}

                {phase === 'error' && error && (
                    <p className={`mt-2 text-[11px] break-words ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
                )}

                {testResult && (
                    <p className={`mt-2 text-[11px] font-mono break-words ${isDark ? 'text-emerald-300/90' : 'text-emerald-600'}`}>
                        {testResult}
                    </p>
                )}

                <div className="mt-2.5 flex justify-end gap-2">
                    {phase === 'available' && (
                        <button type="button" onClick={() => testApi(def.key)} disabled={testing} className={ghostBtn}>
                            {testing ? <HiArrowPath className="w-3.5 h-3.5 animate-spin" /> : <HiCheckCircle className="w-3.5 h-3.5" />}
                            {testing ? 'Testing' : 'Test'}
                        </button>
                    )}
                    {phase === 'downloadable' && (
                        <button type="button" onClick={() => enableApi(def.key)} className={tealBtn}>
                            <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
                            Enable
                        </button>
                    )}
                    {phase === 'error' && (
                        <button type="button" onClick={() => enableApi(def.key)} className={tealBtn}>
                            <HiArrowPath className="w-3.5 h-3.5" />
                            Retry
                        </button>
                    )}
                    {phase === 'flag-disabled' && (
                        <button type="button" onClick={checkAll} className={ghostBtn}>
                            <HiArrowPath className="w-3.5 h-3.5" />
                            Re-check
                        </button>
                    )}
                    {(isDead || phase === 'checking' || phase === 'downloading') && (
                        <button type="button" disabled className={ghostBtn}>
                            {phase === 'checking' ? '...' : phase === 'downloading' ? 'Downloading' : badge.label}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col">
            {/* Body */}
            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Summary row */}
                <div className="flex items-center justify-between gap-2">
                    <p className={`text-[11px] leading-snug ${subText}`}>
                        Runs fully on-device via Browser Local AI.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold ${readyCount > 0 ? (isDark ? 'text-emerald-300' : 'text-emerald-600') : subText}`}>
                            {readyCount}/{defs.length} ready
                        </span>
                        <button
                            type="button"
                            onClick={checkAll}
                            disabled={anyChecking}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                                isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                            }`}
                            title="Re-check availability"
                            aria-label="Re-check availability"
                        >
                            <HiArrowPath className={`w-3.5 h-3.5 ${anyChecking ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Unsupported banner: feature stays visible but greyed out */}
                {!support.supported && (
                    <div className={`rounded-lg border p-3 text-xs leading-relaxed ${
                        isDark ? 'bg-amber-500/5 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                        <div className="flex items-start gap-2">
                            <HiExclamationTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>
                                This browser does not expose Chrome's Built-in AI Prompt API. Update Chrome and
                                enable the Prompt API flags at <code className="font-mono">chrome://flags</code>,
                                then relaunch. Browser Local AI is shown below but cannot be enabled here.
                            </p>
                        </div>
                    </div>
                )}

                {defs.map(renderCard)}
            </div>

            {/* Footer */}
            <div className={`flex items-center gap-2 px-5 py-3.5 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                <span className={`text-[10px] ${subText}`}>
                    Managed by Chrome
                </span>
                <div className="flex-1" />
                <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors min-w-[92px]"
                >
                    Done
                </button>
            </div>
        </div>
    );
};

export default ChromeAIPanel;