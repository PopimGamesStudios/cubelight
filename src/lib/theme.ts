import type { Settings } from "@shared/types";
import { contrastInk, isLight } from "./format";

export function applyAppearance(settings: Settings): void {
  const appearance = settings.appearance;
  const root = document.documentElement;
  root.style.setProperty("--accent", appearance.accent);
  root.style.setProperty("--accent-ink", contrastInk(appearance.accent));
  root.style.setProperty("--bg", appearance.background);
  root.style.setProperty("--surface", appearance.surface);
  root.style.setProperty("--text", appearance.text);
  root.style.setProperty("--radius", `${appearance.radius}px`);
  root.style.setProperty("--font-ui", appearance.fontFamily);
  root.style.setProperty("--font-display", appearance.displayFont);
  root.style.setProperty("--font-mono", appearance.monoFont);
  root.style.fontSize = `${appearance.fontSize}px`;
  root.dataset.density = appearance.density;
  root.dataset.pattern = appearance.backgroundPattern;
  root.dataset.motion = appearance.reduceMotion ? "reduced" : "full";
  root.dataset.theme = isLight(appearance.background) ? "light" : "dark";
  root.style.colorScheme = isLight(appearance.background) ? "light" : "dark";
  root.style.setProperty("--accent-soft", `color-mix(in srgb, ${appearance.accent} 16%, transparent)`);
  root.style.setProperty("--accent-glow", `color-mix(in srgb, ${appearance.accent} 34%, transparent)`);
  root.style.setProperty("--border", "color-mix(in srgb, var(--text) 13%, transparent)");
  root.style.setProperty("--border-strong", "color-mix(in srgb, var(--text) 24%, transparent)");
  root.style.setProperty("--muted", "color-mix(in srgb, var(--text) 55%, transparent)");
  root.style.setProperty("--faint", "color-mix(in srgb, var(--text) 34%, transparent)");
  root.style.setProperty("--surface-2", "color-mix(in srgb, var(--surface) 84%, var(--text) 16%)");
  root.style.setProperty("--surface-3", "color-mix(in srgb, var(--surface) 72%, var(--text) 28%)");
}
