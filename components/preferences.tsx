'use client';
import type { Role } from '@/lib/domain';
import { Check, Droplet, Moon, Sun } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type AccessLabels = Record<Role, string>;
export const defaultAccessLabels: AccessLabels = {
  Agent: 'Agent',
  Reviewer: 'Reviewer',
  Admin: 'Admin',
};

export const themes = [
  {
    id: 'light',
    label: 'Terang',
    description: 'Bersih dan netral untuk kerja seharian.',
    icon: Sun,
  },
  {
    id: 'dark',
    label: 'Gelap',
    description: 'Nyaman di mata saat cahaya redup.',
    icon: Moon,
  },
  {
    id: 'sky',
    label: 'Biru muda',
    description: 'Segar dan lembut dengan nuansa langit cerah.',
    icon: Droplet,
  },
] as const;
export type ThemeName = (typeof themes)[number]['id'];
const THEME_KEY = 'integrasi-theme';
const isTheme = (value: unknown): value is ThemeName => themes.some((t) => t.id === value);

const AccessContext = createContext({
  labels: defaultAccessLabels,
  saveLabels: (_labels: AccessLabels) => {},
});
const ThemeContext = createContext({
  theme: 'light' as ThemeName,
  setTheme: (_theme: ThemeName) => {},
});
export const useAccessLabels = () => useContext(AccessContext);
export const useTheme = () => useContext(ThemeContext);

function paintTheme(theme: ThemeName, animate: boolean) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  const apply = () => {
    root.dataset.theme = theme;
  };
  const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
  if (animate && doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches)
    doc.startViewTransition(apply);
  else apply();
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState(defaultAccessLabels);
  const [theme, setThemeState] = useState<ThemeName>('light');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      let preference: string | null = null;
      try {
        preference = localStorage.getItem(THEME_KEY);
      } catch {}
      const value = isTheme(preference) ? preference : media.matches ? 'dark' : 'light';
      paintTheme(value, false);
      setThemeState(value);
    };
    const readLabels = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('integrasi-access-labels') ?? 'null');
        if (
          saved &&
          ['Agent', 'Reviewer', 'Admin'].every(
            (key) => typeof saved[key] === 'string' && saved[key].trim()
          )
        )
          setLabels(saved);
      } catch {}
    };
    apply();
    readLabels();
    const storage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) apply();
      if (event.key === 'integrasi-access-labels') readLabels();
    };
    media.addEventListener('change', apply);
    window.addEventListener('storage', storage);
    return () => {
      media.removeEventListener('change', apply);
      window.removeEventListener('storage', storage);
    };
  }, []);
  function saveLabels(next: AccessLabels) {
    setLabels(next);
    try {
      localStorage.setItem('integrasi-access-labels', JSON.stringify(next));
    } catch {}
  }
  function setTheme(next: ThemeName) {
    setThemeState(next);
    paintTheme(next, true);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }
  return (
    <AccessContext.Provider value={{ labels, saveLabels }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
    </AccessContext.Provider>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const picker = useRef<HTMLDivElement>(null);
  const current = themes.find((t) => t.id === theme) ?? themes[0];
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!picker.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div className="theme-picker" ref={picker}>
      <button
        className="theme-toggle"
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tema ${current.label}. Ganti tema`}
        title="Ganti tema"
      >
        <current.icon size={18} />
      </button>
      {open && (
        <div className="theme-menu" role="menu" aria-label="Pilih tema">
          <span className="theme-menu-heading">Tema tampilan</span>
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={t.id === theme}
              className={t.id === theme ? 'selected' : ''}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
            >
              <span className={`theme-swatch swatch-${t.id}`} aria-hidden="true" />
              <span>{t.label}</span>
              {t.id === theme && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
