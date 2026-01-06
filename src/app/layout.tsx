import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-montserrat',
});

import type { Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Sympathetic Synthesizer System Mk II',
  description: 'An analogue synth made with the Web Audio API and AI',
  authors: [{ name: 'Stuart Memo' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={montserrat.variable}>{children}</body>
    </html>
  );
}
