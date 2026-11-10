import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Salone Events Admin',
    short_name: 'SE Admin',
    description: 'Add and update the events shown in the Salone Events dot.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0b0a',
    theme_color: '#0d0b0a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
