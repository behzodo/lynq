import { EMBED_CONFIG } from './config';
import { closeIcon } from './icons';

export type AnnouncementMediaType = 'image' | 'video' | 'youtube';

export interface Announcement {
  id: string;
  type: 'banner' | 'popup';
  title: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  /** null when the announcement has no media, or when it's a banner */
  mediaType: AnnouncementMediaType | null;
  mediaUrl: string;
  bgColor: string;
  textColor: string;
  position: 'top' | 'bottom';
  dismissible: boolean;
}

const DISMISS_KEY_PREFIX = 'echo_announcement_dismissed_';
const STYLE_ELEMENT_ID = 'echo-announcement-styles';

// Mixes a colour with the card background so hover states work whatever
// palette the organization picked, light or dark.
function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

// Keyframes and scrollbar rules can't live in inline styles, so they go in a
// single stylesheet injected the first time an announcement mounts.
function ensureStyles(): void {
  if (document.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = `
    @keyframes echo-popup-backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes echo-popup-card-in {
      from { opacity: 0; transform: translateY(12px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .echo-popup-backdrop {
      animation: echo-popup-backdrop-in 0.2s ease-out both;
    }
    .echo-popup-card {
      animation: echo-popup-card-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .echo-popup-body {
      scrollbar-width: thin;
    }
    .echo-popup-body::-webkit-scrollbar {
      width: 6px;
    }
    .echo-popup-body::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: currentColor;
      opacity: 0.2;
    }
    .echo-popup-youtube:hover .echo-popup-play,
    .echo-popup-youtube:focus-visible .echo-popup-play {
      transform: scale(1.08);
    }
    .echo-popup-youtube:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: -3px;
    }
    @media (prefers-reduced-motion: reduce) {
      .echo-popup-backdrop,
      .echo-popup-card {
        animation: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function isDismissed(id: string): boolean {
  try {
    return localStorage.getItem(`${DISMISS_KEY_PREFIX}${id}`) === '1';
  } catch {
    // Private mode / blocked storage - just show it again next time
    return false;
  }
}

function markDismissed(id: string): void {
  try {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${id}`, '1');
  } catch {
    // Ignore - dismissal simply won't persist
  }
}

function createDismissButton(color: string, onDismiss: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.innerHTML = closeIcon;
  button.setAttribute('aria-label', 'Dismiss');
  button.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${color};
    opacity: 0.7;
    cursor: pointer;
  `;
  button.addEventListener('mouseenter', () => { button.style.opacity = '1'; });
  button.addEventListener('mouseleave', () => { button.style.opacity = '0.7'; });
  button.addEventListener('click', onDismiss);
  return button;
}

function createCtaButton(announcement: Announcement): HTMLAnchorElement | null {
  const href = safeUrl(announcement.ctaUrl);

  if (!announcement.ctaLabel || !href) {
    return null;
  }

  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = announcement.ctaLabel;
  link.style.cssText = `
    display: inline-block;
    flex-shrink: 0;
    padding: 8px 16px;
    border-radius: 8px;
    background: ${announcement.textColor};
    color: ${announcement.bgColor};
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  `;
  return link;
}

// Announcement URLs are authored in the dashboard, but they end up as live
// attributes on a customer's page, so anything that isn't plain http(s) - most
// of all javascript: - is dropped rather than rendered.
function safeUrl(url: string): string {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.href
      : '';
  } catch {
    return '';
  }
}

// Accepts whatever an admin is likely to paste: a watch link, a share link, an
// embed or shorts URL, or the bare eleven-character id.
export function youtubeVideoId(url: string): string | null {
  const trimmed = url.trim();

  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0] ?? '';
    return /^[\w-]{11}$/.test(id) ? id : null;
  }

  if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'youtube-nocookie.com') {
    return null;
  }

  const fromQuery = parsed.searchParams.get('v');
  if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) {
    return fromQuery;
  }

  // /embed/<id>, /shorts/<id>, /live/<id>
  const match = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
  return match?.[1] ?? null;
}

// A poster frame plus a play button. Clicking swaps in the real player, so the
// popup costs one image until the visitor actually wants to watch - and the
// visitor is never handed off to youtube.com.
function renderYoutube(url: string, textColor: string): HTMLElement | null {
  const videoId = youtubeVideoId(url);
  if (!videoId) {
    return null;
  }

  const frame = document.createElement('button');
  frame.type = 'button';
  frame.className = 'echo-popup-media echo-popup-youtube';
  frame.setAttribute('aria-label', 'Play video');
  frame.style.cssText = `
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    background: rgba(0, 0, 0, 0.25);
    cursor: pointer;
    aspect-ratio: 16 / 9;
  `;

  const poster = document.createElement('img');
  // maxres is the only 16:9 thumbnail, but it doesn't exist for every upload,
  // so fall back to the always-present 4:3 one and crop it.
  poster.src = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  poster.alt = '';
  poster.loading = 'lazy';
  poster.style.cssText = 'display: block; width: 100%; height: 100%; object-fit: cover;';
  poster.addEventListener('error', () => {
    poster.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }, { once: true });
  frame.appendChild(poster);

  const play = document.createElement('span');
  play.className = 'echo-popup-play';
  play.innerHTML = `
    <svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true">
      <path d="M66.52 7.74a8.55 8.55 0 0 0-6-6C55.2 0 34 0 34 0S12.8 0 7.48 1.74a8.55 8.55 0 0 0-6 6A89.4 89.4 0 0 0 0 24a89.4 89.4 0 0 0 1.48 16.26 8.55 8.55 0 0 0 6 6C12.8 48 34 48 34 48s21.2 0 26.52-1.74a8.55 8.55 0 0 0 6-6A89.4 89.4 0 0 0 68 24a89.4 89.4 0 0 0-1.48-16.26Z" fill="#f00"/>
      <path d="M27 34 45 24 27 14Z" fill="#fff"/>
    </svg>
  `;
  play.style.cssText = `
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
    transition: transform 0.18s ease;
  `;
  frame.appendChild(play);

  frame.addEventListener('click', () => {
    const player = document.createElement('iframe');
    // -nocookie so an unwatched popup doesn't set advertising cookies
    player.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;
    player.title = 'Video';
    player.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    player.allowFullscreen = true;
    player.className = 'echo-popup-media';
    player.style.cssText = 'display: block; width: 100%; border: none; aspect-ratio: 16 / 9; background: #000;';
    // Inherit the full-bleed geometry the caller applied to the poster
    player.style.margin = frame.style.margin;
    player.style.width = frame.style.width || '100%';
    player.style.borderRadius = frame.style.borderRadius;
    frame.replaceWith(player);
  });

  // Keeps the focus ring visible against arbitrary card colours
  frame.style.outlineColor = textColor;

  return frame;
}

function renderMedia(announcement: Announcement): HTMLElement | null {
  if (!announcement.mediaType) {
    return null;
  }

  const url = safeUrl(announcement.mediaUrl);
  if (!url && announcement.mediaType !== 'youtube') {
    return null;
  }

  let element: HTMLElement | null = null;

  if (announcement.mediaType === 'youtube') {
    element = renderYoutube(announcement.mediaUrl, announcement.textColor);
  } else if (announcement.mediaType === 'image') {
    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    image.loading = 'lazy';
    image.className = 'echo-popup-media';
    image.style.cssText =
      'display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: rgba(0, 0, 0, 0.2);';
    element = image;
  } else {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.playsInline = true;
    // metadata gives a poster frame without pulling the whole file down
    video.preload = 'metadata';
    video.className = 'echo-popup-media';
    video.style.cssText =
      'display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #000;';
    element = video;
  }

  return element;
}

function renderBanner(announcement: Announcement, onDismiss: () => void): HTMLElement {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: fixed;
    ${announcement.position === 'top' ? 'top: 0;' : 'bottom: 0;'}
    left: 0;
    right: 0;
    z-index: 999997;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    box-sizing: border-box;
    padding: 12px 20px;
    background: ${announcement.bgColor};
    color: ${announcement.textColor};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  `;

  const text = document.createElement('div');
  text.style.cssText = 'display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; min-width: 0;';

  if (announcement.title) {
    const title = document.createElement('strong');
    title.textContent = announcement.title;
    text.appendChild(title);
  }

  const message = document.createElement('span');
  message.textContent = announcement.message;
  text.appendChild(message);

  bar.appendChild(text);

  const cta = createCtaButton(announcement);
  if (cta) {
    cta.style.padding = '6px 14px';
    bar.appendChild(cta);
  }

  if (announcement.dismissible) {
    bar.appendChild(createDismissButton(announcement.textColor, onDismiss));
  }

  return bar;
}

function renderPopup(announcement: Announcement, onDismiss: () => void): HTMLElement {
  ensureStyles();

  const backdrop = document.createElement('div');
  backdrop.className = 'echo-popup-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999997;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(9, 9, 11, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  const card = document.createElement('div');
  card.className = 'echo-popup-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.style.cssText = `
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 440px;
    max-height: calc(100vh - 48px);
    box-sizing: border-box;
    padding: 32px;
    border-radius: 20px;
    border: 1px solid ${tint(announcement.textColor, 10)};
    background: ${announcement.bgColor};
    color: ${announcement.textColor};
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.18);
    text-align: left;
  `;

  // Media sits above the copy, bled to the card edges by cancelling the padding
  const media = renderMedia(announcement);
  if (media) {
    media.style.margin = '-32px -32px 24px';
    media.style.width = 'calc(100% + 64px)';
    media.style.flexShrink = '0';
    // One pixel inside the card's own 20px radius, to sit flush with the border
    media.style.borderRadius = '19px 19px 0 0';
    media.style.overflow = 'hidden';
    card.appendChild(media);
  }

  if (announcement.title) {
    const title = document.createElement('h2');
    title.textContent = announcement.title;
    // Room on the right so long titles never run under the dismiss button
    title.style.cssText = `
      margin: 0 0 12px;
      padding-right: ${announcement.dismissible ? '36px' : '0'};
      font-size: 22px;
      font-weight: 650;
      line-height: 1.25;
      letter-spacing: -0.02em;
    `;
    card.appendChild(title);
  }

  // Long announcements scroll inside the card instead of pushing the CTA
  // off-screen or growing the card past the viewport.
  const body = document.createElement('div');
  body.className = 'echo-popup-body';
  body.style.cssText = 'min-height: 0; overflow-y: auto; overscroll-behavior: contain;';

  const message = document.createElement('p');
  message.textContent = announcement.message;
  message.style.cssText = 'margin: 0; font-size: 15px; line-height: 1.6; opacity: 0.72;';
  body.appendChild(message);
  card.appendChild(body);

  const cta = createCtaButton(announcement);
  if (cta) {
    cta.style.cssText += `
      margin-top: 24px;
      align-self: flex-start;
      padding: 11px 20px;
      border-radius: 10px;
      font-size: 14.5px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
      transition: transform 0.15s ease, opacity 0.15s ease;
    `;
    cta.addEventListener('mouseenter', () => {
      cta.style.transform = 'translateY(-1px)';
      cta.style.opacity = '0.92';
    });
    cta.addEventListener('mouseleave', () => {
      cta.style.transform = 'translateY(0)';
      cta.style.opacity = '1';
    });
    card.appendChild(cta);
  }

  if (announcement.dismissible) {
    const dismiss = createDismissButton(announcement.textColor, onDismiss);
    dismiss.style.position = 'absolute';
    dismiss.style.top = '16px';
    dismiss.style.right = '16px';
    dismiss.style.width = '32px';
    dismiss.style.height = '32px';
    dismiss.style.borderRadius = '50%';
    dismiss.style.opacity = '0.55';
    dismiss.style.transition = 'background 0.15s ease, opacity 0.15s ease';

    // Over media the button sits on an unknown image, so it gets its own scrim
    // instead of relying on contrast with the card colour.
    const restingBackground = media ? 'rgba(0, 0, 0, 0.45)' : 'transparent';
    const hoverBackground = media
      ? 'rgba(0, 0, 0, 0.65)'
      : tint(announcement.textColor, 12);

    if (media) {
      dismiss.style.color = '#ffffff';
      dismiss.style.opacity = '0.9';
    }
    dismiss.style.background = restingBackground;

    dismiss.addEventListener('mouseenter', () => {
      dismiss.style.background = hoverBackground;
    });
    dismiss.addEventListener('mouseleave', () => {
      dismiss.style.background = restingBackground;
    });
    card.appendChild(dismiss);

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        onDismiss();
      }
    });

    // Escape closes it, like any other modal. The listener is torn down by the
    // dismiss handler and by destroy(), via the element's own removal hook.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    backdrop.addEventListener('echo-popup-teardown', () => {
      document.removeEventListener('keydown', onKeyDown);
    });
  }

  backdrop.appendChild(card);
  return backdrop;
}

export function createAnnouncementsController(
  organizationId: string,
  departmentId?: string | null,
) {
  const mounted: HTMLElement[] = [];

  // Lets an element clean up listeners it attached outside itself (the popup's
  // Escape handler) before it leaves the DOM.
  function unmount(element: HTMLElement) {
    element.dispatchEvent(new CustomEvent('echo-popup-teardown'));
    element.remove();
  }

  function mount(announcement: Announcement) {
    if (isDismissed(announcement.id)) {
      return;
    }

    const remove = () => {
      markDismissed(announcement.id);
      unmount(element);
    };

    const element =
      announcement.type === 'banner'
        ? renderBanner(announcement, remove)
        : renderPopup(announcement, remove);

    document.body.appendChild(element);
    mounted.push(element);
  }

  async function load() {
    if (!EMBED_CONFIG.CONVEX_HTTP_URL) {
      return;
    }

    try {
      const params = new URLSearchParams({ organizationId });
      if (departmentId) {
        params.set('departmentId', departmentId);
      }

      const url = `${EMBED_CONFIG.CONVEX_HTTP_URL}/announcements?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { announcements?: Announcement[] };

      // Only one popup at a time so we never stack modals on top of each other
      let popupShown = false;

      for (const announcement of data.announcements ?? []) {
        if (announcement.type === 'popup') {
          if (popupShown) continue;
          popupShown = true;
        }
        mount(announcement);
      }
    } catch (error) {
      console.error('Echo Widget: failed to load announcements', error);
    }
  }

  function destroy() {
    for (const element of mounted) {
      unmount(element);
    }
    mounted.length = 0;
  }

  return { load, destroy };
}
