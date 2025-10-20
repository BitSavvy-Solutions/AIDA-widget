import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  HiPencilSquare,
  HiCheck,
  HiXMark,
  HiOutlineFolder,
  HiOutlineBanknotes,
  HiOutlineAcademicCap,
  HiOutlinePencilSquare,
  HiOutlineCodeBracketSquare,
  HiOutlinePhoto,
  HiOutlineMusicalNote,
  HiOutlineTrash,
  HiOutlineSparkles,
  HiOutlineLightBulb,
  HiOutlineBeaker,
  HiOutlineHeart,
  HiOutlineBriefcase,
  HiOutlineGlobeAlt,
  HiOutlineShieldCheck,
  HiOutlineChatBubbleOvalLeft,
  HiOutlineBolt,
  HiOutlineChartBar,
  HiOutlineRocketLaunch,
  HiOutlineWrenchScrewdriver,
  HiOutlineEnvelope,
  HiOutlineCircleStack,
  HiOutlineBuildingOffice,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';
import { LuDumbbell, LuStethoscope, LuPawPrint } from 'react-icons/lu';

const NotebookIcon = ({ className = '' }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="3" width="15" height="18" rx="2" ry="2" />
    <path d="M8 3v18" />
    <path d="M11 7h4" />
    <path d="M11 11h4" />
  </svg>
);

const createLucideIcon = (IconComponent) => ({ className = '' }) => (
  <IconComponent className={className} strokeWidth={1.6} />
);

const DumbbellIcon = createLucideIcon(LuDumbbell);
const StethoscopeIcon = createLucideIcon(LuStethoscope);
const PawPrintIcon = createLucideIcon(LuPawPrint);

const DEFAULT_PROJECT_ICON_COLOR = '#9CA3AF';

const PROJECT_COLOR_OPTIONS = [
  { value: DEFAULT_PROJECT_ICON_COLOR, label: 'Neutral' },
  { value: '#F87171', label: 'Red' },
  { value: '#FB923C', label: 'Orange' },
  { value: '#FACC15', label: 'Yellow' },
  { value: '#34D399', label: 'Green' },
  { value: '#38BDF8', label: 'Sky' },
  { value: '#818CF8', label: 'Indigo' },
  { value: '#F472B6', label: 'Pink' },
  {
    value: '#FBCFE8',
    label: 'Glitter',
    previewStyle: {
      backgroundImage: `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7) 0, rgba(255,255,255,0) 40%), radial-gradient(circle at 75% 35%, rgba(255,255,255,0.6) 0, rgba(255,255,255,0) 45%), radial-gradient(circle at 40% 75%, rgba(255,255,255,0.65) 0, rgba(255,255,255,0) 40%), linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0))`,
      backgroundSize: '120% 120%',
      backgroundPosition: 'center',
    },
  },
];

const PROJECT_ICON_OPTIONS = [
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

const ICON_MENU_PALETTE = {
  dark: {
    background: '#101a2d',
    border: '#1d2a45',
    shadow: '0 28px 52px rgba(8, 12, 24, 0.75)',
    text: '#f0f5ff',
    mutedText: '#7e8dad',
    headerBorder: '#1d2a45',
    headerBackground: '#101a2d',
    chipRing: '#9d4edd',
    chipRingSoft: 'rgba(157, 78, 221, 0.38)',
    chipShadow: '0 10px 20px rgba(8, 12, 24, 0.55)',
    iconButtonBg: '#16223a',
    iconButtonBorder: '#21304d',
    iconButtonHover: '#253655',
    iconButtonText: '#cad5f0',
    iconButtonSelectedBg: '#2a1d3d',
    iconButtonSelectedBorder: '#b984ff',
    iconButtonSelectedText: '#f6ecff',
    doneBg: '#6b1f7f',
    doneHover: '#812895',
    doneText: '#fef3ff',
    divider: '#202d49',
    footerBackground: '#10112a',
  },
  light: {
    background: '#ffffff',
    border: '#d5ddf1',
    shadow: '0 24px 48px rgba(15, 23, 42, 0.15)',
    text: '#151b2f',
    mutedText: '#657091',
    headerBorder: '#d5ddf1',
    headerBackground: '#ffffff',
    chipRing: '#7c3aed',
    chipRingSoft: 'rgba(124, 58, 237, 0.25)',
    chipShadow: '0 10px 18px rgba(15, 23, 42, 0.12)',
    iconButtonBg: '#f3f5fb',
    iconButtonBorder: '#d5ddf1',
    iconButtonHover: '#e6eaf5',
    iconButtonText: '#3b4662',
    iconButtonSelectedBg: '#e4d7ff',
    iconButtonSelectedBorder: '#7c3aed',
    iconButtonSelectedText: '#2f1f4a',
    doneBg: '#7c3aed',
    doneHover: '#6d28d9',
    doneText: '#f7f5ff',
    divider: '#d5ddf1',
    footerBackground: '#f7f8fd',
  },
};

const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(255, 255, 255, ${alpha})`;
  const normalized = hex.replace('#', '');
  const length = normalized.length;

  const parse = (start) => {
    const chunk = normalized.slice(start, start + (length === 3 ? 1 : 2));
    const value = parseInt(chunk, 16);
    return length === 3 ? value * 17 : value;
  };

  const r = parse(0);
  const g = parse(length === 3 ? 1 : 2);
  const b = parse(length === 3 ? 2 : 4);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createDefaultIconMenuPosition = () => ({
  top: null,
  left: null,
  width: null,
  placement: 'bottom',
});

const ChatHistoryPanel = ({
  theme = 'dark',
  open = false,
  onClose,
  sessions = [],
  projects = [],
  onSelect,
  onDelete,
  onShare,
  onRename,
  onRenameProject,
  onCreateProject,
  onAssignChatToProject,
  onRemoveChatFromProject,
  onDeleteProject,
  onUpdateProjectAppearance,
}) => {
  const isDark = theme === 'dark';
  const [query, setQuery] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectDraft, setProjectDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [expandedProjectIds, setExpandedProjectIds] = useState(() => new Set());
  const [projectEditId, setProjectEditId] = useState(null);
  const [projectEditDraft, setProjectEditDraft] = useState('');
  const editInputRef = useRef(null);
  const newProjectInputRef = useRef(null);
  const projectEditInputRef = useRef(null);
  const [draggingChatId, setDraggingChatId] = useState(null);
  const [draggingOverProjectId, setDraggingOverProjectId] = useState(null);
  const [iconMenuProjectId, setIconMenuProjectId] = useState(null);
  const iconMenuRef = useRef(null);
  const iconAnchorRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const projectCardRefs = useRef(new Map());
  const [iconMenuPosition, setIconMenuPosition] = useState(createDefaultIconMenuPosition);
  const portalContainer = typeof document !== 'undefined' ? document.body : null;
  const iconMenuPalette = useMemo(
    () => ICON_MENU_PALETTE[isDark ? 'dark' : 'light'],
    [isDark]
  );
  const [isMobileView, setIsMobileView] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth < 640 : false)
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resetIconMenuPosition = useCallback(
    () => setIconMenuPosition(createDefaultIconMenuPosition()),
    []
  );

  const tokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );

  const isMatch = useMemo(
    () => (session) => {
      if (tokens.length === 0) return false;
      const hay = `${session.title || ''} ${(session.messages || [])
        .map((m) => m.text || '')
        .join(' ')}`.toLowerCase();
      return tokens.every((token) => hay.includes(token));
    },
    [tokens]
  );

  const sessionMap = useMemo(() => {
    const map = Object.create(null);
    (sessions || []).forEach((session) => {
      map[session.id] = session;
    });
    return map;
  }, [sessions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!editingId) return;
    editInputRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    if (projectEditId) {
      projectEditInputRef.current?.focus();
    }
  }, [projectEditId]);

  useEffect(() => {
    if (!open && editingId) {
      setEditingId(null);
      setTitleDraft('');
    }
    if (!open) {
      setIsCreatingProject(false);
      setProjectDraft('');
      setDraggingChatId(null);
      setDraggingOverProjectId(null);
    }
  }, [open, editingId]);

  useEffect(() => {
    if (isCreatingProject) {
      newProjectInputRef.current?.focus();
    }
  }, [isCreatingProject]);

  useEffect(() => {
    if (!iconMenuProjectId) return;
    const handleClick = (event) => {
      if (!iconMenuRef.current) return;
      if (!iconMenuRef.current.contains(event.target)) {
        setIconMenuProjectId(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIconMenuProjectId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [iconMenuProjectId]);

  useEffect(() => {
    if (!open && iconMenuProjectId) {
      setIconMenuProjectId(null);
    }
  }, [open, iconMenuProjectId]);

  useEffect(() => {
    if (!iconMenuProjectId) {
      iconAnchorRef.current = null;
      resetIconMenuPosition();
    }
  }, [iconMenuProjectId, resetIconMenuPosition]);

  useLayoutEffect(() => {
    if (!iconMenuProjectId || !iconAnchorRef.current || !iconMenuRef.current) {
      return;
    }

    const updatePosition = () => {
      const anchorEl = iconAnchorRef.current;
      const menuEl = iconMenuRef.current;
      if (!anchorEl || !menuEl) return;

      const viewportWidth = window.innerWidth;
      if (viewportWidth < 640) {
        menuEl.style.width = '';
        menuEl.style.maxHeight = '';
        resetIconMenuPosition();
        return;
      }

      const viewportHeight = window.innerHeight;
      const projectCardEl = projectCardRefs.current.get(iconMenuProjectId) || null;
      const projectRect = projectCardEl?.getBoundingClientRect();
      const anchorRect = anchorEl.getBoundingClientRect();
      const scrollRect = scrollContainerRef.current?.getBoundingClientRect();
      const gutter = 14;

      const containerTop = scrollRect ? scrollRect.top + 4 : gutter;
      const containerBottom = scrollRect ? scrollRect.bottom - 12 : viewportHeight - gutter;
      const containerLeft = scrollRect ? scrollRect.left + 2 : gutter;
      const containerRight = scrollRect ? scrollRect.right - 2 : viewportWidth - gutter;
      const maxWidth = Math.max(0, (scrollRect?.width ?? viewportWidth) - gutter * 2);

      let desiredWidth = projectRect ? Math.min(projectRect.width, maxWidth) : maxWidth || null;
      if (Number.isFinite(desiredWidth) && desiredWidth > 0) {
        menuEl.style.width = `${desiredWidth}px`;
      } else {
        desiredWidth = null;
        menuEl.style.width = '';
      }

      if (scrollRect) {
        const availableHeight = Math.max(160, containerBottom - containerTop);
        menuEl.style.maxHeight = `${availableHeight}px`;
      } else {
        menuEl.style.maxHeight = '';
      }

      const menuRect = menuEl.getBoundingClientRect();
      const referenceRect = projectRect || anchorRect;

      let top = referenceRect.top;
      const maxTop = Math.max(containerTop, containerBottom - menuRect.height);
      if (top > maxTop) top = maxTop;
      if (top < containerTop) top = containerTop;

      let left = projectRect
        ? projectRect.left
        : anchorRect.left + anchorRect.width / 2 - menuRect.width / 2;
      const minLeft = containerLeft;
      const maxLeft = Math.max(minLeft, containerRight - menuRect.width);
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = maxLeft;

      setIconMenuPosition((prev) => {
        if (
          prev.top === top &&
          prev.left === left &&
          prev.width === desiredWidth &&
          prev.placement === 'aligned'
        ) {
          return prev;
        }
        return {
          top,
          left,
          width: desiredWidth,
          placement: 'aligned',
        };
      });
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePosition);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updatePosition);
      }
    };
  }, [iconMenuProjectId, resetIconMenuPosition]);

  const startEditing = (session) => {
    setEditingId(session.id);
    setTitleDraft(session.title || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTitleDraft('');
  };

  const saveEditing = () => {
    if (!editingId || !onRename) {
      cancelEditing();
      return;
    }
    onRename(editingId, titleDraft);
    cancelEditing();
  };

  const handleProjectSave = () => {
    if (!onCreateProject) {
      setIsCreatingProject(false);
      setProjectDraft('');
      return;
    }
    const trimmed = (projectDraft || '').trim();
    if (!trimmed) return;
    const success = onCreateProject(trimmed);
    if (success) {
      setIsCreatingProject(false);
      setProjectDraft('');
    }
  };

  const handleProjectCancel = () => {
    setIsCreatingProject(false);
    setProjectDraft('');
  };

  const handleProjectDrop = (event, projectId) => {
    event.preventDefault();
    setDraggingOverProjectId(null);
    const chatId =
      event.dataTransfer.getData('application/chat-id') ||
      event.dataTransfer.getData('text/plain');
    if (chatId && onAssignChatToProject) {
      onAssignChatToProject(projectId, chatId);
    }
    setDraggingChatId(null);
  };

  const handleProjectDragOver = (event, projectId) => {
    if (!draggingChatId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDraggingOverProjectId(projectId);
  };

  const handleProjectDragLeave = (projectId) => {
    if (draggingOverProjectId === projectId) {
      setDraggingOverProjectId(null);
    }
  };

  const toggleProjectExpansion = (projectId) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const startProjectEdit = (project) => {
    setProjectEditId(project.id);
    setProjectEditDraft(project.name || '');
  };

  const cancelProjectEdit = () => {
    setProjectEditId(null);
    setProjectEditDraft('');
  };

  const saveProjectEdit = () => {
    if (!projectEditId) {
      cancelProjectEdit();
      return;
    }
    const renameHandler = onRenameProject || onRename;
    if (!renameHandler) {
      cancelProjectEdit();
      return;
    }
    renameHandler(projectEditId, projectEditDraft);
    cancelProjectEdit();
  };

  const projectsList = Array.isArray(projects) ? projects : [];

  const assignedChatIds = useMemo(() => {
    const ids = new Set();
    (projects || []).forEach((project) => {
      (project.chatIds || []).forEach((id) => ids.add(id));
    });
    return ids;
  }, [projects]);

  const unassignedSessions = useMemo(
    () => (sessions || []).filter((session) => !assignedChatIds.has(session.id)),
    [sessions, assignedChatIds]
  );

  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${
          open ? 'opacity-40 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } ${isDark ? 'bg-black' : 'bg-black'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 bottom-0 w-64 sm:w-72 transform transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        } ${isDark ? 'bg-gray-900 text-gray-100 border-l border-gray-800' : 'bg-white text-gray-900 border-l border-gray-200'
        } shadow-xl pointer-events-auto flex flex-col`}
      >
        <div
          className={`px-3 py-2 border-b ${
            isDark ? 'border-gray-700/40' : 'border-gray-200/60'
          } shrink-0`}
        >
          <div className="relative flex items-center justify-center">
            <h3 className="text-sm font-semibold flex-1 text-center">Notebook History</h3>
            <button
              onClick={onClose}
              className={`absolute right-0 p-1 rounded ${
                isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
              aria-label="Close history"
            >
              ✕
            </button>
          </div>
          <div className="mt-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles and content..."
              className={`w-full text-sm px-2 py-1 rounded border outline-none ${
                isDark
                  ? 'bg-gray-800 border-gray-700 placeholder-gray-400 text-gray-100'
                  : 'bg-white border-gray-300 placeholder-gray-400 text-gray-900'
              }`}
              aria-label="Search chat history"
            />
          </div>
        </div>
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-3"
        >
          <div className={`sticky top-0 z-10 pb-3 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="space-y-2">
              {isCreatingProject ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={newProjectInputRef}
                    value={projectDraft}
                    onChange={(event) => setProjectDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleProjectSave();
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        handleProjectCancel();
                      }
                    }}
                    className={`flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="Project name"
                  />
                  <button
                    type="button"
                    onClick={handleProjectCancel}
                    className={`shrink-0 p-1.5 rounded-md border ${
                      isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="Cancel new project"
                    title="Cancel"
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleProjectSave}
                    className={`shrink-0 p-1.5 rounded-md border ${
                      isDark ? 'border-blue-500/40 text-blue-300 hover:bg-blue-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-100'
                    }`}
                    aria-label="Save new project"
                    title="Save"
                    disabled={!projectDraft.trim()}
                  >
                    <HiCheck className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onCreateProject) {
                      setIsCreatingProject(true);
                      setProjectDraft('');
                    }
                  }}
                  className={`w-full flex items-center gap-2 justify-center text-sm font-medium px-3 py-2 rounded-md border ${
                    isDark ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <NotebookIcon className="w-4 h-4" />
                    <span className="text-lg leading-none">+</span>
                  </div>
                  New Project
                </button>
              )}
              {projectsList.length > 0 && (
                <div className="space-y-2 pt-1">
                  {projectsList.map((project) => {
                    const assignedChats = (project.chatIds || [])
                      .map((id) => sessionMap[id])
                      .filter(Boolean);
                    const isActiveDrop = draggingOverProjectId === project.id;
                    const isExpanded = expandedProjectIds.has(project.id);
                    const isEditingProject = projectEditId === project.id;
                    const effectiveExpanded = isEditingProject || isExpanded;
                    const matchedAssignedChats = assignedChats.filter(isMatch);
                    const projectMatchesQuery = matchedAssignedChats.length > 0;
                    const projectRingClass = isActiveDrop
                      ? isDark
                        ? 'ring-2 ring-blue-400'
                        : 'ring-2 ring-blue-500'
                      : projectMatchesQuery
                        ? 'ring-2 ring-amber-400'
                        : '';
                    const iconColor = project.iconColor || DEFAULT_PROJECT_ICON_COLOR;
                    const iconDefinition =
                      PROJECT_ICON_OPTIONS.find((option) => option.key === project.iconKey) ||
                      PROJECT_ICON_OPTIONS[0];
                    const IconComponent = iconDefinition.Icon || NotebookIcon;
                    const isIconMenuOpen = iconMenuProjectId === project.id;
                    const isDesktopMenuPositioned =
                      iconMenuPosition.top !== null && iconMenuPosition.left !== null;
                    const iconBackground = hexToRgba(iconColor, isDark ? 0.25 : 0.15);
                    const iconBorderColor = hexToRgba(iconColor, isDark ? 0.45 : 0.35);
                    let iconMenuContent = null;

                    if (isIconMenuOpen) {
                      const hasDesktopPosition =
                        iconMenuPosition.top !== null && iconMenuPosition.left !== null;
                      const positionalStyle = hasDesktopPosition
                        ? {
                            top: iconMenuPosition.top,
                            left: iconMenuPosition.left,
                            width: iconMenuPosition.width ?? undefined,
                          }
                        : {};
                      const mobileStyle = isMobileView
                        ? {
                            top: 'auto',
                            right: 'auto',
                            bottom: '1.5rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 'min(360px, calc(100vw - 2.5rem))',
                            maxHeight: 'calc(100vh - 4.5rem)',
                          }
                        : {};
                      const containerClassName = [
                        'fixed',
                        'z-[60]',
                        'pointer-events-auto',
                        'rounded-2xl',
                        'border',
                        'overflow-x-hidden',
                        'overflow-y-auto',
                        isMobileView ? 'inset-x-auto' : 'sm:fixed sm:inset-auto sm:bottom-auto',
                        'sm:max-h-[70vh]',
                        !isDesktopMenuPositioned ? 'sm:invisible sm:pointer-events-none' : '',
                        isDark ? 'text-slate-100' : 'text-slate-900',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      iconMenuContent = (
                        <div
                          ref={iconMenuRef}
                          data-placement={iconMenuPosition.placement}
                          className={containerClassName}
                          style={{
                            ...(!isMobileView ? positionalStyle : {}),
                            ...(isMobileView ? mobileStyle : {}),
                            backgroundColor: iconMenuPalette.background,
                            borderColor: iconMenuPalette.border,
                            color: iconMenuPalette.text,
                            boxShadow: iconMenuPalette.shadow,
                          }}
                          role="dialog"
                          aria-label="Choose project icon"
                        >
                          <div
                            className="px-4 py-3 border-b text-sm font-semibold tracking-tight"
                            style={{
                              borderColor: iconMenuPalette.headerBorder,
                              backgroundColor: iconMenuPalette.headerBackground,
                            }}
                          >
                            Choose icon
                          </div>
                          <div className="px-3 py-3 space-y-3">
                            <div className="space-y-1.5">
                              <span
                                className="text-[10px] uppercase tracking-[0.28em] font-semibold"
                                style={{ color: iconMenuPalette.mutedText }}
                              >
                                Colour
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {PROJECT_COLOR_OPTIONS.map((option) => {
                                  const isSelectedColour =
                                    (project.iconColor || DEFAULT_PROJECT_ICON_COLOR) ===
                                    option.value;
                                  const buttonStyle = {
                                    backgroundColor: option.value,
                                    borderColor: isSelectedColour
                                      ? iconMenuPalette.chipRing
                                      : 'transparent',
                                    boxShadow: isSelectedColour
                                      ? `0 0 0 2px ${iconMenuPalette.chipRingSoft}`
                                      : iconMenuPalette.chipShadow,
                                    transition: 'transform 150ms ease, box-shadow 150ms ease',
                                    ...(option.previewStyle || {}),
                                  };
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() =>
                                        onUpdateProjectAppearance?.(project.id, {
                                          iconColor: option.value,
                                        })
                                      }
                                      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform duration-150 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
                                        isDark
                                          ? 'focus-visible:ring-purple-400'
                                          : 'focus-visible:ring-purple-500'
                                      }`}
                                      style={buttonStyle}
                                      aria-pressed={isSelectedColour}
                                      aria-label={`Choose ${option.label.toLowerCase()} colour`}
                                    >
                                      <span className="sr-only">{option.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <span
                                className="text-[10px] uppercase tracking-[0.28em] font-semibold"
                                style={{ color: iconMenuPalette.mutedText }}
                              >
                                Icon
                              </span>
                              <div className="grid grid-cols-6 gap-1.5">
                                {PROJECT_ICON_OPTIONS.map((option) => {
                                  const OptionIcon = option.Icon || NotebookIcon;
                                  const isSelectedIcon =
                                    (project.iconKey || 'notebook') === option.key;
                                  const buttonStyle = isSelectedIcon
                                    ? {
                                        backgroundColor: iconMenuPalette.iconButtonSelectedBg,
                                        borderColor: iconMenuPalette.iconButtonSelectedBorder,
                                        color: iconMenuPalette.iconButtonSelectedText,
                                        boxShadow: `0 0 0 1px ${iconMenuPalette.iconButtonSelectedBorder}`,
                                        transition: 'transform 150ms ease, box-shadow 150ms ease',
                                      }
                                    : {
                                        backgroundColor: iconMenuPalette.iconButtonBg,
                                        borderColor: iconMenuPalette.iconButtonBorder,
                                        color: iconMenuPalette.iconButtonText,
                                        boxShadow: 'none',
                                        transition: 'transform 150ms ease, box-shadow 150ms ease',
                                      };
                                  return (
                                    <button
                                      key={option.key}
                                      type="button"
                                      onClick={() =>
                                        onUpdateProjectAppearance?.(project.id, {
                                          iconKey: option.key,
                                        })
                                      }
                                      className={`h-8 w-8 rounded-lg border flex items-center justify-center text-base transition-transform duration-150 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
                                        isDark
                                          ? 'hover:brightness-110 focus-visible:ring-purple-400'
                                          : 'hover:brightness-105 focus-visible:ring-purple-500'
                                      }`}
                                      style={buttonStyle}
                                      aria-pressed={isSelectedIcon}
                                      aria-label={`Use ${option.label} icon`}
                                    >
                                      <OptionIcon className="w-5 h-5" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div
                            className="px-4 py-3 border-t"
                            style={{
                              borderColor: iconMenuPalette.divider,
                              backgroundColor: iconMenuPalette.footerBackground,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setIconMenuProjectId(null)}
                              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
                                isDark
                                  ? 'focus-visible:ring-purple-400 hover:translate-y-[0.5px]'
                                  : 'focus-visible:ring-purple-500 hover:translate-y-[0.5px]'
                              }`}
                              style={{
                                backgroundColor: iconMenuPalette.doneBg,
                                color: iconMenuPalette.doneText,
                                boxShadow: '0 12px 28px rgba(18, 20, 35, 0.35)',
                                transition:
                                  'background-color 160ms ease, transform 160ms ease, box-shadow 160ms ease',
                              }}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={project.id}
                        ref={(element) => {
                          if (element) {
                            projectCardRefs.current.set(project.id, element);
                          } else {
                            projectCardRefs.current.delete(project.id);
                          }
                        }}
                        onDragOver={(event) => handleProjectDragOver(event, project.id)}
                        onDragLeave={() => handleProjectDragLeave(project.id)}
                        onDrop={(event) => handleProjectDrop(event, project.id)}
                        className={`rounded-lg border px-3 py-2 transition ${
                          isDark ? 'border-gray-800 bg-gray-900/70' : 'border-gray-200 bg-white'
                        } ${projectRingClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0 flex items-center gap-2 text-sm font-medium">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const buttonEl = event.currentTarget;
                                  setIconMenuProjectId((prev) => {
                                    const next = prev === project.id ? null : project.id;
                                    iconAnchorRef.current = next ? buttonEl : null;
                                    return next;
                                  });
                                }}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                  isDark
                                    ? 'focus-visible:ring-pink-400 focus-visible:ring-offset-gray-900 hover:bg-gray-800/60'
                                    : 'focus-visible:ring-pink-500 focus-visible:ring-offset-white hover:bg-gray-100/60'
                                }`}
                                style={{
                                  color: iconColor,
                                  backgroundColor: iconBackground,
                                  borderColor: iconBorderColor,
                                }}
                                aria-haspopup="dialog"
                                aria-expanded={isIconMenuOpen}
                                aria-label="Choose project icon"
                              >
                                <IconComponent className="w-4 h-4" />
                              </button>
                              {iconMenuContent &&
                                (portalContainer
                                  ? createPortal(iconMenuContent, portalContainer)
                                  : iconMenuContent)}
                            </div>
                            {isEditingProject ? (
                              <>
                                <input
                                  ref={projectEditInputRef}
                                  value={projectEditDraft}
                                  onChange={(event) => setProjectEditDraft(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      saveProjectEdit();
                                    } else if (event.key === 'Escape') {
                                      event.preventDefault();
                                      cancelProjectEdit();
                                    }
                                  }}
                                  className={`flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none ${
                                    isDark
                                      ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
                                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={saveProjectEdit}
                                  className={`p-1.5 rounded-md border ${
                                    isDark
                                      ? 'border-blue-500/40 text-blue-300 hover:bg-blue-500/10'
                                      : 'border-blue-300 text-blue-600 hover:bg-blue-100'
                                  }`}
                                  aria-label="Save project name"
                                  title="Save"
                                >
                                  <HiCheck className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span>{project.name}</span>
                            )}
                          </div>
                          {!isEditingProject && (
                            <div className="flex items-center gap-1">
                              {assignedChats.length > 0 && (
                                <span className="text-[11px] opacity-60">
                                  {assignedChats.length} chat
                                  {assignedChats.length > 1 ? 's' : ''}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleProjectExpansion(project.id)}
                                className={`p-1 rounded ${
                                  isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                                }`}
                                aria-label={isExpanded ? 'Collapse project' : 'Expand project'}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`w-4 h-4 transition-transform ${
                                    isExpanded ? 'rotate-90' : 'rotate-0'
                                  }`}
                                >
                                  <polyline points="6 8 10 12 14 8" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => startProjectEdit(project)}
                                className={`p-1 rounded ${
                                  isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                                }`}
                                aria-label="Edit project"
                              >
                                <HiPencilSquare className="w-4 h-4" />
                              </button>
                              {onDeleteProject && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteProject(project.id)}
                                  className={`p-1 rounded ${
                                    isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                                  }`}
                                  aria-label="Delete project"
                                >
                                  <HiXMark className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {effectiveExpanded &&
                          (assignedChats.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {assignedChats.map((chat) => {
                                const chatMatchesQuery = isMatch(chat);
                                return (
                                  <div
                                    key={chat.id}
                                    className={`flex items-center gap-2 rounded-lg ${
                                      chatMatchesQuery ? 'ring-2 ring-amber-400' : ''
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => onSelect?.(chat)}
                                      className={`flex-1 text-left text-xs px-2 py-1 rounded-md ${
                                        isDark
                                          ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      {chat.title || 'Untitled chat'}
                                    </button>
                                    {isEditingProject && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onRemoveChatFromProject?.(project.id, chat.id)
                                        }
                                        className={`p-1 rounded ${
                                          isDark
                                            ? 'hover:bg-gray-800 text-red-300'
                                            : 'hover:bg-gray-100 text-red-500'
                                        }`}
                                        aria-label="Remove chat from project"
                                      >
                                        <HiXMark className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className={`mt-2 text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                              Drop chats here
                            </p>
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {sessions.length === 0 && (
            <div className="text-xs opacity-70 px-2 py-3">No saved chats yet.</div>
          )}
          {unassignedSessions.map((session) => {
            const matched = isMatch(session);
            const isEditing = editingId === session.id;
            const displayTitle = (session.title || '').trim() || 'Untitled chat';
            const allowDrag = !isEditing && !!onAssignChatToProject;
            return (
              <div
                key={session.id}
                className={`group rounded-lg border px-3 py-2 ${
                  isDark
                    ? 'border-gray-800 bg-gray-900/70 hover:border-gray-700'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${matched ? 'ring-2 ring-amber-400' : ''} ${
                  allowDrag ? 'cursor-grab active:cursor-grabbing' : ''
                } ${draggingChatId === session.id ? 'opacity-80' : ''}`}
                draggable={allowDrag}
                onDragStart={(event) => {
                  if (!allowDrag) return;
                  event.dataTransfer.setData('application/chat-id', session.id);
                  event.dataTransfer.setData('text/plain', session.id);
                  event.dataTransfer.effectAllowed = 'move';
                  setDraggingChatId(session.id);
                }}
                onDragEnd={() => {
                  setDraggingChatId(null);
                  setDraggingOverProjectId(null);
                }}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-wide opacity-60">
                      Edit title
                    </label>
                    <input
                      ref={editInputRef}
                      value={titleDraft}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          saveEditing();
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelEditing();
                        }
                      }}
                      className={`w-full text-sm px-2 py-1 rounded border outline-none ${
                        isDark
                          ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="Untitled chat"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={`text-xs px-2 py-1 rounded-md border ${
                          isDark
                            ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`text-xs px-2 py-1 rounded-md border ${
                          isDark
                            ? 'border-blue-500/40 text-blue-300 hover:bg-blue-500/10'
                            : 'border-blue-300 text-blue-600 hover:bg-blue-100'
                        }`}
                        onClick={saveEditing}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => onSelect?.(session)}
                        title={displayTitle}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate block">{displayTitle}</span>
                          <span className="text-[11px] opacity-60 mt-0.5">
                            {new Date(session.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </button>
                      {onRename && (
                        <button
                          type="button"
                          className={`p-1.5 rounded-md border ${
                            isDark
                              ? 'border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            startEditing(session);
                          }}
                          aria-label="Rename chat"
                          title="Rename chat"
                        >
                          <HiPencilSquare className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      {onShare && (
                        <button
                          type="button"
                          className={`text-xs px-2 py-1 rounded-md border ${
                            isDark
                              ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onShare?.(session);
                          }}
                          aria-label="Share chat"
                          title="Share chat"
                        >
                          Share
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          className={`text-xs px-2 py-1 rounded-md border ${
                            isDark
                              ? 'border-red-500/40 text-red-300 hover:bg-red-500/10'
                              : 'border-red-300 text-red-600 hover:bg-red-100'
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(session.id);
                          }}
                          aria-label="Delete chat"
                          title="Delete chat"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
};

export default ChatHistoryPanel;
