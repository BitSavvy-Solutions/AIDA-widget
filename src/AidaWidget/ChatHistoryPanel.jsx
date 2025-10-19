import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HiPencilSquare, HiCheck, HiXMark } from 'react-icons/hi2';

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
  onCreateProject,
  onAssignChatToProject,
  onRemoveChatFromProject,
  onDeleteProject
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

  const tokens = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const isMatch = useMemo(() => (
    (s) => {
      if (tokens.length === 0) return false;
      const hay = `${s.title || ''} ${(s.messages || []).map(m => m.text || '').join(' ')}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    }
  ), [tokens]);
  const sessionMap = useMemo(() => {
    const map = Object.create(null);
    (sessions || []).forEach((s) => { map[s.id] = s; });
    return map;
  }, [sessions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
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
    const chatId = event.dataTransfer.getData('application/chat-id') || event.dataTransfer.getData('text/plain');
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
    setExpandedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
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
    if (!projectEditId || !onRename) {
      cancelProjectEdit();
      return;
    }
    onRename(projectEditId, projectEditDraft);
    cancelProjectEdit();
  };

  const projectsList = Array.isArray(projects) ? projects : [];

  // Gather all chat IDs currently assigned to any project
const assignedChatIds = useMemo(() => {
  const ids = new Set();
  (projects || []).forEach(project => {
    (project.chatIds || []).forEach(id => ids.add(id));
  });
  return ids;
}, [projects]);

// Filter sessions to only those not assigned to any project
const unassignedSessions = useMemo(() => {
  return (sessions || []).filter(s => !assignedChatIds.has(s.id));
}, [sessions, assignedChatIds]);

  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
      {/* Dim background; clickable only when open */}
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${open ? 'opacity-40 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-black' : 'bg-black'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 bottom-0 w-64 sm:w-72 transform transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'} ${isDark ? 'bg-gray-900 text-gray-100 border-l border-gray-800' : 'bg-white text-gray-900 border-l border-gray-200'} shadow-xl pointer-events-auto flex flex-col`}>
        <div className={`px-3 py-2 border-b ${isDark ? 'border-gray-700/40' : 'border-gray-200/60'} shrink-0`}>
          <div className="relative flex items-center justify-center">
            <h3 className="text-sm font-semibold flex-1 text-center">Notebook History</h3>
            <button
              onClick={onClose}
              className={`absolute right-0 p-1 rounded ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              aria-label="Close history"
            >
              ✕
            </button>
          </div>
          <div className="mt-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles and content..."
              className={`w-full text-sm px-2 py-1 rounded border outline-none ${isDark ? 'bg-gray-800 border-gray-700 placeholder-gray-400 text-gray-100' : 'bg-white border-gray-300 placeholder-gray-400 text-gray-900'}`}
              aria-label="Search chat history"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className={`sticky top-0 z-10 pb-3 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="space-y-2">
              {isCreatingProject ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={newProjectInputRef}
                    value={projectDraft}
                    onChange={(e) => setProjectDraft(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleProjectSave();
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        handleProjectCancel();
                      }
                    }}
                    className={`flex-1 text-sm px-2 py-1 rounded border outline-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    placeholder="Project name"
                  />
                  <button
                    type="button"
                    onClick={handleProjectCancel}
                    className={`p-1.5 rounded-md border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                    aria-label="Cancel new project"
                    title="Cancel"
                  >
                    <HiXMark className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleProjectSave}
                    className={`p-1.5 rounded-md border ${isDark ? 'border-blue-500/40 text-blue-300 hover:bg-blue-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-100'}`}
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
                  className={`w-full flex items-center gap-2 justify-center text-sm font-medium px-3 py-2 rounded-md border ${isDark ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
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
                    const assignedChats = (project.chatIds || []).map((id) => sessionMap[id]).filter(Boolean);
                    const isActiveDrop = draggingOverProjectId === project.id;
                    const isExpanded = expandedProjectIds.has(project.id);
                    const isEditingProject = projectEditId === project.id;
                    const effectiveExpanded = isEditingProject || isExpanded;

                    return (
                      <div
                        key={project.id}
                        onDragOver={(event) => handleProjectDragOver(event, project.id)}
                        onDragLeave={() => handleProjectDragLeave(project.id)}
                        onDrop={(event) => handleProjectDrop(event, project.id)}
                        className={`rounded-lg border px-3 py-2 transition ${isDark ? 'border-gray-800 bg-gray-900/70' : 'border-gray-200 bg-white'} ${isActiveDrop ? (isDark ? 'ring-2 ring-blue-400' : 'ring-2 ring-blue-500') : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0 flex items-center gap-2 text-sm font-medium">
                            <NotebookIcon className="w-4 h-4" />
                            {isEditingProject ? (
                              <>
                                <input
                                  ref={projectEditInputRef}
                                  value={projectEditDraft}
                                  onChange={(e) => setProjectEditDraft(e.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      saveProjectEdit();
                                    } else if (event.key === 'Escape') {
                                      event.preventDefault();
                                      cancelProjectEdit();
                                    }
                                  }}
                                  className={`flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                />
                                <button
                                  type="button"
                                  onClick={saveProjectEdit}
                                  className={`p-1.5 rounded-md border ${isDark ? 'border-blue-500/40 text-blue-300 hover:bg-blue-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-100'}`}
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
                                  {assignedChats.length} chat{assignedChats.length > 1 ? 's' : ''}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleProjectExpansion(project.id)}
                                className={`p-1 rounded ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
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
                                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                                >
                                  <polyline points="6 8 10 12 14 8" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => startProjectEdit(project)}
                                className={`p-1 rounded ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                                aria-label="Edit project"
                              >
                                <HiPencilSquare className="w-4 h-4" />
                              </button>
                              {onDeleteProject && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteProject(project.id)}
                                  className={`p-1 rounded ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                                  aria-label="Delete project"
                                >
                                  <HiXMark className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {effectiveExpanded && (
                          assignedChats.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {assignedChats.map((chat) => (
                                <div key={chat.id} className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onSelect && onSelect(chat)}
                                    className={`flex-1 text-left text-xs px-2 py-1 rounded-md ${isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                  >
                                    {chat.title || 'Untitled chat'}
                                  </button>
                                  {isEditingProject && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveChatFromProject && onRemoveChatFromProject(project.id, chat.id)}
                                      className={`p-1 rounded ${isDark ? 'hover:bg-gray-800 text-red-300' : 'hover:bg-gray-100 text-red-500'}`}
                                      aria-label="Remove chat from project"
                                    >
                                      <HiXMark className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className={`mt-2 text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Drop chats here</p>
                          )
                        )}
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
          {unassignedSessions.map((s) => {
            const matched = isMatch(s);
            const isEditing = editingId === s.id;
            const displayTitle = (s.title || '').trim() || 'Untitled chat';
            const allowDrag = !isEditing && !!onAssignChatToProject;
            return (
              <div
                key={s.id}
                className={`group rounded-lg border px-3 py-2 ${isDark ? 'border-gray-800 bg-gray-900/70 hover:border-gray-700' : 'border-gray-200 bg-white hover:border-gray-300'} ${matched ? 'ring-2 ring-amber-400' : ''} ${allowDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${draggingChatId === s.id ? 'opacity-80' : ''}`}
                draggable={allowDrag}
                onDragStart={(event) => {
                  if (!allowDrag) return;
                  event.dataTransfer.setData('application/chat-id', s.id);
                  event.dataTransfer.setData('text/plain', s.id);
                  event.dataTransfer.effectAllowed = 'move';
                  setDraggingChatId(s.id);
                }}
                onDragEnd={() => {
                  setDraggingChatId(null);
                  setDraggingOverProjectId(null);
                }}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-wide opacity-60">Edit title</label>
                    <input
                      ref={editInputRef}
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          saveEditing();
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelEditing();
                        }
                      }}
                      className={`w-full text-sm px-2 py-1 rounded border outline-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                      placeholder="Untitled chat"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={`text-xs px-2 py-1 rounded-md border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`text-xs px-2 py-1 rounded-md border ${isDark ? 'border-blue-500/40 text-blue-300 hover:bg-blue-500/10' : 'border-blue-300 text-blue-600 hover:bg-blue-100'}`}
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
                        onClick={() => onSelect && onSelect(s)}
                        title={displayTitle}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate block">{displayTitle}</span>
                          <span className="text-[11px] opacity-60 mt-0.5">{new Date(s.createdAt).toLocaleString()}</span>
                        </div>
                      </button>
                      {onRename && (
                        <button
                          type="button"
                          className={`p-1.5 rounded-md border ${isDark ? 'border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            startEditing(s);
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
                          className={`text-xs px-2 py-1 rounded-md border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onShare(s);
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
                          className={`text-xs px-2 py-1 rounded-md border ${isDark ? 'border-red-500/40 text-red-300 hover:bg-red-500/10' : 'border-red-300 text-red-600 hover:bg-red-100'}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(s.id);
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