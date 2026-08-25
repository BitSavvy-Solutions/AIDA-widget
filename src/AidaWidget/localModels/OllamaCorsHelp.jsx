/* src/AidaWidget/localModels/OllamaCorsHelp.jsx */
import React, { useState, useMemo } from 'react';
import { HiOutlineBookOpen } from 'react-icons/hi2';
import CopyableCode from '../CopyableCode';

const SETUP_GUIDE_URL = 'https://docs.bitsavvy.ca/s/e07a93f7-5164-4dcf-b618-4d1af1bdaf66';

const PLATFORMS = [
    { key: 'windows', label: 'Windows' },
    { key: 'bash', label: 'macOS / Linux' },
];

// Best guess for pre-selecting the relevant tab; the user can always switch.
const detectPlatformKey = () => {
    if (typeof navigator === 'undefined') return 'windows';
    const platform = `${navigator.userAgentData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
    return platform.includes('win') ? 'windows' : 'bash';
};

/**
 * Platform-aware CORS fix shown when the browser cannot reach Ollama.
 * Commands are generated for the current page origin (so they are correct
 * on any host the widget is embedded on) and are click-to-copy.
 */
const OllamaCorsHelp = ({ isDark }) => {
    const [platform, setPlatform] = useState(detectPlatformKey);

    // window.location.origin makes the command correct for beta, prod,
    // localhost dev, or any customer site hosting the widget.
    const commands = useMemo(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-site.com';
        return {
            windows: [
                `$env:OLLAMA_ORIGINS="${origin}"`,
                'ollama serve',
            ],
            bash: [
                `OLLAMA_ORIGINS="${origin}" ollama serve`,
            ],
        };
    }, []);

    return (
        <div className="mt-3 space-y-2">
            <p className="opacity-70">
                Ollama must allow requests from this site. Quit Ollama if it is
                running, then restart it from a terminal:
            </p>

            <div
                className={`inline-flex rounded-lg p-0.5 text-[10px] font-semibold ${isDark ? 'bg-black/30' : 'bg-black/5'}`}
                role="tablist"
                aria-label="Choose your operating system"
            >
                {PLATFORMS.map(p => (
                    <button
                        key={p.key}
                        type="button"
                        role="tab"
                        aria-selected={platform === p.key}
                        onClick={() => setPlatform(p.key)}
                        className={`px-2 py-1 rounded-md transition-colors ${
                            platform === p.key
                                ? (isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow-sm')
                                : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="space-y-1">
                {commands[platform].map(cmd => (
                    <CopyableCode key={cmd} block text={cmd} isDark={isDark} />
                ))}
            </div>

            <p className="opacity-60">
                {platform === 'windows'
                    ? 'Run both commands in the same PowerShell window, then press Retry.'
                    : 'Then press Retry below.'}
            </p>

            <a
                href={SETUP_GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80 ${
                    isDark ? 'text-teal-300' : 'text-teal-600'
                }`}
            >
                <HiOutlineBookOpen className="w-3.5 h-3.5" />
                Full setup guide
            </a>
        </div>
    );
};

export default OllamaCorsHelp;