/* src/AidaWidget/ShareModal.jsx */
import React, { useState } from 'react';
import { HiXMark, HiClipboard, HiCheck, HiArrowDownTray, HiOutlineShare } from 'react-icons/hi2';
import { marked } from 'marked';

/**
 * Modal for sharing or exporting the current conversation.
 * Supports plain text copy, markdown copy, and PDF via the browser print dialog.
 */
const ShareModal = ({ isOpen, onClose, messages = [], sessionTitle = 'Chat', theme = 'dark' }) => {
    const [includeUserMessages, setIncludeUserMessages] = useState(true);
    const [includeAiMessages, setIncludeAiMessages] = useState(true);
    const [copiedFormat, setCopiedFormat] = useState(null);

    if (!isOpen) return null;

    const isDark = theme === 'dark';

    const title = (sessionTitle && sessionTitle !== 'New Chat') ? sessionTitle : 'Chat Conversation';
    const exportDate = new Date().toLocaleString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const filteredMessages = messages.filter(m => {
        const hasText = (m.text || '').trim().length > 0;
        const hasImages = (m.images || []).length > 0;
        if (!hasText && !hasImages) return false;
        if (m.sender === 'user') return includeUserMessages;
        if (m.sender === 'bot') return includeAiMessages;
        return false;
    });

    const hasContent = filteredMessages.length > 0;

    // Plain text output
    const buildPlainText = () => {
        const lines = [title, `Exported: ${exportDate}`, ''];

        filteredMessages.forEach((m, idx) => {
            if (m.sender === 'user') {
                lines.push('***');
                lines.push('Human::');
                if ((m.text || '').trim()) lines.push(m.text.trim());
                if ((m.images || []).length > 0) lines.push(`[${m.images.length} image(s) attached]`);
                lines.push('***');
                lines.push('***');
            } else {
                if ((m.text || '').trim()) lines.push(m.text.trim());
                if ((m.images || []).length > 0) lines.push(`[${m.images.length} image(s) attached]`);
            }

            if (idx < filteredMessages.length - 1) {
                lines.push('');
            }
        });

        return lines.join('\n');
    };

    // Markdown output
    const buildMarkdown = () => {
        const lines = [
            `# ${title}`,
            `*Exported on ${exportDate}*`,
            '',
        ];

        filteredMessages.forEach((m, idx) => {
            if (m.sender === 'user') {
                lines.push('***');
                lines.push('**Human::**');
                lines.push('');
                
                if ((m.text || '').trim()) {
                    // Prefix every line of the user's message with "> " to make it a blockquote
                    const quotedText = m.text.trim().split('\n').map(line => `> ${line}`).join('\n');
                    lines.push(quotedText);
                }
                
                if ((m.images || []).length > 0) {
                    lines.push(`> *[${m.images.length} image(s) attached]*`);
                }
                
                lines.push('');
                lines.push('***');
                lines.push('***');
            } else {
                if ((m.text || '').trim()) lines.push(m.text.trim());
                if ((m.images || []).length > 0) lines.push(`\n*[${m.images.length} image(s) attached]*`);
            }

            lines.push('');
        });

        return lines.join('\n');
    };

    // HTML passed to the print window for PDF export
    const buildPrintHtml = () => {
        const esc = (str) =>
            (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Configure marked to break on newlines
        marked.setOptions({
            breaks: true,
            gfm: true
        });

        // Generate the exact markdown string and parse it into HTML
        const markdownText = buildMarkdown();
        const bodyHtml = marked.parse(markdownText);

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 32px;
    color: #1a1a1a;
    line-height: 1.6;
    font-size: 15px;
  }
  h1 { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
  hr { border: none; border-top: 1px solid #ebebeb; margin: 24px 0; }
  
  /* Markdown Elements Styling */
  p { margin-bottom: 12px; }
  p:last-child { margin-bottom: 0; }
  
  ul, ol { margin-bottom: 12px; padding-left: 24px; }
  li { margin-bottom: 4px; }
  
  /* User message blockquote styling */
  blockquote {
    border-left: 4px solid #d1d5db;
    background-color: #f9fafb;
    padding: 16px;
    border-radius: 0 8px 8px 0;
    color: #374151;
    margin: 12px 0;
  }

  /* Code block styling */
  pre {
    background-color: #1e1e1e;
    color: #f8f8f2;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
    font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    font-size: 13px;
  }
  code {
    font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    background-color: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    color: #db2777;
  }
  pre code {
    padding: 0;
    background-color: transparent;
    color: inherit;
  }

  /* Tables */
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
  th { background-color: #f8fafc; font-weight: 600; }

  @media print {
    body { padding: 20px 16px; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  }
</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
    };

    const handleCopy = async (format) => {
        const text = format === 'markdown' ? buildMarkdown() : buildPlainText();
        try {
            await navigator.clipboard.writeText(text);
            setCopiedFormat(format);
            setTimeout(() => setCopiedFormat(null), 2000);
        } catch {
            // silently fail
        }
    };

    const handleDownloadPdf = () => {
        const w = window.open('', '_blank');
        if (!w) {
            alert('Could not open print window. Please allow popups for this site.');
            return;
        }
        w.document.write(buildPrintHtml());
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 600);
    };

    // Inline toggle switch to avoid prop drilling into a separate file
    const Toggle = ({ checked, onChange, label }) => (
        <div className="flex items-center gap-3">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral/50 ${
                    checked ? 'bg-brand-coral' : (isDark ? 'bg-gray-700' : 'bg-gray-300')
                }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
            </button>
            <span
                className={`text-sm cursor-pointer select-none ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                onClick={() => onChange(!checked)}
            >
                {label}
            </span>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Share conversation"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative z-10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${
                isDark
                    ? 'bg-gray-900 border border-gray-700/80 text-gray-100'
                    : 'bg-white border border-gray-200 text-gray-900'
            }`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                        <HiOutlineShare className="w-4 h-4 opacity-60" />
                        <h3 className="text-sm font-semibold">Share Conversation</h3>
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

                <div className="px-5 py-4 space-y-5">
                    {/* Filter toggles */}
                    <div className="space-y-3">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Include
                        </p>
                        <Toggle
                            checked={includeUserMessages}
                            onChange={setIncludeUserMessages}
                            label="Your messages"
                        />
                        <Toggle
                            checked={includeAiMessages}
                            onChange={setIncludeAiMessages}
                            label="Aida responses"
                        />
                    </div>

                    {/* Export buttons */}
                    <div className={`pt-4 border-t space-y-2 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Export as
                        </p>

                        {[
                            { format: 'text',     label: 'Copy plain text' },
                            { format: 'markdown', label: 'Copy as markdown' },
                        ].map(({ format, label }) => (
                            <button
                                key={format}
                                type="button"
                                onClick={() => handleCopy(format)}
                                disabled={!hasContent}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                    isDark
                                        ? 'border-gray-700 hover:bg-white/5 text-gray-200'
                                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <HiClipboard className="w-4 h-4 opacity-50" />
                                    {label}
                                </span>
                                {copiedFormat === format && (
                                    <span className="flex items-center gap-1 text-xs font-normal text-green-400">
                                        <HiCheck className="w-3.5 h-3.5" />
                                        Copied
                                    </span>
                                )}
                            </button>
                        ))}

                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={!hasContent}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                isDark
                                    ? 'border-gray-700 hover:bg-white/5 text-gray-200'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                        >
                            <HiArrowDownTray className="w-4 h-4 opacity-50" />
                            Download as PDF
                        </button>
                    </div>

                    {!hasContent && (
                        <p className={`text-xs text-center pb-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            Nothing to export with the current filters.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;