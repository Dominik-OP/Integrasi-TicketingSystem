-- Theme preferences now follow the app themes (light, dark, sky) and are stored per member.
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_theme_check;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_theme_check CHECK (theme IN ('light', 'dark', 'sky', 'system'));
