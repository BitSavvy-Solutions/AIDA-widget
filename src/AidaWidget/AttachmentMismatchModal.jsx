/* src/AidaWidget/AttachmentMismatchModal.jsx */
import React, { useMemo, useEffect } from 'react';
import {
    HiExclamationTriangle, HiXMark, HiPhoto, HiDocument,
    HiOutlineMicrophone, HiOutlineRectangleStack, HiOutlineDocument,
} from 'react-icons/hi2';

const TYPE_META = {
    image: { Icon: HiPhoto, singular: 'image', plural: 'images' },
    pdf: { Icon: HiDocument, singular: 'PDF', plural: 'PDFs' },
    audio: { Icon: HiOutlineMicrophone, singular: 'audio file', plural: 'audio files' },
    video: { Icon: HiOutlineRectangleStack, singular: 'video', plural: 'videos' },
};

const metaFor = (type) => TYPE_META[type] || { Icon: HiOutlineDocument, singular: type, plural: type };

const joinPhrase = (parts) => (
    parts.length <= 1
        ? (parts[0] || '')
        : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
);

const AttachmentMismatchModal = ({
    isOpen,
    onClose,
    unsupportedAttachments = [],
    modelLabel = 'This model',
    canSendWithout = true,
    onSendWithout,
    onChangeModel,
    theme = 'dark',
}) => {
    const groups = useMemo(() => {
        const map = new Map();
        for (const item of unsupportedAttachments) {
            const type = item?.type || 'file';
            let group = map.get(type);
            if (!group) {
                group = { type, current: 0, history: 0 };
                map.set(type, group);
            }
            if (item.source === 'history') group.history += 1;
            else group.current += 1;
        }
        return [...map.values()];
    }, [unsupportedAttachments]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen || groups.length === 0) return null;

    const isDark = theme === 'dark';
    const hasHistoryItems = unsupportedAttachments.some((i) => i.source === 'history');

    const phrase = joinPhrase(groups.map((g) => {
        const meta = metaFor(g.type);
        const count = g.current + g.history;
        return `${count} ${count === 1 ? meta.singular : meta.plural}`;
    }));

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Unsupported attachments">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative z-10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border ${
                isDark ? 'bg-gray-900 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
            }`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                            <HiExclamationTriangle className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold">Unsupported attachments</h3>
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

                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="font-semibold">{modelLabel}</span> can't process {phrase} in this conversation.
                    </p>

                    <div className={`rounded-lg border divide-y ${
                        isDark ? 'border-gray-700 divide-gray-800 bg-gray-950/50' : 'border-gray-200 divide-gray-100 bg-gray-50'
                    }`}>
                        {groups.map((group) => {
                            const { Icon, singular, plural } = metaFor(group.type);
                            const total = group.current + group.history;
                            const sources = [];
                            if (group.current > 0) sources.push(`${group.current} in this message`);
                            if (group.history > 0) sources.push(`${group.history} from earlier messages`);
                            return (
                                <div key={group.type} className="flex items-center gap-2.5 px-3 py-2">
                                    <Icon className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <span className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        {total} {total === 1 ? singular : plural}
                                    </span>
                                    <span className={`ml-auto text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {sources.join(' · ')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {hasHistoryItems && (
                        <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Attachments from earlier messages are only hidden from this one request. Your chat history stays unchanged.
                        </p>
                    )}

                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Send without them, or switch to a model that supports them?
                    </p>
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-end gap-2 px-5 py-3.5 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <button
                        type="button"
                        onClick={onSendWithout}
                        disabled={!canSendWithout}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-200' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                        title={canSendWithout ? 'Send without these attachments' : 'Nothing would be left to send'}
                    >
                        Send without
                    </button>
                    {onChangeModel && (
                        <button
                            type="button"
                            onClick={onChangeModel}
                            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-coral hover:bg-brand-coral/90 text-white transition-colors shadow-sm"
                        >
                            Change model
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttachmentMismatchModal;