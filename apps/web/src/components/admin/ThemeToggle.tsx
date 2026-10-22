'use client';

/**
 * Dark-mode only product: the light theme was removed. This component is
 * kept as a no-op so existing AdminShell imports keep compiling; it
 * renders nothing. Dark is forced via globals.css + TamaguiProvider.
 */
export function ThemeToggle() {
  return null;
}
