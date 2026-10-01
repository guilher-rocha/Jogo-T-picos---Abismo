import type { Color, Palette } from './colors';
import { CLASSIC_PALETTE, COLOR_NAMES } from './colors';
import type { Theme } from './renderer';
import { CLASSIC_THEME } from './renderer';

/** Converte a paleta clássica num monitor monocromático (fósforo verde, âmbar...). */
function monochrome(r: number, g: number, b: number): Palette {
  const out = {} as Palette;
  for (const name of COLOR_NAMES) {
    const hex = CLASSIC_PALETTE[name as Color];
    const v = parseInt(hex.slice(1), 16);
    const lum = (0.3 * ((v >> 16) & 255) + 0.59 * ((v >> 8) & 255) + 0.11 * (v & 255)) / 255;
    // Mantém um mínimo para tudo continuar legível.
    const k = name === 'black' ? 0 : Math.min(1, 0.25 + lum * 0.95);
    const c = (x: number) => Math.round(x * k).toString(16).padStart(2, '0');
    out[name as Color] = `#${c(r)}${c(g)}${c(b)}`;
  }
  out.black = '#050805';
  return out;
}

/** Scanlines e vinheta de monitor CRT. */
function crtOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

const HIGH_CONTRAST: Palette = {
  ...CLASSIC_PALETTE,
  darkGray: '#9a9a9a',
  memory: '#6a6a9a',
  blue: '#4a6cff',
  red: '#ff3030',
  green: '#30d030',
  brown: '#d08030',
  magenta: '#e040e0',
  darkBlue: '#202060',
  darkRed: '#701010',
  darkGreen: '#106010',
};

export const THEMES: Theme[] = [
  CLASSIC_THEME,
  { id: 'green', name: 'Fósforo verde (CRT)', palette: monochrome(80, 255, 110), font: CLASSIC_THEME.font, overlay: crtOverlay },
  { id: 'amber', name: 'Âmbar (CRT)', palette: monochrome(255, 176, 40), font: CLASSIC_THEME.font, overlay: crtOverlay },
  { id: 'contrast', name: 'Alto contraste', palette: HIGH_CONTRAST, font: CLASSIC_THEME.font },
  { id: 'typewriter', name: 'Máquina de escrever', palette: { ...CLASSIC_PALETTE }, font: '"Courier New", Courier, monospace' },
];

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? CLASSIC_THEME;
}
