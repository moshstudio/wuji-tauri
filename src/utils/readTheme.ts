import type { ReadTheme } from '@/types/book';
import { nanoid } from 'nanoid';
import tinycolor from 'tinycolor2';

export const MAX_CUSTOM_THEMES = 20;

const CUSTOM_NAME_PREFIX = '自定义 ';

export function normalizeThemeColor(color: string): string {
  const tc = tinycolor(color);
  return tc.isValid() ? tc.toHexString() : '#333333';
}

export function generateCustomThemeName(existing: ReadTheme[]): string {
  const used = new Set(
    existing
      .map(t => t.name.match(/^自定义 (\d+)$/)?.[1])
      .filter(Boolean)
      .map(Number),
  );
  let n = 1;
  while (used.has(n))
    n++;
  return `${CUSTOM_NAME_PREFIX}${n}`;
}

export function isCustomTheme(theme: ReadTheme): boolean {
  return theme.isCustom === true;
}

export function isThemeSelected(a: ReadTheme, b: ReadTheme): boolean {
  if (a.id && b.id)
    return a.id === b.id;
  return a.name === b.name;
}

export function findThemeInList(
  themes: ReadTheme[],
  theme: ReadTheme,
): ReadTheme | undefined {
  if (theme.id)
    return themes.find(t => t.id === theme.id);
  return themes.find(t => t.name === theme.name);
}

export function migrateCustomThemes(themes: ReadTheme[]): ReadTheme[] {
  let changed = false;
  const migrated = themes.map((theme) => {
    if (theme.id && theme.isCustom)
      return theme;
    changed = true;
    return {
      ...theme,
      id: theme.id || nanoid(),
      isCustom: true,
    };
  });
  return changed ? migrated : themes;
}

export function hasLowContrast(color?: string, bgColor?: string): boolean {
  if (!color || !bgColor)
    return false;
  const text = tinycolor(color);
  const bg = tinycolor(bgColor);
  if (!text.isValid() || !bg.isValid())
    return false;
  return tinycolor.readability(text, bg) < 4.5;
}

export function getThemeTileStyle(theme: ReadTheme): Record<string, string> {
  return {
    color: theme.color || '#333',
    backgroundColor: theme.bgColor || '#fff',
    backgroundImage:
      theme.bgGradient || (theme.bgImage ? `url(${theme.bgImage})` : ''),
    backgroundRepeat: theme.bgRepeat || 'repeat',
    backgroundSize: theme.bgSize || 'auto',
    backgroundPosition: theme.bgPosition || 'center',
    textShadow: theme.textShadow || '',
    boxShadow: theme.boxShadow || '',
    ...(theme.customStyle || {}),
  };
}
