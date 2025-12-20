/* src/AidaWidget/ChatHeader.jsx */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    HiPlus, HiOutlineSun, HiOutlineMoon, HiClock, HiEllipsisVertical, 
    HiMinusSmall, HiOutlineArrowsPointingOut, HiPencilSquare, HiCheck, 
    HiOutlineTag, HiOutlineCog6Tooth 
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
    onToggleTheme,
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
    onUpdateProjectAppearance
}) => {
    const headerColors = 'bg-[#0f172a] text-white backdrop-blur-md border-b border-white/10';
    const hoverColor = theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-200/70';
    const accentColor = '#ffffff';
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const headerRef = useRef(null);
    const [isNarrow, setIsNarrow] = useState(false);

    // Title Editing
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(sessionTitle);
    const titleInputRef = useRef(null);

    // Tag Menu
    const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
    const tagMenuRef = useRef(null);
    const [newTagDraft, setNewTagDraft] = useState('');
    const [editingProjectId, setEditingProjectId] = useState(null);

    // Check if the title is the default one
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

    // When editing starts, focus the input
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            // Only select text if it's NOT the default "New Chat"
            if (!isDefaultTitle) {
                titleInputRef.current.select();
            }
        }
    }, [isEditingTitle, isDefaultTitle]);

    const closeMenu = () => setIsMenuOpen(false);

    const handleStartEdit = () => {
        if (!isSessionActive) return;
        // If it's the default title, clear the draft so the placeholder shows
        if (isDefaultTitle) {
            setTitleDraft('');
        } else {
            setTitleDraft(sessionTitle);
        }
        setIsEditingTitle(true);
    };

    const handleSaveTitle = () => {
        if (titleDraft.trim() && onRenameSession) {
            onRenameSession(titleDraft.trim());
        } else {
            // If empty, revert to props (which usually defaults to New Chat in parent)
            // or explicitly set it here if parent doesn't handle empty string
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
        if (newProjectId) {
            setNewTagDraft('');
        }
    };

    const assignedProjects = useMemo(() => {
        if (!currentSessionId) return [];
        return projects.filter(p => p.chatIds.includes(currentSessionId));
    }, [projects, currentSessionId]);

    return (
        <div ref={headerRef} className={`${headerColors} glass-header pl-2 pr-1 py-2 flex justify-between items-center rounded-none relative`}>
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                {/* LCD Display */}
                {onDisplayClick ? (
                    <button type="button" onClick={onDisplayClick} className="p-0 bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-md shrink-0">
                        <SevenSegmentDisplay text={displayText} />
                    </button>
                ) : (
                    <SevenSegmentDisplay text={displayText} />
                )}

                {/* Title and Tags Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {/* Title Row */}
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
                                    className="w-full bg-black/40 border border-white/20 rounded-md px-0.5 py-0.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-coral/50 focus:border-brand-coral/50 transition-all"
                                />
                            </div>
                        ) : (
                            <button 
                                onClick={handleStartEdit}
                                disabled={!isSessionActive}
                                className={`
                                    group flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 border max-w-full text-left
                                    ${isDefaultTitle 
                                        ? 'bg-black/20 border-white/5 text-gray-400 hover:bg-black/40 hover:text-gray-200 hover:border-white/10' 
                                        : 'bg-transparent border-transparent hover:bg-white/5 text-white'
                                    }
                                    ${!isSessionActive ? 'opacity-50 cursor-default' : 'cursor-pointer'}
                                `}
                                title={isSessionActive ? "Click to rename" : "Start a chat to rename"}
                            >
                                <span className={`text-sm font-semibold truncate ${isDefaultTitle ? 'italic font-normal' : ''}`}>
                                    {isDefaultTitle ? 'Set Chat Title...' : sessionTitle}
                                </span>
                                {isSessionActive && (
                                    <HiPencilSquare className={`w-3.5 h-3.5 shrink-0 transition-opacity ${isDefaultTitle ? 'text-gray-500 group-hover:text-gray-300' : 'text-gray-500 opacity-0 group-hover:opacity-100'}`} />
                                )}
                            </button>
                        )}
                    </div>

                    {/* Tags Row (Below Title) */}
                    {isSessionActive && (
                        <div className="relative flex items-center mt-1 ml-0.5" ref={tagMenuRef}>
                            <button
                                onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
                                className={`flex items-center text-left rounded transition-colors ${isTagMenuOpen ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                title="Manage Tags"
                            >
                                {assignedProjects.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {assignedProjects.map(p => {
                                            const Icon = PROJECT_ICON_OPTIONS.find(opt => opt.key === p.iconKey)?.Icon || NotebookIcon;
                                            const color = p.iconColor || DEFAULT_PROJECT_ICON_COLOR;
                                            const bg = hexToRgba(color, 0.15);
                                            
                                            return (
                                                <div 
                                                    key={p.id} 
                                                    className="flex items-center gap-0.5 px-1 py-0.5 rounded-md border border-white/5"
                                                    style={{ backgroundColor: bg, borderColor: hexToRgba(color, 0.3) }}
                                                >
                                                    <Icon className="w-3 h-3" style={{ color: color }} />
                                                    <span className="text-[10px] font-medium leading-none" style={{ color: color }}>
                                                        {p.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-gray-500 hover:text-gray-400 transition-colors px-1">
                                        <HiOutlineTag className="w-3 h-3" />
                                        <span className="text-[10px]">Add tag</span>
                                    </div>
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            {isTagMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 rounded-lg bg-slate-800/95 text-sm shadow-xl border border-white/10 z-50 flex flex-col overflow-hidden">
                                    {editingProjectId ? (
                                        <ProjectIconPicker 
                                            project={projects.find(p => p.id === editingProjectId)}
                                            onUpdate={onUpdateProjectAppearance}
                                            onBack={() => setEditingProjectId(null)}
                                            onClose={() => setEditingProjectId(null)}
                                            theme="dark"
                                        />
                                    ) : (
                                        <>
                                            <div className="px-3 py-2 border-b border-white/10 bg-slate-900/50">
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</span>
                                            </div>
                                            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                                                {projects.length === 0 && (
                                                    <div className="px-3 py-4 text-xs text-gray-500 italic text-center">No tags created yet</div>
                                                )}
                                                {projects.map(project => {
                                                    const isSelected = project.chatIds.includes(currentSessionId);
                                                    const Icon = PROJECT_ICON_OPTIONS.find(opt => opt.key === project.iconKey)?.Icon || NotebookIcon;
                                                    const color = project.iconColor || DEFAULT_PROJECT_ICON_COLOR;
                                                    
                                                    return (
                                                        <div key={project.id} className="flex items-center gap-1 group rounded hover:bg-white/5 pr-1">
                                                            <button
                                                                onClick={() => handleToggleTag(project.id)}
                                                                className="flex-1 px-2 py-1.5 text-left flex items-center gap-2 min-w-0"
                                                            >
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-brand-coral border-brand-coral' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                                                    {isSelected && <HiCheck className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                                                                    <span className={`truncate text-xs ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>{project.name}</span>
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingProjectId(project.id); }}
                                                                className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                                                                title="Customize Tag"
                                                            >
                                                                <HiOutlineCog6Tooth className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="p-2 border-t border-white/10 bg-slate-900/30">
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        value={newTagDraft}
                                                        onChange={(e) => setNewTagDraft(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
                                                        placeholder="Create new tag..."
                                                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-coral/50 placeholder-gray-500"
                                                    />
                                                    <button
                                                        onClick={handleCreateTag}
                                                        disabled={!newTagDraft.trim()}
                                                        className="p-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
                                                        title="Add Tag"
                                                    >
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
                            <a
                                href={paymentLinkConfig.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-md transition-colors bg-white/10 hover:bg-white/20 text-white shadow-sm"
                                title={paymentLinkConfig.text || 'Support Us'}
                            >
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
                    <button onClick={() => setIsMenuOpen((open) => !open)} className={`p-1 rounded-full ${hoverColor}`} aria-haspopup="menu" aria-expanded={isMenuOpen}>
                        <HiEllipsisVertical className="w-5 h-5" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-40 rounded-lg bg-slate-800/95 text-sm shadow-lg border border-white/10 py-1 z-50">
                                {!isMobileViewport && (
                                    <button onClick={() => { resetChat(); closeMenu(); }} className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2">
                                        <HiPlus className="w-4 h-4" /> <span>New chat</span>
                                    </button>
                                )}
                                {onToggleHistory && (
                                    <button onClick={() => { onToggleHistory(); closeMenu(); }} className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2">
                                        <HiClock className="w-4 h-4" /> <span>Chat history</span>
                                    </button>
                                )}
                                {onToggleTheme && (
                                    <button onClick={() => { onToggleTheme(); closeMenu(); }} className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2">
                                        {theme === 'dark' ? <HiOutlineMoon className="w-4 h-4" /> : <HiOutlineSun className="w-4 h-4" />} <span>Toggle theme</span>
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