/* src/AidaWidget/CheckboxList.jsx */
import React from 'react';
import { HiCheck } from 'react-icons/hi2';

/**
 * Shared scrollable checkbox list used inside dropdown menus.
 *
 * One implementation of the checkbox row used by both the header tag
 * picker and the model filter dropdown:
 *   [x] (icon) Label        (gear)
 *
 * Props:
 *  - items: [{ id, label, checked, icon?: Component, iconColor?: string }]
 *  - onToggle(id): fired when a row is clicked
 *  - onItemAction(id), itemActionIcon, itemActionTitle: optional per-row
 *    trailing button (e.g. the tag "customize" gear)
 *  - emptyMessage: shown instead of the list when items is empty
 *  - maxHeightClass: Tailwind max-h-* class for the scroll area
 *  - rowHoverClass: hover class for rows. Defaults from isDark; pass
 *    'aida-menu-item' to use the theme-variable hover inside .aida-scope.
 *  - isDark: drives default hover and checkbox border colors
 *
 * Label color is inherited from the parent menu, so the same list works
 * inside themed headers and standalone portaled dropdowns.
 */
const CheckboxList = ({
    items = [],
    onToggle,
    onItemAction,
    itemActionIcon: ItemActionIcon,
    itemActionTitle = 'Customize',
    emptyMessage,
    maxHeightClass = 'max-h-48',
    rowHoverClass,
    isDark = true,
    className = '',
}) => {
    const hoverClass = rowHoverClass ?? (isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100');

    if (items.length === 0) {
        if (!emptyMessage) return null;
        return (
            <div className={`px-3 py-4 text-xs italic text-center opacity-60 ${className}`.trim()}>
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={`overflow-y-auto custom-scrollbar p-1 space-y-0.5 ${maxHeightClass} ${className}`.trim()}>
            {items.map((item) => {
                const checked = Boolean(item.checked);
                const Icon = item.icon;
                const hasAction = Boolean(onItemAction && ItemActionIcon);
                return (
                    <div
                        key={item.id}
                        className={`flex items-center gap-1 group rounded pr-1 transition-colors ${hoverClass}`}
                    >
                        <button
                            type="button"
                            role="menuitemcheckbox"
                            aria-checked={checked}
                            onClick={() => onToggle?.(item.id)}
                            className="flex-1 px-2 py-1.5 text-left flex items-center gap-2 min-w-0"
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                checked
                                    ? 'bg-brand-coral border-brand-coral'
                                    : (isDark
                                        ? 'border-gray-500 group-hover:border-gray-400'
                                        : 'border-gray-300 group-hover:border-gray-400')
                            }`}>
                                {checked && <HiCheck className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                                {Icon && (
                                    <Icon
                                        className="w-4 h-4 shrink-0"
                                        style={item.iconColor ? { color: item.iconColor } : undefined}
                                    />
                                )}
                                <span className={`truncate text-xs ${checked ? 'font-medium' : ''}`}>
                                    {item.label}
                                </span>
                            </div>
                        </button>
                        {hasAction && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onItemAction(item.id);
                                }}
                                className={`p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all ${hoverClass}`}
                                title={itemActionTitle}
                                aria-label={itemActionTitle}
                            >
                                <ItemActionIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default CheckboxList;