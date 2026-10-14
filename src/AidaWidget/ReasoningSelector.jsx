/* src/AidaWidget/ReasoningSelector.jsx */
import React, { useState, useRef, useEffect } from 'react';
import { HiChevronDown } from 'react-icons/hi2';

const LABELS = { none: 'None', minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra High', max: 'Max' };
// The toolbar is narrow, so the pill itself shows a short form
const SHORT_LABELS = { none: 'Off', minimal: 'Min', low: 'Low', medium: 'Med', high: 'High', xhigh: 'XHigh', max: 'Max' };

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
// A null value means no effort is sent and the model decides
const getLabel = (effort) => (effort ? LABELS[effort] || capitalize(effort) : 'Model default');
const getShortLabel = (effort) => (effort ? SHORT_LABELS[effort] || capitalize(effort) : 'Auto');

// When efforts is empty, the selector still renders a non-interactive pill that
// just shows "Auto" and cannot be clicked to open a dropdown.
const ReasoningSelector = ({ efforts = [], value, defaultEffort = null, isDefault = true, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        const handleKeyDown = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const hasChoices = efforts.length > 0;

    const toggleOpen = () => {
        if (hasChoices) setIsOpen((p) => !p);
    };

    // The button that is always visible, whether or not there are choices.
    const button = (
        <button
            type="button"
            onClick={toggleOpen}
            className={
                `flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors border border-purple-500/30 bg-purple-500/10 text-purple-500 hover:bg-gray-700`
                + (hasChoices ? ' cursor-pointer' : ' cursor-default opacity-60')
            }
            aria-haspopup={hasChoices ? 'listbox' : undefined}
            aria-expanded={hasChoices ? isOpen : undefined}
            aria-label={`Reasoning effort. Current: ${getLabel(value)}`}
            title={`Reasoning effort: ${getLabel(value)}`}
            disabled={!hasChoices}
        >
            <span className="text-gray-200 text-xs">{getShortLabel(value)}</span>
            {hasChoices && (
                <HiChevronDown className={`h-3 w-3 flex-shrink-0 opacity-70 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            )}
        </button>
    );

    // If there are no choices, just render the button, no dropdown.
    if (!hasChoices) {
        return (
            <div className="relative flex-shrink-0" ref={containerRef}>
                {button}
            </div>
        );
    }

    return (
        <div className="relative flex-shrink-0" ref={containerRef}>
            {button}
            {isOpen && (
                <div
                    className="absolute bottom-full left-0 mb-2 z-[60] min-w-[8rem] rounded-lg shadow-2xl border bg-gray-800 border-gray-700 p-1"
                    role="listbox"
                    aria-label="Choose reasoning effort"
                >
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Reasoning</div>
                    <button
                        type="button"
                        role="option"
                        aria-selected={isDefault}
                        onClick={() => { onChange(null); setIsOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 text-sm rounded-md flex items-center justify-between gap-2 transition-colors whitespace-nowrap ${isDefault ? 'bg-gray-700/50 text-white' : 'text-gray-200 hover:bg-gray-700/30'}`}
                        title="Use each model's own default level"
                    >
                        <span>Default{defaultEffort && <span className="text-gray-400"> · {getLabel(defaultEffort)}</span>}</span>
                        {isDefault && <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-coral flex-shrink-0" aria-hidden="true" />}
                    </button>
                    <div className="my-1 border-t border-gray-700" />
                    {efforts.map((effort) => {
                        const isSelected = !isDefault && effort === value;
                        const isModelDefault = effort === defaultEffort;
                        return (
                            <button
                                key={effort}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => { onChange(effort); setIsOpen(false); }}
                                className={`w-full text-left px-2.5 py-1.5 text-sm rounded-md flex items-center justify-between gap-2 transition-colors whitespace-nowrap ${isModelDefault ? 'font-bold' : 'font-normal'} ${isSelected ? 'bg-gray-700/50 text-white' : 'text-gray-200 hover:bg-gray-700/30'}`}
                                title={isModelDefault ? 'Model default' : undefined}
                            >
                                {getLabel(effort)}
                                {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-coral flex-shrink-0" aria-hidden="true" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ReasoningSelector;