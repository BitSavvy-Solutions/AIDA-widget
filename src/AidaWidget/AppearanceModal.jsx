/* src/AidaWidget/AppearanceModal.jsx */
import React from 'react';
import { HiXMark, HiCheck } from 'react-icons/hi2';

// Expanded theme definitions with comprehensive styling properties
export const THEMES = {
  coral: {
    id: 'dark',  // Keep 'dark' for backward compatibility
    name: 'Coral Pink',
    // Core colors
    primary: '#FF5F90',
    accent: '#ff87b0',
    // UI elements
    header: {
      background: '#0f172a',
      text: '#ffffff',
      border: 'rgba(255, 255, 255, 0.1)'
    },
    body: {
      background: '#0f172a',
      text: '#f8fafc'
    },
    chatArea: {
      background: '#0f172a',
      userMessage: {
        background: '#FF5F90',
        text: '#ffffff'
      },
      botMessage: {
        background: 'transparent',
        text: '#f8fafc'
      }
    },
    inputArea: {
      container: '#1e293b',
      background: '#1e293b',
      border: 'rgba(255, 255, 255, 0.1)',
      text: '#f8fafc',
      placeholder: 'rgba(248, 250, 252, 0.5)'
    },
    // Additional elements
    card: {
      background: '#1e293b',
      border: '#334155'
    },
    code: {
      background: '#1e1e1e',
      inline: 'rgba(255, 255, 255, 0.1)',
      text: '#f8f8f2'
    }
  },
  
  azure: {
    id: 'azure',
    name: 'Azure Blue',
    primary: '#3b82f6',
    accent: '#60a5fa',
    header: {
      background: '#0f172a',
      text: '#ffffff',
      border: 'rgba(255, 255, 255, 0.1)'
    },
    body: {
      background: '#0f172a',
      text: '#f8fafc'
    },
    chatArea: {
      background: '#0f172a',
      userMessage: {
        background: '#3b82f6',
        text: '#ffffff'
      },
      botMessage: {
        background: 'transparent',
        text: '#f8fafc'
      }
    },
    inputArea: {
      container: '#1e293b',
      background: '#1e293b',
      border: 'rgba(255, 255, 255, 0.1)',
      text: '#f8fafc',
      placeholder: 'rgba(248, 250, 252, 0.5)'
    },
    card: {
      background: '#1e293b',
      border: '#334155'
    },
    code: {
      background: '#1e1e1e',
      inline: 'rgba(255, 255, 255, 0.1)',
      text: '#f8f8f2'
    }
  },
  
  sepia: {
    id: 'sepia',
    name: 'Sepia',
    primary: '#b45309',
    accent: '#d97706',
    header: {
      background: '#92400e',
      text: '#fffbeb',
      border: 'rgba(180, 83, 9, 0.2)'
    },
    body: {
      background: '#fffbeb',
      text: '#713f12'
    },
    chatArea: {
      background: '#fffbeb',
      userMessage: {
        background: '#b45309',
        text: '#ffffff'
      },
      botMessage: {
        background: 'transparent',
        text: '#713f12'
      }
    },
    inputArea: {
      container: '#fef3c7', 
      background: '#fef3c7',
      border: 'rgba(180, 83, 9, 0.2)',
      text: '#713f12',
      placeholder: 'rgba(113, 63, 18, 0.6)'
    },
    card: {
      background: '#fef3c7',
      border: '#d4a76a'
    },
    code: {
      background: '#f5f0e5',
      inline: 'rgba(180, 83, 9, 0.1)',
      text: '#713f12'
    }
  },
  
  light: {
    id: 'light',
    name: 'Light Mode',
    primary: '#FF5F90',
    accent: '#ff87b0',
    header: {
      background: '#f8fafc',
      text: '#0f172a',
      border: 'rgba(15, 23, 42, 0.1)'
    },
    body: {
      background: '#ffffff',
      text: '#0f172a'
    },
    chatArea: {
      background: '#ffffff',
      userMessage: {
        background: '#FF5F90',
        text: '#ffffff'
      },
      botMessage: {
        background: 'transparent',
        text: '#0f172a'
      }
    },
    inputArea: {
      container: '#f1f5f9',
      background: '#f1f5f9',
      border: 'rgba(15, 23, 42, 0.1)',
      text: '#0f172a',
      placeholder: 'rgba(15, 23, 42, 0.5)'
    },
    card: {
      background: '#f8fafc',
      border: '#e2e8f0'
    },
    code: {
      background: '#f1f5f9',
      inline: 'rgba(15, 23, 42, 0.05)',
      text: '#0f172a'
    }
  }
};

// Enhanced theme card preview that better showcases theme differences
const ThemeCard = ({ theme, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`relative overflow-hidden rounded-xl border transition-all p-4 w-full ${
        isSelected 
          ? 'ring-2 shadow-md scale-[1.02]' 
          : 'hover:border-gray-400 dark:hover:border-gray-600'
      }`}
      style={{
        backgroundColor: theme.body.background,
        borderColor: isSelected ? theme.primary : 'rgba(156, 163, 175, 0.2)',
        boxShadow: isSelected ? `0 0 0 2px ${theme.primary}40` : 'none',
      }}
      aria-pressed={isSelected}
    >
      {/* Theme preview elements */}
      <div className="flex flex-col h-36">
        {/* Header preview */}
        <div 
          className="h-6 mb-3 rounded-t flex items-center px-2"
          style={{ 
            backgroundColor: theme.header.background,
            borderBottom: `1px solid ${theme.header.border}`,
            color: theme.header.text
          }}
        >
          <div className="w-12 h-3 rounded-sm opacity-60" style={{ backgroundColor: theme.header.text }}></div>
        </div>
        
        {/* Chat area */}
        <div className="flex-grow flex flex-col gap-2 px-1">
          {/* Bot message preview */}
          <div className="flex justify-start">
            <div 
              className="w-24 h-5 rounded-lg"
              style={{ 
                backgroundColor: theme.chatArea.botMessage.background,
                border: `1px solid ${theme.card.border}`,
                color: theme.chatArea.botMessage.text
              }}
            ></div>
          </div>
          
          {/* User message preview */}
          <div className="flex justify-end">
            <div 
              className="w-16 h-5 rounded-md"
              style={{ 
                backgroundColor: theme.chatArea.userMessage.background,
                color: theme.chatArea.userMessage.text
              }}
            ></div>
          </div>
          
          {/* Input area preview */}
          <div className="mt-auto">
            <div 
              className="w-full h-6 rounded-lg"
              style={{ 
                backgroundColor: theme.inputArea.background,
                border: `1px solid ${theme.inputArea.border}`,
                color: theme.inputArea.text
              }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Theme name */}
      <div 
        className="mt-3 text-xs font-medium text-center truncate"
        style={{ color: theme.body.text }}
      >
        {theme.name}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div 
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: theme.primary }}
        >
          <HiCheck className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
};

const AppearanceModal = ({ isOpen, onClose, currentTheme, onSelectTheme, textSize, onChangeTextSize }) => {
  if (!isOpen) return null;
  
  const isDark = currentTheme === 'dark' || currentTheme === 'azure';
  
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative rounded-xl shadow-xl p-6 max-w-md w-full ${
        isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
      }`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Appearance Settings</h2>
          <button 
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>
        
        {/* Theme Selection */}
        <div className="mb-6">
          <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Color Theme</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(THEMES).map((theme) => (
              <ThemeCard 
                key={theme.id}
                theme={theme}
                isSelected={currentTheme === theme.id}
                onSelect={onSelectTheme}
              />
            ))}
          </div>
        </div>
        
        {/* Text Size */}
        <div>
          <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Text Size</h3>
          <div className="flex items-center">
            <span className={`text-xs mr-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>A</span>
            <input
              type="range"
              min="80"
              max="120"
              step="5"
              value={textSize}
              onChange={(e) => onChangeTextSize(parseInt(e.target.value))}
              className="flex-1"
              aria-label="Adjust text size"
            />
            <span className={`text-base ml-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>A</span>
          </div>
          <div className="mt-2 text-center">
            <span className="text-sm">{textSize}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceModal;