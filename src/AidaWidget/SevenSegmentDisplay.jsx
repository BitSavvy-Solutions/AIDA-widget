// src/components/SevenSegmentDisplay.jsx
import React from 'react';
import './AidaWidget.css';

/*
 Seven-segment display layout:
    a
   ---
f |   | b
  | g |
   ---
e |   | c
  |   |
   ---
    d

 Segment array mapping: [a, b, c, d, e, f, g]
*/

// Define which segments are active for each character
const SEGMENT_MAPS = {
  '0': [true, true, true, true, true, true, false],  // a, b, c, d, e, f
  '1': [false, true, true, false, false, false, false],  // b, c
  '2': [true, true, false, true, true, false, true],  // a, b, d, e, g
  '3': [true, true, true, true, false, false, true],  // a, b, c, d, g
  '4': [false, true, true, false, false, true, true],  // b, c, f, g
  '5': [true, false, true, true, false, true, true],  // a, c, d, f, g
  '6': [true, false, true, true, true, true, true],  // a, c, d, e, f, g
  '7': [true, true, true, false, false, false, false],  // a, b, c
  '8': [true, true, true, true, true, true, true],  // all
  '9': [true, true, true, true, false, true, true],  // a, b, c, d, f, g
  'A': [true, true, true, false, true, true, true],  // a, b, c, e, f, g
  'I': [false, false, false, false, true, true, false],  // b, c
  'L': [false, true, true, false, false, false, false],  // b, c
  'D': [false, true, true, true, true, false, true],  // b, c, d, e, g
  'E': [true, false, false, true, true, true, true],  // a, d, e, f, g
  'R': [false, false, false, false, true, false, true],  // e, g (simplified)
  '-': [false, false, false, false, false, false, true],  // g
  ' ': [false, false, false, false, false, false, false],  // none
  '_': [false, false, false, true, false, false, false],  // d
  'T': [false, false, false, false, true, false, false] //c
  // Add more characters as needed
};

// Colon character for time display
const Colon = ({ active = false }) => (
  <div className="lcd-colon">
    <div className={`colon-dot ${active ? 'on' : ''}`}></div>
    <div className={`colon-dot ${active ? 'on' : ''}`}></div>
  </div>
);

// Individual digit with seven segments
const SevenSegmentDigit = ({ character = ' ' }) => {
  // Get the segment pattern for this character, default to space pattern if not found
  const segments = SEGMENT_MAPS[character] || SEGMENT_MAPS[' '];
  
  return (
    <div className="lcd-digit">
      <div className={`segment segment-a ${segments[0] ? 'on' : ''}`}></div>
      <div className={`segment segment-b ${segments[1] ? 'on' : ''}`}></div>
      <div className={`segment segment-c ${segments[2] ? 'on' : ''}`}></div>
      <div className={`segment segment-d ${segments[3] ? 'on' : ''}`}></div>
      <div className={`segment segment-e ${segments[4] ? 'on' : ''}`}></div>
      <div className={`segment segment-f ${segments[5] ? 'on' : ''}`}></div>
      <div className={`segment segment-g ${segments[6] ? 'on' : ''}`}></div>
    </div>
  );
};

// The complete display that renders characters as seven-segment digits
const SevenSegmentDisplay = ({ text = '', className = '' }) => {
    // Process text to handle colons specially
    const characters = text.split('');
    
    return (
      <div className={`lcd-display-container ${className}`}>
        <div className="digits-container">
          {characters.map((char, index) => {
            if (char === ':') {
              // Skip colons in the main flow
              return null;
            }
            return <SevenSegmentDigit key={`digit-${index}`} character={char.toUpperCase()} />;
          })}
          
          {/* Add colons as absolute positioned elements */}
          {characters.map((char, index) => {
            if (char === ':') {
              // Calculate position based on index
              const position = index * 26; // Adjust based on your digit width + margin
              return (
                <div 
                  key={`colon-${index}`} 
                  className="absolute-colon"
                  style={{ left: `${position}px` }}
                >
                  <Colon />
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

export default SevenSegmentDisplay;