/* src/AidaWidget/AttachmentPreview.jsx */
import React from 'react';
import { HiArrowLeft } from 'react-icons/hi2';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const extensionToLanguageMap = {
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    ts: 'typescript',
    tsx: 'tsx',
    xml: 'xml',
    csv: 'csv',
    sh: 'bash',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
};

const getLanguageFromFileName = (fileName) => {
    if (typeof fileName !== 'string') return 'plaintext';
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? (extensionToLanguageMap[extension] || 'plaintext') : 'plaintext';
};

const AttachmentPreview = ({ attachment, onBack, theme = 'dark' }) => {
    if (!attachment) return null;

    if (attachment.type !== 'text') {
        console.warn('AttachmentPreview is designed for text files.');
        onBack();
        return null;
    }

    const language = getLanguageFromFileName(attachment.name);
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
                <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    wrapLines={true}
                    wrapLongLines={true}
                    customStyle={{
                        padding: '1rem',
                        margin: 0,
                        backgroundColor: 'transparent',
                        fontSize: '0.875rem',
                    }}
                    PreTag="pre"
                    className="h-full"
                >
                    {String(attachment.content || '')}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

export default AttachmentPreview;