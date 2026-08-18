/**
 * A translucent version of one of the announcement's own colours, used for
 * hairlines and input backgrounds so everything stays inside the palette the
 * dashboard picked.
 */
export function withAlpha(hexColor: string, alpha: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    hexColor.trim(),
  );

  if (!match) {
    return hexColor;
  }

  const [, r, g, b] = match;

  return `rgba(${parseInt(r!, 16)}, ${parseInt(g!, 16)}, ${parseInt(b!, 16)}, ${alpha})`;
}
