import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const CodeBlock = ({ inline, className, children, ...props }) => {
    if (inline) {
        return <code className={className} {...props}>{children}</code>;
    }
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch (_) {
            // ignore
        }
    };

    return (
        <div className="relative group">
            <button
                type="button"
                onClick={onCopy}
                aria-label="Copy code"
                title={copied ? 'Copied' : 'Copy code'}
                className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-gray-800/80 text-gray-200 px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                {copied ? 'Copied' : 'Copy'}
            </button>
            <SyntaxHighlighter
                style={oneDark}
                language={match ? match[1] : 'text'}
                PreTag="div"
                {...props}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

const ChatDisplay = ({ messages, messagesEndRef, siteLanguage, onStartEdit }) => {
    const [copiedId, setCopiedId] = useState(null);

    const handleCopy = async (text, id) => {
        try {
            await navigator.clipboard.writeText(text || '');
            setCopiedId(id);
        } catch (e) {
            // noop
        }
    };

    useEffect(() => {
        if (!copiedId) return;
        const t = setTimeout(() => setCopiedId(null), 1200);
        return () => clearTimeout(t);
    }, [copiedId]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end pl-10' : 'justify-start pr-10'}`}>
                    {message.sender === 'bot' && (
                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                            <span className="text-[#FF5F90] text-xs font-mono">| |</span>
                        </div>
                    )}
                    <div className={`flex flex-col w-full ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                            className={`${message.sender === 'user' ? 'user-message rounded-l-xl' : 'bot-message rounded-r-xl'}`}
                            dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'}
                        >
                            {/* Attached images (if any) */}
                            {Array.isArray(message.images) && message.images.length > 0 && (
                                <div className="space-y-2 mb-2">
                                    {message.images.map((img) => (
                                        <img key={img.id || img.src} src={img.src} alt={img.name || 'uploaded'} className="rounded-lg border border-gray-200 max-w-full max-h-64 object-contain" />
                                    ))}
                                </div>
                            )}
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code: CodeBlock,
                                    a({ href, children }) {
                                        return (
                                            <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
                                                {children}
                                            </a>
                                        );
                                    }
                                }}
                            >
                                {message.text}
                            </ReactMarkdown>
                        </div>
                        <div className="mt-1 flex items-center gap-2 select-none">
                            <button
                                type="button"
                                onClick={() => handleCopy(message.text, message.id)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                aria-label="Copy message"
                                title="Copy message"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                            </button>
                            {message.sender === 'user' && (
                                <button
                                    type="button"
                                    onClick={() => onStartEdit && onStartEdit(message.id, message.text)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    aria-label="Edit message"
                                    title="Edit message"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-0.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                    </svg>
                                </button>
                            )}
                            {copiedId === message.id && (
                                <span className="text-xs text-green-600">Copied</span>
                            )}
                            {message.sender === 'user' && message.edited && (
                                <span className="text-xs text-gray-400">Edited</span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default ChatDisplay;
