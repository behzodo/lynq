import { EMBED_CONFIG } from './config';
import { chatBubbleIcon, closeIcon } from './icons';
import { createAnnouncementsController } from './announcements';
import { createSurveysController } from './surveys';
import { createEmbedClient } from './client';

(function() {
  let iframe: HTMLIFrameElement | null = null;
  let container: HTMLDivElement | null = null;
  let button: HTMLButtonElement | null = null;
  let isOpen = false;
  let announcements: ReturnType<typeof createAnnouncementsController> | null = null;
  let surveys: ReturnType<typeof createSurveysController> | null = null;

  // Drag state
  const BUTTON_SIZE = 60;
  const EDGE_MARGIN = 20;
  const PANEL_GAP = 10;
  const PANEL_WIDTH = 400;
  const PANEL_HEIGHT = 600;
  const MOBILE_BREAKPOINT = 640;
  const DRAG_THRESHOLD = 4;
  const POSITION_STORAGE_KEY = 'echo-widget-button-position';

  let logoUrl: string | null = null;
  let buttonPos: { x: number; y: number } | null = null;
  // Desktop panel height, adjustable by the widget's "resize" message. Kept in
  // a variable because the mobile sheet overwrites the inline style.
  let panelHeightPx = PANEL_HEIGHT;
  let isDragging = false;
  let suppressClick = false;
  let dragPointerId: number | null = null;
  let dragOffset = { x: 0, y: 0 };

  // Get configuration from script tag
  let organizationId: string | null = null;
  // Which product this page belongs to. Optional: without it the page only
  // ever sees organization-wide announcements and surveys.
  let departmentId: string | null = null;
  let position: 'bottom-right' | 'bottom-left' = EMBED_CONFIG.DEFAULT_POSITION;

  // Try to get the current script
  const currentScript = document.currentScript as HTMLScriptElement;
  if (currentScript) {
    organizationId = currentScript.getAttribute('data-organization-id');
    departmentId = currentScript.getAttribute('data-department-id');
    position = (currentScript.getAttribute('data-position') as 'bottom-right' | 'bottom-left') || EMBED_CONFIG.DEFAULT_POSITION;
  } else {
    // Fallback: find script tag by src
    const scripts = document.querySelectorAll('script[src*="embed"]');
    const embedScript = Array.from(scripts).find(script =>
      script.hasAttribute('data-organization-id')
    ) as HTMLScriptElement;

    if (embedScript) {
      organizationId = embedScript.getAttribute('data-organization-id');
      departmentId = embedScript.getAttribute('data-department-id');
      position = (embedScript.getAttribute('data-position') as 'bottom-right' | 'bottom-left') || EMBED_CONFIG.DEFAULT_POSITION;
    }
  }
  
  // Exit if no organization ID
  if (!organizationId) {
    console.error('Echo Widget: data-organization-id attribute is required');
    return;
  }
  
  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function defaultButtonPos() {
    return {
      x: position === 'bottom-right'
        ? window.innerWidth - BUTTON_SIZE - EDGE_MARGIN
        : EDGE_MARGIN,
      y: window.innerHeight - BUTTON_SIZE - EDGE_MARGIN,
    };
  }

  function clampButtonPos(pos: { x: number; y: number }) {
    return {
      x: clamp(pos.x, EDGE_MARGIN, window.innerWidth - BUTTON_SIZE - EDGE_MARGIN),
      y: clamp(pos.y, EDGE_MARGIN, window.innerHeight - BUTTON_SIZE - EDGE_MARGIN),
    };
  }

  function loadButtonPos() {
    try {
      const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
        return { x: parsed.x, y: parsed.y };
      }
    } catch {
      // localStorage may be unavailable (private mode, blocked cookies)
    }
    return null;
  }

  function saveButtonPos() {
    if (!buttonPos) return;
    try {
      window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(buttonPos));
    } catch {
      // Ignore write failures, the position just won't persist
    }
  }

  function isMobileViewport(): boolean {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function applyPositions() {
    if (!buttonPos) return;

    if (button) {
      button.style.left = `${buttonPos.x}px`;
      button.style.top = `${buttonPos.y}px`;
    }

    if (!container) return;

    // On phones a floating 400x600 card is unusable, so the panel becomes a
    // full-screen sheet and the launcher keeps floating above it.
    if (isMobileViewport()) {
      container.style.left = '0px';
      container.style.top = '0px';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.maxWidth = 'none';
      container.style.maxHeight = 'none';
      container.style.borderRadius = '0px';
      return;
    }

    container.style.maxWidth = `calc(100vw - ${EDGE_MARGIN * 2}px)`;
    container.style.maxHeight = `calc(100vh - ${EDGE_MARGIN * 2}px)`;
    container.style.borderRadius = '20px';

    const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - EDGE_MARGIN * 2);
    const panelHeight = Math.min(panelHeightPx, window.innerHeight - EDGE_MARGIN * 2);

    container.style.height = `${panelHeight}px`;

    const buttonCenterX = buttonPos.x + BUTTON_SIZE / 2;
    // Align the panel to whichever side of the button has more room
    let left = buttonCenterX > window.innerWidth / 2
      ? buttonPos.x + BUTTON_SIZE - panelWidth
      : buttonPos.x;
    left = clamp(left, EDGE_MARGIN, window.innerWidth - panelWidth - EDGE_MARGIN);

    // Prefer opening above the button, fall back to below
    let top = buttonPos.y - panelHeight - PANEL_GAP;
    if (top < EDGE_MARGIN) {
      top = buttonPos.y + BUTTON_SIZE + PANEL_GAP;
    }
    top = clamp(top, EDGE_MARGIN, window.innerHeight - panelHeight - EDGE_MARGIN);

    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
    container.style.width = `${panelWidth}px`;
  }

  function onPointerDown(event: PointerEvent) {
    if (!button || event.button !== 0) return;

    dragPointerId = event.pointerId;
    isDragging = false;
    const rect = button.getBoundingClientRect();
    dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    button.setPointerCapture(event.pointerId);
    button.addEventListener('pointermove', onPointerMove);
    button.addEventListener('pointerup', onPointerUp);
    button.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(event: PointerEvent) {
    if (dragPointerId !== event.pointerId || !button) return;

    const next = clampButtonPos({
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y,
    });

    if (!isDragging) {
      const movedX = Math.abs(next.x - (buttonPos?.x ?? next.x));
      const movedY = Math.abs(next.y - (buttonPos?.y ?? next.y));
      if (movedX < DRAG_THRESHOLD && movedY < DRAG_THRESHOLD) return;

      isDragging = true;
      button.style.transition = 'none';
      button.style.cursor = 'grabbing';
      if (container) container.style.transition = 'none';
    }

    event.preventDefault();
    buttonPos = next;
    applyPositions();
  }

  function onPointerUp(event: PointerEvent) {
    if (dragPointerId !== event.pointerId || !button) return;

    button.releasePointerCapture(event.pointerId);
    button.removeEventListener('pointermove', onPointerMove);
    button.removeEventListener('pointerup', onPointerUp);
    button.removeEventListener('pointercancel', onPointerUp);
    dragPointerId = null;

    if (!isDragging) return;

    isDragging = false;
    // Swallow the click that follows the drag so the widget doesn't toggle
    suppressClick = true;
    button.style.transition = 'all 0.2s ease';
    button.style.cursor = 'grab';
    if (container) container.style.transition = 'all 0.3s ease';
    saveButtonPos();
  }

  function onWindowResize() {
    if (!buttonPos) return;
    buttonPos = clampButtonPos(buttonPos);
    applyPositions();
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }
  
  function render() {
    // Create floating action button
    button = document.createElement('button');
    button.id = 'echo-widget-button';
    button.innerHTML = chatBubbleIcon;
    button.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${BUTTON_SIZE}px;
      height: ${BUTTON_SIZE}px;
      border-radius: 50%;
      background: #171717;
      color: white;
      border: none;
      cursor: grab;
      touch-action: none;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(59, 130, 246, 0.35);
      transition: all 0.2s ease;
    `;
    
    button.addEventListener('click', (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      toggleWidget();
    });
    button.addEventListener('pointerdown', onPointerDown);
    button.addEventListener('mouseenter', () => {
      if (button && !isDragging) button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
      if (button && !isDragging) button.style.transform = 'scale(1)';
    });

    document.body.appendChild(button);
    
    // Create container (hidden by default)
    container = document.createElement('div');
    container.id = 'echo-widget-container';
    container.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${PANEL_WIDTH}px;
      height: ${PANEL_HEIGHT}px;
      max-width: calc(100vw - ${EDGE_MARGIN * 2}px);
      max-height: calc(100vh - ${EDGE_MARGIN * 2}px);
      z-index: 999998;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(15, 23, 42, 0.22), 0 2px 8px rgba(15, 23, 42, 0.12);
      display: none;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `;
    
    // Create iframe
    iframe = document.createElement('iframe');
    iframe.src = buildWidgetUrl();
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;
    // Add permissions for microphone and clipboard
    iframe.allow = 'microphone; clipboard-read; clipboard-write';
    
    container.appendChild(iframe);
    document.body.appendChild(container);

    // Restore the last dragged position, falling back to the configured corner
    buttonPos = clampButtonPos(loadButtonPos() || defaultButtonPos());
    applyPositions();
    window.addEventListener('resize', onWindowResize);

    // Handle messages from widget
    window.addEventListener('message', handleMessage);

    // Banners, popups and surveys render on the host page, outside the iframe.
    // Both feeds share one client so the targeting is configured once.
    const client = createEmbedClient(organizationId!, departmentId);

    announcements = createAnnouncementsController(client);
    announcements.load();

    surveys = createSurveysController(client);
    surveys.load();

    loadBrandLogo();
  }

  // Swaps the default chat glyph for the organization's logo once it arrives.
  // Failures are silent: the default icon is a perfectly good fallback.
  function loadBrandLogo() {
    fetch(
      `${EMBED_CONFIG.CONVEX_HTTP_URL}/widget-settings?organizationId=${encodeURIComponent(organizationId!)}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.logoUrl || !button) return;

        logoUrl = data.logoUrl;

        if (!isOpen) {
          button.innerHTML = brandLogoMarkup();
        }
      })
      .catch(() => {
        // Keep the default icon
      });
  }

  function brandLogoMarkup(): string {
    return `<img src="${logoUrl}" alt="" style="width: 60%; height: 60%; object-fit: contain; border-radius: 6px; pointer-events: none;" />`;
  }

  function closedButtonMarkup(): string {
    return logoUrl ? brandLogoMarkup() : chatBubbleIcon;
  }
  
  function buildWidgetUrl(): string {
    const params = new URLSearchParams();
    params.append('organizationId', organizationId!);
    return `${EMBED_CONFIG.WIDGET_URL}?${params.toString()}`;
  }
  
  function handleMessage(event: MessageEvent) {
    if (event.origin !== new URL(EMBED_CONFIG.WIDGET_URL).origin) return;
    
    const { type, payload } = event.data;
    
    switch (type) {
      case 'close':
        hide();
        break;
      case 'resize':
        if (payload.height && container) {
          panelHeightPx = payload.height;
          applyPositions();
        }
        break;
    }
  }
  
  function toggleWidget() {
    if (isOpen) {
      hide();
    } else {
      show();
    }
  }
  
  function show() {
    if (container && button) {
      isOpen = true;
      container.style.display = 'block';
      applyPositions();
      // Trigger animation
      setTimeout(() => {
        if (container) {
          container.style.opacity = '1';
          container.style.transform = 'translateY(0)';
        }
      }, 10);
      // Change button icon to close
      button.innerHTML = closeIcon;
    }
  }
  
  function hide() {
    if (container && button) {
      isOpen = false;
      container.style.opacity = '0';
      container.style.transform = 'translateY(10px)';
      // Hide after animation
      setTimeout(() => {
        if (container) container.style.display = 'none';
      }, 300);
      // Restore the brand logo, or the default chat icon
      button.innerHTML = closedButtonMarkup();
      button.style.background = '#171717';
    }
  }
  
  function destroy() {
    window.removeEventListener('message', handleMessage);
    window.removeEventListener('resize', onWindowResize);
    if (button && dragPointerId !== null) {
      button.removeEventListener('pointermove', onPointerMove);
      button.removeEventListener('pointerup', onPointerUp);
      button.removeEventListener('pointercancel', onPointerUp);
    }
    dragPointerId = null;
    isDragging = false;
    suppressClick = false;
    // Cleared so a reinit with a different organization refetches its logo
    logoUrl = null;
    if (announcements) {
      announcements.destroy();
      announcements = null;
    }
    if (surveys) {
      surveys.destroy();
      surveys = null;
    }
    if (container) {
      container.remove();
      container = null;
      iframe = null;
    }
    if (button) {
      button.remove();
      button = null;
    }
    isOpen = false;
  }
  
  // Function to reinitialize with new config
  function reinit(newConfig: { organizationId?: string; departmentId?: string | null; position?: 'bottom-right' | 'bottom-left' }) {
    // Destroy existing widget
    destroy();

    // Update config
    if (newConfig.organizationId) {
      organizationId = newConfig.organizationId;
    }
    // Explicit null clears it, so a caller can move back to organization-wide
    if (newConfig.departmentId !== undefined) {
      departmentId = newConfig.departmentId;
    }
    if (newConfig.position) {
      position = newConfig.position;
      // An explicit position overrides a previously dragged position
      buttonPos = null;
      try {
        window.localStorage.removeItem(POSITION_STORAGE_KEY);
      } catch {
        // Ignore storage failures
      }
    }
    
    // Reinitialize
    init();
  }
  
  // Expose API to global scope
  (window as any).EchoWidget = {
    init: reinit,
    show,
    hide,
    destroy
  };
  
  // Auto-initialize
  init();
})();
