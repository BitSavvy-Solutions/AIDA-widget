/* src/AidaWidget/AppearanceModal.jsx */
import React, { useState, useEffect } from 'react';
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
  },
  custom: {
    id: 'custom',
    name: 'Custom Theme',
    primary: '#FF5F90',
    accent: '#ff87b0',
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
    card: {
      background: '#1e293b',
      border: '#334155'
    },
    code: {
      background: '#1e1e1e',
      inline: 'rgba(255, 255, 255, 0.1)',
      text: '#f8f8f2'
    }
  }
};

// Theme card component for theme selection
const ThemeCard = ({ theme, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`w-full p-3 rounded-lg border transition-all hover:scale-105 ${
        isSelected ? 'border-brand-coral ring-2 ring-brand-coral ring-opacity-50' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{theme.name}</span>
        {isSelected && <HiCheck className="w-4 h-4 text-brand-coral" />}
      </div>
      <div className="h-6 rounded-full" style={{ background: theme.primary }}></div>
    </button>
  );
};

// Color picker component
const ColorPicker = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ml-2 w-20 px-2 py-1 text-xs rounded border"
        />
      </div>
    </div>
  );
};

const AppearanceModal = ({ isOpen, onClose, currentTheme, onSelectTheme, textSize, onChangeTextSize }) => {
  // Load saved custom theme settings
  const [customThemeSettings, setCustomThemeSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('aida-custom-theme');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      primary: THEMES.custom.primary,
      accent: THEMES.custom.accent,
      headerBg: THEMES.custom.header.background,
      bodyBg: THEMES.custom.body.background,
      bodyText: THEMES.custom.body.text,
      userMsgBg: THEMES.custom.chatArea.userMessage.background
    };
  });

  // Update the THEMES.custom object when settings change
  useEffect(() => {
    THEMES.custom.primary = customThemeSettings.primary;
    THEMES.custom.accent = customThemeSettings.accent;
    THEMES.custom.header.background = customThemeSettings.headerBg;
    THEMES.custom.body.background = customThemeSettings.bodyBg;
    THEMES.custom.body.text = customThemeSettings.bodyText;
    THEMES.custom.chatArea.userMessage.background = customThemeSettings.userMsgBg;
    
    // Save to localStorage
    localStorage.setItem('aida-custom-theme', JSON.stringify(customThemeSettings));
    
    // If currently using custom theme, trigger refresh
    if (currentTheme === 'custom') {
      onSelectTheme('custom');
    }
  }, [customThemeSettings, currentTheme, onSelectTheme]);

  if (!isOpen) return null;
  
  const isDark = currentTheme === 'dark' || currentTheme === 'azure' || 
    (currentTheme === 'custom' && customThemeSettings.bodyBg.match(/#([0-9a-f]{2}){1,2}/i) && parseInt(customThemeSettings.bodyBg.slice(1), 16) < 0x808080);
  
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
        
        {/* Custom Theme Options */}
        {currentTheme === 'custom' && (
          <div className={`mt-6 p-4 rounded-lg border ${
            isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
          }`}>
            <h3 className="text-sm font-medium mb-3">Customize Colors</h3>
            
            <ColorPicker 
              label="Primary Brand" 
              value={customThemeSettings.primary}
              onChange={(value) => setCustomThemeSettings(s => ({...s, primary: value}))}
            />
            
            <ColorPicker 
              label="Messages Background" 
              value={customThemeSettings.userMsgBg}
              onChange={(value) => setCustomThemeSettings(s => ({...s, userMsgBg: value}))}
            />
            
            <ColorPicker 
              label="Background" 
              value={customThemeSettings.bodyBg}
              onChange={(value) => setCustomThemeSettings(s => ({...s, bodyBg: value}))}
            />
            
            <ColorPicker 
              label="Text Color" 
              value={customThemeSettings.bodyText}
              onChange={(value) => setCustomThemeSettings(s => ({...s, bodyText: value}))}
            />
          </div>
        )}
        
        {/* Text Size */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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