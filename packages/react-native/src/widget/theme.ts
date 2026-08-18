/**
 * A small palette, so the widget looks deliberate without dragging a design
 * system into the host app. Only the accent is configurable - it is the one
 * colour a brand actually needs to change.
 */
export interface LynqTheme {
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  destructive: string;
  radius: number;
}

export const defaultTheme: LynqTheme = {
  accent: "#171717",
  accentForeground: "#ffffff",
  background: "#ffffff",
  foreground: "#09090b",
  muted: "#f4f4f5",
  mutedForeground: "#71717a",
  border: "#e4e4e7",
  destructive: "#dc2626",
  radius: 12,
};

export const buildTheme = (accent?: string): LynqTheme =>
  accent ? { ...defaultTheme, accent } : defaultTheme;
