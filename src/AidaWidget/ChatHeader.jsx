/* src/AidaWidget/ChatHeader.jsx */
import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import {
    HiPlus, HiOutlineSun, HiOutlineMoon, HiClock, HiEllipsisVertical,
    HiMinusSmall, HiOutlineArrowsPointingOut, HiPencilSquare, HiCheck,
    HiOutlineTag, HiOutlineCog6Tooth, HiOutlineShare,
    HiOutlineAdjustmentsHorizontal
} from 'react-icons/hi2';
import { LuHandHeart } from 'react-icons/lu';
import SevenSegmentDisplay from './SevenSegmentDisplay';
import CreditsDisplay from './CreditsDisplay';
import {
    ProjectIconPicker,
    PROJECT_ICON_OPTIONS,
    DEFAULT_PROJECT_ICON_COLOR,
    NotebookIcon,
    hexToRgba
} from './ProjectAppearance';

const ChatHeader = ({
    displayText,
    lastCost = 0,
    userId,
    resetChat,
    toggleFullscreen,
    toggleChat,
    theme = 'dark',
    paymentLinkConfig,
    onOpenAppearance,
    onToggleHistory,
    onDisplayClick,
    showFullscreenToggle = true,
    isMobileViewport = false,
    sessionTitle = "New Chat",
    onRenameSession,
    isSessionActive = false,
    currentSessionId,
    projects = [],
    onCreateProject,
    onAssignChatToProject,
    onRemoveChatFromProject,
    onUpdateProjectAppearance,
    onShare,
}) => {
    const headerColors = 'glass-header text-white border-b';
    const hoverColor = 'aida-menu-item';
    const accentColor = 'inherit';

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const headerRef = useRef(null);
    const [isNarrow, setIsNarrow] = useState(false);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(sessionTitle);
    const titleInputRef = useRef(null);

    const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
    const tagMenuRef = useRef(null);
    const [newTagDraft, setNewTagDraft] = useState('');
    const [editingProjectId, setEditingProjectId] = useState(null);

    const [visibleTagCount, setVisibleTagCount] = useState(0);
    const tagsContainerRef = useRef(null);
    const hiddenMeasureRef = useRef(null);

    const isDefaultTitle = sessionTitle === 'New Chat' || !sessionTitle || sessionTitle.trim() === '';

    useEffect(() => {
        if (!isMenuOpen) return;
        const handleClick = (event) => {
            if (!menuRef.current?.contains(event.target)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isTagMenuOpen) {
            setEditingProjectId(null);
            return;
        }
        const handleClick = (event) => {
            if (!tagMenuRef.current?.contains(event.target)) setIsTagMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isTagMenuOpen]);

    useEffect(() => {
        if (!headerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) setIsNarrow(entry.contentRect.width < 480);
        });
        observer.observe(headerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            if (!isDefaultTitle) titleInputRef.current.select();
        }
    }, [isEditingTitle, isDefaultTitle]);

    const assignedProjects = useMemo(() => {
        if (!currentSessionId) return [];
        return projects.filter(p => p.chatIds.includes(currentSessionId));
    }, [projects, currentSessionId]);

    useLayoutEffect(() => {
        if (!tagsContainerRef.current || !hiddenMeasureRef.current || assignedProjects.length === 0) {
            setVisibleTagCount(assignedProjects.length);
            return;
        }

        const calculateVisibleTags = () => {
            const containerWidth = tagsContainerRef.current.offsetWidth;
            const tagNodes = hiddenMeasureRef.current.children;
            const gap = 4;
            const badgeWidthApprox = 28;
            let currentWidth = 0;
            let count = 0;

            for (let i = 0; i < tagNodes.length; i++) {
                const tagWidth = tagNodes[i].offsetWidth;
                const nextWidth = currentWidth + tagWidth + (i > 0 ? gap : 0);
                if (i === tagNodes.length - 1) {
                    if (nextWidth <= containerWidth) count++;
                } else {
                    if (nextWidth + gap + badgeWidthApprox <= containerWidth) {
                        currentWidth = nextWidth;
                        count++;
                    } else {
                        break;
                    }
                }
            }
            setVisibleTagCount(count);
        };

        const observer = new ResizeObserver(calculateVisibleTags);
        observer.observe(tagsContainerRef.current);
        calculateVisibleTags();
        return () => observer.disconnect();
    }, [assignedProjects, isNarrow]);

    const closeMenu = () => setIsMenuOpen(false);

    const handleStartEdit = () => {
        if (!isSessionActive) return;
        setTitleDraft(isDefaultTitle ? '' : sessionTitle);
        setIsEditingTitle(true);
    };

    const handleSaveTitle = () => {
        if (titleDraft.trim() && onRenameSession) {
            onRenameSession(titleDraft.trim());
        } else {
            if (onRenameSession) onRenameSession("New Chat");
        }
        setIsEditingTitle(false);
    };

    const handleCancelEdit = () => {
        setTitleDraft(sessionTitle);
        setIsEditingTitle(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSaveTitle(); }
        else if (e.key === 'Escape') { e.preventDefault(); handleCancelEdit(); }
    };

    const handleToggleTag = (projectId) => {
        if (!currentSessionId) return;
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        const isAssigned = project.chatIds.includes(currentSessionId);
        if (isAssigned) onRemoveChatFromProject(projectId, currentSessionId);
        else onAssignChatToProject(projectId, currentSessionId);
    };

    const handleCreateTag = () => {
        if (!newTagDraft.trim() || !onCreateProject || !currentSessionId) return;
        const newProjectId = onCreateProject(newTagDraft.trim(), currentSessionId);
        if (newProjectId) setNewTagDraft('');
    };

    const visibleTags = assignedProjects.slice(0, visibleTagCount);
    const hiddenTagCount = assignedProjects.length - visibleTagCount;

    const renderTag = (p) => {
        const Icon = PROJECT_ICON_OPTIONS.find(opt => opt.key === p.iconKey)?.Icon || NotebookIcon;
        const color = p.iconColor || DEFAULT_PROJECT_ICON_COLOR;
        const bg = hexToRgba(color, 0.15);
        return (
            <div
                key={p.id}
                className="flex items-center gap-0.5 px-1 py-0.5 rounded-md border border-white/5 shrink-0"
                style={{ backgroundColor: bg, borderColor: hexToRgba(color, 0.3) }}
            >
                <Icon className="w-3 h-3 shrink-0" style={{ color }} />
                <span className="text-[10px] font-medium leading-none whitespace-nowrap" style={{ color }}>
                    {p.name}
                </span>
            </div>
        );
    };

    return (
        <div ref={headerRef} className={`${headerColors} pl-0.5 pr-1 py-0.5 flex justify-between items-center rounded-none relative`}>
            <div className="flex items-center gap-1 flex-1 min-w-0 mr-2">
                {onDisplayClick ? (
                    <button
                        type="button"
                        onClick={onDisplayClick}
                        className="p-0 bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-md shrink-0"
                    >
                        <SevenSegmentDisplay text={displayText} />
                    </button>
                ) : (
                    <SevenSegmentDisplay text={displayText} />
                )}

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center h-7">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-1 w-full max-w-[240px]">
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleSaveTitle}
                                    placeholder="Enter chat title..."
                                    className="w-full border rounded-md px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-coral/50 focus:border-brand-coral/50 transition-all"
                                    style={{
                                        backgroundColor: 'rgba(0,0,0,0.1)',
                                        borderColor: 'var(--aida-header-border)',
                                        color: 'var(--aida-header-text)'
                                    }}
                                />
                            </div>
                        ) : (
                            <button
                                onClick={handleStartEdit}
                                disabled={!isSessionActive}
                                className={`group flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 border max-w-full text-left aida-menu-item ${!isSessionActive ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                                style={{
                                    backgroundColor: isDefaultTitle ? 'rgba(0,0,0,0.1)' : 'transparent',
                                    borderColor: isDefaultTitle ? 'var(--aida-header-border)' : 'transparent',
                                    color: 'var(--aida-header-text)'
                                }}
                                title={isSessionActive ? "Click to rename" : "Start a chat to rename"}
                            >
                                <span className={`text-sm font-semibold truncate ${isDefaultTitle ? 'italic font-normal opacity-70' : ''}`}>
                                    {isDefaultTitle ? 'Set Chat Title...' : sessionTitle}
                                </span>
                                {isSessionActive && (
                                    <HiPencilSquare className={`w-3.5 h-3.5 shrink-0 transition-opacity ${isDefaultTitle ? 'opacity-50 group-hover:opacity-80' : 'opacity-0 group-hover:opacity-100'}`} />
                                )}
                            </button>
                        )}
                    </div>

                    {isSessionActive && (
                        <div className="relative flex items-center mt-1 ml-0.5 w-full" ref={tagMenuRef}>
                            <button
                                onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
                                className="flex items-center text-left rounded transition-colors w-full aida-menu-item"
                                title="Manage Tags"
                            >
                                {assignedProjects.length > 0 ? (
                                    <div className="w-full relative">
                                        <div ref={tagsContainerRef} className="flex items-center gap-1 w-full overflow-hidden">
                                            {visibleTags.map(p => renderTag(p))}
                                            {hiddenTagCount > 0 && (
                                                <div className="flex items-center justify-center px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 text-[10px] font-medium text-gray-400 shrink-0">
                                                    +{hiddenTagCount}
                                                </div>
                                            )}
                                        </div>
                                        <div ref={hiddenMeasureRef} className="flex items-center gap-1 absolute top-0 left-0 opacity-0 pointer-events-none invisible" aria-hidden="true">
                                            {assignedProjects.map(p => renderTag(p))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity px-1">
                                        <HiOutlineTag className="w-3 h-3" />
                                        <span className="text-[10px]">Add tag</span>
                                    </div>
                                )}
                            </button>

                            {isTagMenuOpen && (
                                <div 
                                    className="absolute top-full left-0 mt-2 w-64 rounded-lg text-sm shadow-xl border z-50 flex flex-col overflow-hidden"
                                    style={{ backgroundColor: 'var(--aida-header-bg)', borderColor: 'var(--aida-header-border)', color: 'var(--aida-header-text)' }}
                                >
                                    {editingProjectId ? (
                                        <ProjectIconPicker
                                            project={projects.find(p => p.id === editingProjectId)}
                                            onUpdate={onUpdateProjectAppearance}
                                            onBack={() => setEditingProjectId(null)}
                                            onClose={() => setEditingProjectId(null)}
                                            theme={theme}
                                        />
                                    ) : (
                                        <>
                                            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--aida-header-border)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                                <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Tags</span>
                                            </div>
                                            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                                                {projects.length === 0 && <div className="px-3 py-4 text-xs italic text-center opacity-60">No tags created yet</div>}
                                                {projects.map(project => {
                                                    const isSelected = project.chatIds.includes(currentSessionId);
                                                    const Icon = PROJECT_ICON_OPTIONS.find(opt => opt.key === project.iconKey)?.Icon || NotebookIcon;
                                                    const color = project.iconColor || DEFAULT_PROJECT_ICON_COLOR;
                                                    return (
                                                        <div key={project.id} className="flex items-center gap-1 group rounded pr-1 aida-menu-item">
                                                            <button onClick={() => handleToggleTag(project.id)} className="flex-1 px-2 py-1.5 text-left flex items-center gap-2 min-w-0">
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-brand-coral border-brand-coral' : 'border-gray-400 group-hover:border-gray-500'}`}>
                                                                    {isSelected && <HiCheck className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                                                                    <span className={`truncate text-xs ${isSelected ? 'font-medium' : ''}`}>{project.name}</span>
                                                                </div>
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingProjectId(project.id); }} className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all aida-menu-item" title="Customize Tag">
                                                                <HiOutlineCog6Tooth className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="p-2 border-t" style={{ borderColor: 'var(--aida-header-border)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        value={newTagDraft}
                                                        onChange={(e) => setNewTagDraft(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
                                                        placeholder="Create new tag..."
                                                        className="flex-1 border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-coral/50"
                                                        style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'var(--aida-header-border)', color: 'var(--aida-header-text)' }}
                                                    />
                                                    <button onClick={handleCreateTag} disabled={!newTagDraft.trim()} className="p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors aida-menu-item" title="Add Tag">
                                                        <HiPlus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!isNarrow && (
                    <div className="shrink-0 flex items-center gap-2 ml-auto">
                        <CreditsDisplay userId={userId} lastCost={lastCost} theme={theme} />
                        {paymentLinkConfig?.show && paymentLinkConfig?.url && (
                            <a href={paymentLinkConfig.url} target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-md transition-colors bg-white/10 hover:bg-white/20 text-white shadow-sm" title={paymentLinkConfig.text || 'Support Us'}>
                                <LuHandHeart className="w-4 h-4 text-brand-coral" />
                                {paymentLinkConfig.text}
                            </a>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-2 pr-1 shrink-0 ml-2 border-l border-white/10 pl-2">
                {showFullscreenToggle && typeof toggleFullscreen === 'function' && (
                    <button onClick={toggleFullscreen} className={`p-1 rounded-full ${hoverColor} transition-colors`} style={{ color: accentColor }} title="Toggle fullscreen">
                        <HiOutlineArrowsPointingOut className="w-5 h-5" />
                    </button>
                )}
                <button onClick={toggleChat} className={`p-1 rounded-full ${hoverColor}`} aria-label="Minimize Chat">
                    <HiMinusSmall className="w-5 h-5" />
                </button>
                {isMobileViewport && (
                    <button onClick={resetChat} className={`p-1 rounded-full ${hoverColor}`} title="New chat">
                        <HiPlus className="w-5 h-5" />
                    </button>
                )}
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(p => !p)} className={`p-1 rounded-full ${hoverColor}`} aria-haspopup="menu" aria-expanded={isMenuOpen}>
                        <HiEllipsisVertical className="w-5 h-5" />
                    </button>
                    {isMenuOpen && (
                        <div 
                            className="absolute right-0 mt-2 w-40 rounded-lg text-sm shadow-lg border py-1 z-50"
                            style={{ backgroundColor: 'var(--aida-header-bg)', borderColor: 'var(--aida-header-border)', color: 'var(--aida-header-text)' }}
                        >
                            {!isMobileViewport && (
                                <button onClick={() => { resetChat(); closeMenu(); }} className="w-full px-3 py-2 text-left flex items-center gap-2 aida-menu-item">
                                    <HiPlus className="w-4 h-4" />
                                    <span>New chat</span>
                                </button>
                            )}
                            {onShare && (
                                <button onClick={() => { onShare(); closeMenu(); }} className="w-full px-3 py-2 text-left flex items-center gap-2 aida-menu-item">
                                    <HiOutlineShare className="w-4 h-4" />
                                    <span>Share</span>
                                </button>
                            )}
                            {onToggleHistory && (
                                <button onClick={() => { onToggleHistory(); closeMenu(); }} className="w-full px-3 py-2 text-left flex items-center gap-2 aida-menu-item">
                                    <HiClock className="w-4 h-4" />
                                    <span>Chat history</span>
                                </button>
                            )}
                            {onOpenAppearance && (
                                <button onClick={() => { onOpenAppearance(); closeMenu(); }} className="w-full px-3 py-2 text-left flex items-center gap-2 aida-menu-item">
                                    <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />
                                    <span>Appearance</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatHeader;