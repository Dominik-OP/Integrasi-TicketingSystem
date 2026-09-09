'use client';
import type { Role } from '@/lib/domain';
import { Moon, Sun } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AccessLabels = Record<Role, string>;
export const defaultAccessLabels: AccessLabels = {
  Agent: 'Agent',
  Reviewer: 'Reviewer',
  Admin: 'Admin',
};
const AccessContext = createContext({
  labels: defaultAccessLabels,
  saveLabels: (_labels: AccessLabels) => {},
});
const ThemeContext = createContext({ dark: false, toggle: () => {} });
export const useAccessLabels = () => useContext(AccessContext);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState(defaultAccessLabels);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      let preference: string | null = null;
      try {
        preference = localStorage.getItem('integrasi-theme');
      } catch {}
      const value = preference === 'dark' || (preference !== 'light' && media.matches);
      document.documentElement.dataset.theme = value ? 'dark' : 'light';
      setDark(value);
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
      if (event.key === 'integrasi-theme') apply();
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
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try {
      localStorage.setItem('integrasi-theme', next ? 'dark' : 'light');
    } catch {}
  }
  return (
    <AccessContext.Provider value={{ labels, saveLabels }}>
      <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>
    </AccessContext.Provider>
  );
}

export function ThemeToggle() {
  const { dark, toggle } = useContext(ThemeContext);
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={dark ? 'Mode terang' : 'Mode gelap'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
