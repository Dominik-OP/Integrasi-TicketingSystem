import { PreferencesProvider } from '@/components/preferences';
import type { Metadata } from 'next';
import './globals.css';
import './refinements.css';
import './select.css';
import './theme.css';
import './ui-polish.css';
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
              "try{var t=localStorage.getItem('integrasi-theme');document.documentElement.dataset.theme=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){}",
          }}
        />
      </head>
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
