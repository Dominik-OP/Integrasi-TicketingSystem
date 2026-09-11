import { PreferencesProvider } from '@/components/preferences';
import type { Metadata } from 'next';
// Imports every stylesheet in cascade-layer order; see the header of app/shadcn.css.
import './shadcn.css';

export const metadata: Metadata = {
  title: 'Integrasi - Ticketing System',
  description: 'Satu tempat untuk setiap solusi. Kelola tiket dan kolaborasi tim support.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('integrasi-theme');if(['light','dark','sky'].indexOf(t)<0)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
