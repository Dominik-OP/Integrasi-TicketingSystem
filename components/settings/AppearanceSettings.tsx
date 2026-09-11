'use client';
import { themes, useTheme } from '@/components/preferences';
import { Check, MonitorSmartphone } from 'lucide-react';

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="panel appearance-panel">
      <div className="panel-heading">
        <div>
          <h2>Tema tampilan</h2>
          <p className="muted">
            Pilih suasana workspace yang paling nyaman untuk Anda. Perubahan langsung diterapkan ke
            papan tiket, laporan, dan portal publik.
          </p>
        </div>
      </div>
      <div className="theme-grid" role="radiogroup" aria-label="Tema tampilan">
        {themes.map((t) => {
          const selected = t.id === theme;
          return (
            <label key={t.id} className="theme-option">
              <input
                type="radio"
                name="theme"
                value={t.id}
                checked={selected}
                onChange={() => setTheme(t.id)}
              />
              <span className={`theme-preview preview-${t.id}`} aria-hidden="true">
                <span className="tp-sidebar">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="tp-main">
                  <span className="tp-topbar" />
                  <span className="tp-cards">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="tp-button" />
                </span>
              </span>
              <span className="theme-option-body">
                <span className="theme-option-title">
                  <t.icon size={16} />
                  {t.label}
                  {selected && (
                    <span className="theme-check">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </span>
                <small>{t.description}</small>
              </span>
            </label>
          );
        })}
      </div>
      <div className="appearance-note">
        <MonitorSmartphone size={15} />
        Tema disimpan di browser ini, jadi setiap perangkat bisa memakai tema berbeda.
      </div>
    </section>
  );
}
