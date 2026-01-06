'use client';

import { useRef } from 'react';
import { SynthPanel } from '@/components/synth-panel';
import { ChatPanel } from '@/components/chat-panel';
import type { Synth } from '@/lib/audio/synth';

export default function Home() {
  const synthRef = useRef<Synth | null>(null);

  return (
    <main className="w-full max-w-[916px] mx-auto px-4 sm:px-0">
      <SynthPanel synthRef={synthRef} />
      <ChatPanel synthRef={synthRef} />
    </main>
  );
}
