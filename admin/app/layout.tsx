import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { RegisterServiceWorker } from '@/components/RegisterServiceWorker';

import './globals.css';

// Self-hosted variable fonts (Syne for display, Outfit for text), so builds never depend on Google.
const syne = localFont({ src: './fonts/Syne.woff2', weight: '400 800', variable: '--font-syne', display: 'swap' });
const outfit = localFont({ src: './fonts/Outfit.woff2', weight: '100 900', variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = {
  title: 'Salone Events Admin',
  description: 'Add and update the events shown in the Salone Events dot.',
  applicationName: 'Salone Events Admin',
  appleWebApp: { capable: true, title: 'SE Admin', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0d0b0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${outfit.variable}`}>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
