/* src/AidaWidget/AppearanceModal.jsx */
import React from 'react';
import { HiXMark, HiCheck } from 'react-icons/hi2';

// ✅ EXPORT the themes so AidaWidget can access the color values
export const THEMES = {
  coral: {
    id: 'dark',  // Keep 'dark' for backward compatibility
    name: 'Coral Pink',
    primary: '#FF5F90',
    accent: '#ff87b0',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
  },
  azure: {
    id: 'azure',
    name: 'Azure Blue',
    primary: '#3b82f6',
    accent: '#60a5fa',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
  },
  sepia: {
    id: 'sepia',
    name: 'Sepia',
    primary: '#b45309',
    accent: '#d97706',
    background: '#fffbeb',
    surface: '#fef3c7',
    text: '#713f12',
  },
  light: {
    id: 'light',
    name: 'Light Mode',
    primary: '#FF5F90',
    accent: '#ff87b0',
    background: '#ffffff',
    surface: '#f1f5f9',
    text: '#0f172a',
  }
};

// Visual card component to display a theme option
const ThemeCard = ({ theme, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`relative overflow-hidden rounded-xl border transition-all p-3 w-full ${
        isSelected 
          ? 'ring-2 ring-brand-coral shadow-md scale-[1.02]' 
          : 'hover:border-gray-400 dark:hover:border-gray-600'
      }`}
      style={{
        backgroundColor: theme.background,
        borderColor: isSelected ? theme.primary : 'rgba(156, 163, 175, 0.2)',
      }}
      aria-pressed={isSelected}
    >
      {/* Theme preview elements */}
      <div className="flex flex-col h-28">
        {/* Header preview */}
        <div className="h-6 mb-2 rounded" style={{ backgroundColor: theme.surface }}></div>
        
        {/* Message bubbles previews */}
        <div className="flex justify-end mb-2">
          <div 
            className="w-16 h-4 rounded-full" 
            style={{ backgroundColor: theme.primary }}
          ></div>
        </div>
        <div className="flex justify-start mb-2">
          <div 
            className="w-24 h-4 rounded-lg opacity-80" 
            style={{ backgroundColor: theme.accent, opacity: 0.3 }}
          ></div>
        </div>
        <div className="flex justify-start">
          <div 
            className="w-20 h-4 rounded-lg opacity-80" 
            style={{ backgroundColor: theme.accent, opacity: 0.3 }}
          ></div>
        </div>
      </div>
      
      {/* Theme name */}
      <div 
        className="mt-2 text-xs font-medium text-center truncate"
        style={{ color: theme.text }}
      >
        {theme.name}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-brand-coral text-white rounded-full flex items-center justify-center">
          <HiCheck className="w-3 h-3" />
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