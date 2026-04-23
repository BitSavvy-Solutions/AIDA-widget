/* src/AidaWidget/AppearanceModal.jsx */
import React, { useState, useEffect } from 'react';
import { HiXMark, HiCheck, HiClipboard, HiArrowDownTray } from 'react-icons/hi2';

const hexToRgb = (hex) => {
  let c = (hex || '').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return isNaN(r) ? [0, 0, 0] : [r, g, b];
};

const getLuminance = (r, g, b) => {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};

const hslToRgb = (h, s, l) => {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const rgbToHex = (r, g, b) => {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

const adjustColorForContrast = (textColorHex, bgColorHex) => {
  const bgRgb = hexToRgb(bgColorHex);
  const textRgb = hexToRgb(textColorHex);

  const bgLum = getLuminance(...bgRgb);
  let [h, s, l] = rgbToHsl(...textRgb);

  if (bgLum > 0.2) {
    if (l > 0.35) l = 0.15; 
  } else {
    if (l < 0.65) l = 0.90; 
  }

  const newRgb = hslToRgb(h, s, l);
  return rgbToHex(...newRgb);
};

const deriveDarkColor = (hex) => {
  const rgb = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(...rgb);
  l = Math.min(l * 0.25, 0.12); 
  const newRgb = hslToRgb(h, s, l);
  return rgbToHex(...newRgb);
};

export const THEMES = {
  coral: {
    id: 'dark',
    name: 'Coral Pink',
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
      background: '#451a03',
      text: '#fffbeb',
      border: 'rgba(254, 243, 199, 0.1)'
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
      container: '#451a03',
      background: '#451a03',
      border: 'rgba(254, 243, 199, 0.1)',
      text: '#fffbeb',
      placeholder: 'rgba(254, 243, 199, 0.5)'
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
      background: '#0f172a',
      text: '#f8fafc',
      border: 'rgba(248, 250, 252, 0.1)'
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
      container: '#0f172a',
      background: '#0f172a',
      border: 'rgba(248, 250, 252, 0.1)',
      text: '#f8fafc',
      placeholder: 'rgba(248, 250, 252, 0.5)'
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
  const [customThemeSettings, setCustomThemeSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('aida-custom-theme');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      primary: THEMES.custom.primary,
      accent: THEMES.custom.accent,
      bodyBg: THEMES.custom.body.background,
      bodyText: THEMES.custom.body.text,
      userMsgBg: THEMES.custom.chatArea.userMessage.background
    };
  });

  const [copySuccess, setCopySuccess] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [pasteError, setPasteError] = useState(false);

  useEffect(() => {
    const derivedDarkBg = deriveDarkColor(customThemeSettings.bodyBg);
    const adjustedHeaderText = adjustColorForContrast(customThemeSettings.bodyText, derivedDarkBg);
    const adjustedBodyText = adjustColorForContrast(customThemeSettings.bodyText, customThemeSettings.bodyBg);
    const adjustedUserMsgText = adjustColorForContrast(customThemeSettings.bodyText, customThemeSettings.userMsgBg);

    const bgLum = getLuminance(...hexToRgb(customThemeSettings.bodyBg));
    const isLightBg = bgLum > 0.5;

    THEMES.custom.primary = customThemeSettings.primary;
    THEMES.custom.accent = customThemeSettings.accent;
    THEMES.custom.header.background = derivedDarkBg;
    THEMES.custom.header.text = adjustedHeaderText;
    THEMES.custom.body.background = customThemeSettings.bodyBg;
    THEMES.custom.body.text = adjustedBodyText;
    THEMES.custom.chatArea.userMessage.background = customThemeSettings.userMsgBg;
    THEMES.custom.chatArea.userMessage.text = adjustedUserMsgText;
    THEMES.custom.chatArea.botMessage.text = adjustedBodyText;
    THEMES.custom.inputArea.container = derivedDarkBg;
    THEMES.custom.inputArea.background = derivedDarkBg;
    THEMES.custom.inputArea.text = adjustedHeaderText;
    
    // Dynamically adjust code block colors based on background luminance
    THEMES.custom.code = {
      background: isLightBg ? '#f1f5f9' : '#1e1e1e',
      inline: isLightBg ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.1)',
      text: isLightBg ? '#0f172a' : '#f8f8f2'
    };
    
    localStorage.setItem('aida-custom-theme', JSON.stringify(customThemeSettings));
    
    if (currentTheme === 'custom') {
      onSelectTheme('custom');
    }
  }, [customThemeSettings, currentTheme, onSelectTheme]);

  const handleCopyTheme = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(customThemeSettings, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy theme', err);
    }
  };

  const handlePasteTheme = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      
      if (parsed && typeof parsed === 'object') {
        const newSettings = { ...customThemeSettings };
        if (parsed.primary) newSettings.primary = parsed.primary;
        if (parsed.accent) newSettings.accent = parsed.accent;
        if (parsed.bodyBg) newSettings.bodyBg = parsed.bodyBg;
        if (parsed.bodyText) newSettings.bodyText = parsed.bodyText;
        if (parsed.userMsgBg) newSettings.userMsgBg = parsed.userMsgBg;
        
        setCustomThemeSettings(newSettings);
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 2000);
      } else {
        throw new Error('Invalid theme format');
      }
    } catch (err) {
      console.error('Failed to paste theme', err);
      setPasteError(true);
      setTimeout(() => setPasteError(false), 2000);
    }
  };

  if (!isOpen) return null;
  
  const isDark = currentTheme === 'dark' || currentTheme === 'azure' || 
    (currentTheme === 'custom' && customThemeSettings.bodyBg.match(/#([0-9a-f]{2}){1,2}/i) && parseInt(customThemeSettings.bodyBg.slice(1), 16) < 0x808080);
  
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto custom-scrollbar ${
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
        
        {currentTheme === 'custom' && (
          <div className={`mt-6 p-4 rounded-lg border ${
            isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Customize Colors</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyTheme}
                  className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                  title="Copy Theme"
                >
                  {copySuccess ? <HiCheck className="w-4 h-4 text-green-500" /> : <HiClipboard className="w-4 h-4" />}
                </button>
                <button
                  onClick={handlePasteTheme}
                  className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                  title="Paste Theme"
                >
                  {pasteError ? <HiXMark className="w-4 h-4 text-red-500" /> : pasteSuccess ? <HiCheck className="w-4 h-4 text-green-500" /> : <HiArrowDownTray className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
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