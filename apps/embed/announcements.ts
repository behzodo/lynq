import { EMBED_CONFIG } from './config';
import { closeIcon } from './icons';

export interface Announcement {
  id: string;
  type: 'banner' | 'popup';
  title: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  bgColor: string;
  textColor: string;
  position: 'top' | 'bottom';
  dismissible: boolean;
}

const DISMISS_KEY_PREFIX = 'echo_announcement_dismissed_';

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
  if (!announcement.ctaLabel || !announcement.ctaUrl) {
    return null;
  }

  const link = document.createElement('a');
  link.href = announcement.ctaUrl;
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
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999997;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    position: relative;
    width: 100%;
    max-width: 420px;
    box-sizing: border-box;
    padding: 28px;
    border-radius: 16px;
    background: ${announcement.bgColor};
    color: ${announcement.textColor};
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    text-align: center;
  `;

  if (announcement.title) {
    const title = document.createElement('h2');
    title.textContent = announcement.title;
    title.style.cssText = 'margin: 0 0 10px; font-size: 20px; font-weight: 700; line-height: 1.3;';
    card.appendChild(title);
  }

  const message = document.createElement('p');
  message.textContent = announcement.message;
  message.style.cssText = 'margin: 0; font-size: 15px; line-height: 1.5; opacity: 0.9;';
  card.appendChild(message);

  const cta = createCtaButton(announcement);
  if (cta) {
    cta.style.marginTop = '20px';
    card.appendChild(cta);
  }

  if (announcement.dismissible) {
    const dismiss = createDismissButton(announcement.textColor, onDismiss);
    dismiss.style.position = 'absolute';
    dismiss.style.top = '12px';
    dismiss.style.right = '12px';
    card.appendChild(dismiss);

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        onDismiss();
      }
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

  function mount(announcement: Announcement) {
    if (isDismissed(announcement.id)) {
      return;
    }

    const remove = () => {
      markDismissed(announcement.id);
      element.remove();
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
      element.remove();
    }
    mounted.length = 0;
  }

  return { load, destroy };
}
