/* src/AidaWidget/ToolbarModal.jsx */
import React, { useEffect, useRef } from 'react';

/**
 * Shared modal shell for toolbar popups (model picker, overflow controls).
 * Bottom sheet on phones, centered dialog on larger screens.
 *
 * Renders inline (no portal) so it stays a DOM child of its trigger wrapper.
 * Owns the outside-click and Escape handling: clicks inside the panel or on
 * the trigger (triggerRef) are ignored, everything else closes the modal.
 */
const ToolbarModal = ({
    isOpen,
    onClose,
    ariaLabel,
    header,
    footer,
    children,
    bodyClassName = 'flex-1 min-h-0 overflow-y-auto custom-scrollbar',
    isDark = true,
    triggerRef,
    clipContent = true,
    role = 'dialog',
}) => {
    const panelRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const onPointerDown = (e) => {
            if (panelRef.current?.contains(e.target)) return;
            if (triggerRef?.current?.contains(e.target)) return;
            onClose();
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                ref={panelRef}
                role={role}
                aria-modal={role === 'dialog' ? 'true' : undefined}
                aria-label={ariaLabel}
                className={`relative z-10 flex w-full max-w-md flex-col max-h-[85vh] rounded-t-xl sm:rounded-xl shadow-2xl border ${
                    clipContent ? 'overflow-hidden ' : ''
                }${
                    isDark
                        ? 'bg-gray-800 border-gray-700 text-gray-100'
                        : 'bg-white border-gray-200 text-gray-900'
                }`}
            >
                {header}
                <div className={bodyClassName}>{children}</div>
                {footer}
            </div>
        </div>
    );
};

export default ToolbarModal;