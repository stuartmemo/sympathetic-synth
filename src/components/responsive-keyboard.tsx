'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ResponsiveKeyboardProps {
  onNoteOn: (note: string) => void;
  onNoteOff: (note: string) => void;
  activeColor?: string;
  whiteKeyColor?: string;
  blackKeyColor?: string;
  octave?: number;
  onOctaveChange?: (octave: number) => void;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Black key positions relative to white keys (0-indexed from C)
const BLACK_KEY_POSITIONS: Record<string, number> = {
  'C#': 0,
  'D#': 1,
  'F#': 3,
  'G#': 4,
  'A#': 5,
};

// Physical keyboard mapping (QWERTY layout like qwerty-hancock)
// Bottom row: A-L for white keys, W-U for black keys
const KEY_TO_NOTE: Record<string, { note: string; octaveOffset: number }> = {
  // White keys - bottom row
  'a': { note: 'C', octaveOffset: 0 },
  's': { note: 'D', octaveOffset: 0 },
  'd': { note: 'E', octaveOffset: 0 },
  'f': { note: 'F', octaveOffset: 0 },
  'g': { note: 'G', octaveOffset: 0 },
  'h': { note: 'A', octaveOffset: 0 },
  'j': { note: 'B', octaveOffset: 0 },
  'k': { note: 'C', octaveOffset: 1 },
  'l': { note: 'D', octaveOffset: 1 },
  ';': { note: 'E', octaveOffset: 1 },
  // Black keys - top row
  'w': { note: 'C#', octaveOffset: 0 },
  'e': { note: 'D#', octaveOffset: 0 },
  't': { note: 'F#', octaveOffset: 0 },
  'y': { note: 'G#', octaveOffset: 0 },
  'u': { note: 'A#', octaveOffset: 0 },
  'o': { note: 'C#', octaveOffset: 1 },
  'p': { note: 'D#', octaveOffset: 1 },
};

export function ResponsiveKeyboard({
  onNoteOn,
  onNoteOff,
  activeColor = '#FFE976',
  whiteKeyColor = '#fff',
  blackKeyColor = '#000',
  octave: externalOctave,
  onOctaveChange,
}: ResponsiveKeyboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalOctave, setInternalOctave] = useState(4);
  const octave = externalOctave ?? internalOctave;
  const setOctave = onOctaveChange ?? setInternalOctave;
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [visibleOctaves, setVisibleOctaves] = useState(2);
  const touchMapRef = useRef<Map<number, string>>(new Map());
  const swipeStartRef = useRef<number>(0);
  const isMouseDownRef = useRef(false);
  const keyboardNotesRef = useRef<Set<string>>(new Set());

  // Responsive octave calculation based on container width
  useEffect(() => {
    const updateOctaves = () => {
      const width = containerRef.current?.offsetWidth ?? 400;
      if (width < 400) setVisibleOctaves(1);
      else if (width < 700) setVisibleOctaves(2);
      else setVisibleOctaves(3);
    };

    updateOctaves();
    window.addEventListener('resize', updateOctaves);
    return () => window.removeEventListener('resize', updateOctaves);
  }, []);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in a text input (but allow sliders/range inputs)
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.target instanceof HTMLInputElement) {
        const inputType = (e.target as HTMLInputElement).type;
        if (inputType !== 'range' && inputType !== 'checkbox' && inputType !== 'radio') {
          return;
        }
      }

      const key = e.key.toLowerCase();
      const mapping = KEY_TO_NOTE[key];

      if (mapping && !e.repeat) {
        const fullNote = `${mapping.note}${octave + mapping.octaveOffset}`;
        if (!keyboardNotesRef.current.has(fullNote)) {
          keyboardNotesRef.current.add(fullNote);
          setActiveNotes(prev => new Set(prev).add(fullNote));
          onNoteOn(fullNote);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mapping = KEY_TO_NOTE[key];

      if (mapping) {
        const fullNote = `${mapping.note}${octave + mapping.octaveOffset}`;
        keyboardNotesRef.current.delete(fullNote);
        setActiveNotes(prev => {
          const next = new Set(prev);
          next.delete(fullNote);
          return next;
        });
        onNoteOff(fullNote);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [octave, onNoteOn, onNoteOff]);

  // Global mouse up listener for drag release
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Generate white notes for visible octaves
  const generateWhiteNotes = useCallback(() => {
    const notes: string[] = [];
    for (let o = octave; o < octave + visibleOctaves; o++) {
      for (const note of WHITE_NOTES) {
        notes.push(`${note}${o}`);
      }
    }
    // Add final C of next octave
    notes.push(`C${octave + visibleOctaves}`);
    return notes;
  }, [octave, visibleOctaves]);

  // Generate black notes for visible octaves
  const generateBlackNotes = useCallback(() => {
    const notes: { note: string; position: number }[] = [];
    for (let o = octave; o < octave + visibleOctaves; o++) {
      for (const [noteName, pos] of Object.entries(BLACK_KEY_POSITIONS)) {
        const octaveOffset = (o - octave) * 7;
        notes.push({
          note: `${noteName}${o}`,
          position: pos + octaveOffset,
        });
      }
    }
    return notes;
  }, [octave, visibleOctaves]);

  // Note event handlers
  const handleNoteOn = useCallback(
    (note: string) => {
      setActiveNotes((prev) => new Set(prev).add(note));
      onNoteOn(note);
    },
    [onNoteOn]
  );

  const handleNoteOff = useCallback(
    (note: string) => {
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      onNoteOff(note);
    },
    [onNoteOff]
  );

  // Touch handlers with multi-touch support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, note: string) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchMapRef.current.set(touch.identifier, note);
      handleNoteOn(note);
    },
    [handleNoteOn]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        const note = touchMapRef.current.get(touch.identifier);
        if (note) {
          touchMapRef.current.delete(touch.identifier);
          handleNoteOff(note);
        }
      }
    },
    [handleNoteOff]
  );

  // Mouse handlers for desktop with drag support
  const handleMouseDown = useCallback(
    (note: string) => {
      isMouseDownRef.current = true;
      handleNoteOn(note);
    },
    [handleNoteOn]
  );

  const handleMouseUp = useCallback(
    (note: string) => {
      isMouseDownRef.current = false;
      handleNoteOff(note);
    },
    [handleNoteOff]
  );

  const handleMouseEnter = useCallback(
    (note: string) => {
      if (isMouseDownRef.current) {
        handleNoteOn(note);
      }
    },
    [handleNoteOn]
  );

  const handleMouseLeave = useCallback(
    (note: string) => {
      if (activeNotes.has(note)) {
        handleNoteOff(note);
      }
    },
    [activeNotes, handleNoteOff]
  );

  // Swipe detection for octave change on navigation area
  const handleSwipeStart = (e: React.TouchEvent) => {
    swipeStartRef.current = e.touches[0].clientX;
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - swipeStartRef.current;
    if (Math.abs(diff) > 80) {
      if (diff > 0 && octave > 1) setOctave(octave - 1);
      else if (diff < 0 && octave < 6) setOctave(octave + 1);
    }
  };

  const whiteNotes = generateWhiteNotes();
  const blackNotes = generateBlackNotes();
  const totalWhiteKeys = whiteNotes.length;

  return (
    <div
      ref={containerRef}
      className="relative bg-black border-x-4 border-b-4 border-[#0c0c0c] w-full select-none"
    >
      {/* Octave Navigation */}
      <div
        className="flex items-center justify-between px-2 pt-1 pb-2 bg-black/80"
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        <button
          onClick={() => octave > 1 && setOctave(octave - 1)}
          className="bg-[#333] hover:bg-[#444] text-white rounded w-[36px] h-[36px] text-base font-bold disabled:opacity-30 flex items-center justify-center leading-none border-0"
          disabled={octave <= 1}
          aria-label="Lower octave"
        >
          &lt;
        </button>
        <span className="text-white/70 text-xs font-mono">
          C{octave} - C{octave + visibleOctaves}
        </span>
        <button
          onClick={() => octave < 6 && setOctave(octave + 1)}
          className="bg-[#333] hover:bg-[#444] text-white rounded w-[36px] h-[36px] text-base font-bold disabled:opacity-30 flex items-center justify-center leading-none border-0"
          disabled={octave >= 6}
          aria-label="Higher octave"
        >
          &gt;
        </button>
      </div>

      {/* Keyboard container */}
      <div className="relative h-[120px] sm:h-[150px]">
        {/* White Keys */}
        <div className="flex h-full">
          {whiteNotes.map((note) => (
            <div
              key={note}
              className="flex-1 border-r border-[#333] last:border-r-0 cursor-pointer touch-none transition-colors duration-75"
              style={{
                backgroundColor: activeNotes.has(note) ? activeColor : whiteKeyColor,
                minWidth: `${100 / totalWhiteKeys}%`,
              }}
              onTouchStart={(e) => handleTouchStart(e, note)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onMouseDown={() => handleMouseDown(note)}
              onMouseUp={() => handleMouseUp(note)}
              onMouseEnter={() => handleMouseEnter(note)}
              onMouseLeave={() => handleMouseLeave(note)}
              role="button"
              aria-label={`Play ${note}`}
            />
          ))}
        </div>

        {/* Black Keys */}
        {blackNotes.map(({ note, position }) => {
          const leftPercent = ((position + 0.65) / totalWhiteKeys) * 100;
          const widthPercent = 0.6 / totalWhiteKeys * 100;

          return (
            <div
              key={note}
              className="absolute top-0 h-[60%] cursor-pointer touch-none transition-colors duration-75 rounded-b-sm box-border"
              style={{
                backgroundColor: activeNotes.has(note) ? activeColor : blackKeyColor,
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                minWidth: '24px',
                borderLeft: activeNotes.has(note) ? '1px solid black' : 'none',
                borderRight: activeNotes.has(note) ? '1px solid black' : 'none',
                borderBottom: activeNotes.has(note) ? '1px solid black' : 'none',
              }}
              onTouchStart={(e) => handleTouchStart(e, note)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onMouseDown={() => handleMouseDown(note)}
              onMouseUp={() => handleMouseUp(note)}
              onMouseEnter={() => handleMouseEnter(note)}
              onMouseLeave={() => handleMouseLeave(note)}
              role="button"
              aria-label={`Play ${note}`}
            />
          );
        })}
      </div>
    </div>
  );
}
