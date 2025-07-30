import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatDisplay = ({ messages, messagesEndRef, siteLanguage }) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
           <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end pl-10' : 'justify-start pr-10'}`}>
                    {message.sender === 'bot' && (
                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                            <span className="text-[#FF5F90] text-xs font-mono">| |</span>
                        </div>
                    )}
                    <div
  className={`${message.sender === 'user' ? 'user-message rounded-l-xl' : 'bot-message rounded-r-xl'}`}
  dir={siteLanguage === 'ar' ? 'rtl' : 'ltr'}
>
                        {message.sender === 'bot' ? (
                            <ReactMarkdown
                                components={{
                                    code({ inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline ? (
                                            <SyntaxHighlighter style={oneDark} language={match ? match[1] : 'text'} PreTag="div" {...props}>
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className={className} {...props}>{children}</code>
                                        );
                                    }
                                }}
                            >
                                {message.text}
                            </ReactMarkdown>
                        ) : (
                            message.text.split('\n').map((line, i) => <p key={i}>{line}</p>)
                        )}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default ChatDisplay;