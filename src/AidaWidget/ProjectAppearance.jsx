/* src/AidaWidget/ProjectAppearance.jsx */
import React from 'react';
import {
  HiOutlineFolder, HiOutlineBanknotes, HiOutlineAcademicCap, HiOutlinePencilSquare,
  HiOutlineCodeBracketSquare, HiOutlinePhoto, HiOutlineMusicalNote, HiOutlineTrash,
  HiOutlineSparkles, HiOutlineLightBulb, HiOutlineBeaker, HiOutlineHeart,
  HiOutlineBriefcase, HiOutlineGlobeAlt, HiOutlineShieldCheck,
  HiOutlineChatBubbleOvalLeft, HiOutlineBolt, HiOutlineChartBar,
  HiOutlineRocketLaunch, HiOutlineWrenchScrewdriver, HiOutlineEnvelope,
  HiOutlineCircleStack, HiOutlineBuildingOffice, HiOutlineCog6Tooth,
  HiChevronLeft
} from 'react-icons/hi2';
import { LuDumbbell, LuStethoscope, LuPawPrint } from 'react-icons/lu';

// --- Constants ---
export const BRAND_COLOR = '#FF5F90';
export const DEFAULT_PROJECT_ICON_COLOR = '#9CA3AF';

// --- Icons ---
export const NotebookIcon = ({ className = '' }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="15" height="18" rx="2" ry="2" />
    <path d="M8 3v18" /><path d="M11 7h4" /><path d="M11 11h4" />
  </svg>
);

const createLucideIcon = (IconComponent) => ({ className = '' }) => (
  <IconComponent className={className} strokeWidth={1.6} />
);

const DumbbellIcon = createLucideIcon(LuDumbbell);
const StethoscopeIcon = createLucideIcon(LuStethoscope);
const PawPrintIcon = createLucideIcon(LuPawPrint);

// --- Options ---
export const PROJECT_COLOR_OPTIONS = [
  { value: DEFAULT_PROJECT_ICON_COLOR, label: 'Neutral' },
  { value: '#F87171', label: 'Red' },
  { value: '#FB923C', label: 'Orange' },
  { value: '#FACC15', label: 'Yellow' },
  { value: '#34D399', label: 'Green' },
  { value: '#38BDF8', label: 'Sky' },
  { value: '#818CF8', label: 'Indigo' },
  { value: '#F472B6', label: 'Pink' }
];

export const PROJECT_ICON_OPTIONS = [
  { key: 'notebook', label: 'Notebook', Icon: NotebookIcon },
  { key: 'folder', label: 'Folder', Icon: HiOutlineFolder },
  { key: 'bank', label: 'Budget', Icon: HiOutlineBanknotes },
  { key: 'cap', label: 'Academics', Icon: HiOutlineAcademicCap },
  { key: 'pencil', label: 'Writing', Icon: HiOutlinePencilSquare },
  { key: 'code', label: 'Code', Icon: HiOutlineCodeBracketSquare },
  { key: 'photo', label: 'Media', Icon: HiOutlinePhoto },
  { key: 'music', label: 'Music', Icon: HiOutlineMusicalNote },
  { key: 'trash', label: 'Cleanup', Icon: HiOutlineTrash },
  { key: 'spark', label: 'Ideas', Icon: HiOutlineSparkles },
  { key: 'bulb', label: 'Insights', Icon: HiOutlineLightBulb },
  { key: 'beaker', label: 'Lab', Icon: HiOutlineBeaker },
  { key: 'heart', label: 'Wellness', Icon: HiOutlineHeart },
  { key: 'fitness', label: 'Fitness', Icon: DumbbellIcon },
  { key: 'healthcare', label: 'Healthcare', Icon: StethoscopeIcon },
  { key: 'pets', label: 'Pets', Icon: PawPrintIcon },
  { key: 'briefcase', label: 'Work', Icon: HiOutlineBriefcase },
  { key: 'globe', label: 'Global', Icon: HiOutlineGlobeAlt },
  { key: 'shield', label: 'Security', Icon: HiOutlineShieldCheck },
  { key: 'chat', label: 'Comm', Icon: HiOutlineChatBubbleOvalLeft },
  { key: 'bolt', label: 'Energy', Icon: HiOutlineBolt },
  { key: 'chart', label: 'Analytics', Icon: HiOutlineChartBar },
  { key: 'rocket', label: 'Launch', Icon: HiOutlineRocketLaunch },
  { key: 'wrench', label: 'Tools', Icon: HiOutlineWrenchScrewdriver },
  { key: 'envelope', label: 'Inbox', Icon: HiOutlineEnvelope },
  { key: 'stack', label: 'Data', Icon: HiOutlineCircleStack },
  { key: 'building', label: 'Office', Icon: HiOutlineBuildingOffice },
  { key: 'cog', label: 'Settings', Icon: HiOutlineCog6Tooth },
];

// --- Helper ---
export const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(255, 255, 255, ${alpha})`;
  const normalized = hex.replace('#', '');
  const length = normalized.length;
  const parse = (start) => parseInt(normalized.slice(start, start + (length === 3 ? 1 : 2)), 16) * (length === 3 ? 17 : 1);
  const r = parse(0);
  const g = parse(length === 3 ? 1 : 2);
  const b = parse(length === 3 ? 2 : 4);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// --- Reusable Component ---
export const ProjectIconPicker = ({ 
    project, 
    onUpdate, 
    onBack, 
    onClose, 
    theme = 'dark' 
}) => {
    if (!project) return null;

    const isDark = theme === 'dark';
    const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = isDark ? 'text-gray-500' : 'text-gray-400';
    const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
    const bgHover = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`px-3 py-2 border-b ${borderColor} flex items-center gap-2 shrink-0`}>
                {onBack && (
                    <button 
                        onClick={onBack}
                        className={`p-1 -ml-1 rounded ${bgHover} ${subTextColor} hover:text-current transition-colors`}
                        aria-label="Back"
                    >
                        <HiChevronLeft className="w-4 h-4" />
                    </button>
                )}
                <span className={`text-xs font-semibold ${textColor} truncate`}>
                    {onBack ? `Edit "${project.name}"` : 'Choose Icon'}
                </span>
            </div>
            
            {/* Scrollable Content */}
            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                {/* Color Picker */}
                <div className="space-y-1">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${subTextColor}`}>Color</span>
                    <div className="flex gap-1 flex-wrap">
                        {PROJECT_COLOR_OPTIONS.map((option) => {
                            const isSelected = (project.iconColor || DEFAULT_PROJECT_ICON_COLOR) === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => onUpdate(project.id, { iconColor: option.value })}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none ${isSelected ? 'border-white ring-2 ring-brand-coral/50' : 'border-transparent'}`}
                                    style={{ backgroundColor: option.value }}
                                    title={option.label}
                                    aria-label={`Select ${option.label} color`}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Icon Picker */}
                <div className="space-y-1">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${subTextColor}`}>Icon</span>
                    <div className="grid grid-cols-6 gap-1">
                        {PROJECT_ICON_OPTIONS.map((option) => {
                            const OptionIcon = option.Icon || NotebookIcon;
                            const isSelected = (project.iconKey || 'notebook') === option.key;
                            return (
                                <button
                                    key={option.key}
                                    onClick={() => onUpdate(project.id, { iconKey: option.key })}
                                    className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-coral text-white' : `${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}`}
                                    title={option.label}
                                    aria-label={`Select ${option.label} icon`}
                                >
                                    <OptionIcon className="w-4 h-4" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            {onClose && (
                <div className={`p-2 border-t ${borderColor} shrink-0`}>
                    <button 
                        onClick={onClose}
                        className="w-full py-1.5 rounded bg-brand-coral hover:bg-brand-coral/90 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
};