'use client';

import { useRef, useState } from 'react';
import { SynthPanel } from '@/components/synth-panel';
import { ChatPanel } from '@/components/chat-panel';
import type { Synth } from '@/lib/audio/synth';

export default function Home() {
  const synthRef = useRef<Synth | null>(null);
  const [keyboardOctave, setKeyboardOctave] = useState(4);

  return (
    <main className="w-full flex flex-col xl:flex-row xl:items-stretch xl:justify-center">
      <SynthPanel
        synthRef={synthRef}
        keyboardOctave={keyboardOctave}
        onKeyboardOctaveChange={setKeyboardOctave}
      />
      <ChatPanel
        synthRef={synthRef}
        keyboardOctave={keyboardOctave}
        onKeyboardOctaveChange={setKeyboardOctave}
      />
    </main>
  );
}
