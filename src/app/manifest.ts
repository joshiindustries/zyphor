import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zyphor Suite',
    short_name: 'Zyphor',
    description: 'E2EE Productivity and Secure Vault Suite',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0f1115',
    theme_color: '#0f1115',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
