import { EMBED_CONFIG } from './config';
import { closeIcon } from './icons';

export interface Survey {
  id: string;
  title: string;
  question: string;
  type: 'rating' | 'nps' | 'text';
  commentLabel: string;
  thankYouMessage: string;
  bgColor: string;
  textColor: string;
  position: 'bottom-right' | 'bottom-left' | 'center';
  delaySeconds: number;
}

const ANSWERED_KEY_PREFIX = 'echo_survey_answered_';

function isAnswered(id: string): boolean {
  try {
    return localStorage.getItem(`${ANSWERED_KEY_PREFIX}${id}`) === '1';
  } catch {
    // Private mode / blocked storage - it'll just ask again next visit
    return false;
  }
}

function markAnswered(id: string): void {
  try {
    localStorage.setItem(`${ANSWERED_KEY_PREFIX}${id}`, '1');
  } catch {
    // Ignore - the answer simply won't be remembered
  }
}

function withAlpha(hexColor: string, alpha: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor.trim());
  if (!match) {
    return hexColor;
  }
  const [, r, g, b] = match;
  return `rgba(${parseInt(r!, 16)}, ${parseInt(g!, 16)}, ${parseInt(b!, 16)}, ${alpha})`;
}

function positionStyles(position: Survey['position']): string {
  if (position === 'center') {
    return `
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
  }

  // Sit above the chat bubble so the two never overlap
  return `
    bottom: 90px;
    ${position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
  `;
}

export function createSurveysController(
  organizationId: string,
  departmentId?: string | null,
) {
  const mounted: HTMLElement[] = [];
  const timers: number[] = [];

  async function submit(survey: Survey, score: number | null, comment: string) {
    markAnswered(survey.id);

    try {
      await fetch(`${EMBED_CONFIG.CONVEX_HTTP_URL}/survey-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          score: score ?? undefined,
          comment: comment || undefined,
          metadata: {
            url: window.location.href,
            userAgent: navigator.userAgent,
          },
        }),
      });
    } catch (error) {
      console.error('Echo Widget: failed to submit survey response', error);
    }
  }

  function buildScoreButtons(
    survey: Survey,
    onPick: (score: number) => void,
  ): HTMLElement {
    const isNps = survey.type === 'nps';
    const values = isNps
      ? Array.from({ length: 11 }, (_, index) => index)
      : [1, 2, 3, 4, 5];

    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
      margin: 16px 0 4px;
    `;

    let picked: number | null = null;

    values.forEach((value) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.textContent = isNps ? String(value) : '★';
      option.setAttribute('aria-label', `Score ${value}`);
      option.style.cssText = `
        min-width: ${isNps ? '30px' : '34px'};
        height: ${isNps ? '30px' : '34px'};
        padding: 0;
        border: 1px solid ${withAlpha(survey.textColor, 0.35)};
        border-radius: 8px;
        background: transparent;
        color: ${survey.textColor};
        font-size: ${isNps ? '13px' : '18px'};
        font-weight: 600;
        line-height: 1;
        cursor: pointer;
        opacity: 0.75;
        transition: opacity 0.15s ease, background 0.15s ease;
      `;

      const paint = () => {
        values.forEach((otherValue, index) => {
          const button = row.children[index] as HTMLButtonElement;
          // Stars fill up to the pick, NPS highlights only the pick
          const on =
            picked !== null &&
            (isNps ? otherValue === picked : otherValue <= picked);
          button.style.opacity = on ? '1' : '0.75';
          button.style.background = on
            ? withAlpha(survey.textColor, 0.2)
            : 'transparent';
        });
      };

      option.addEventListener('click', () => {
        picked = value;
        paint();
        onPick(value);
      });

      row.appendChild(option);
    });

    if (isNps) {
      const legend = document.createElement('div');
      legend.style.cssText = `
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        opacity: 0.7;
        margin-top: 2px;
      `;
      const low = document.createElement('span');
      low.textContent = 'Not likely';
      const high = document.createElement('span');
      high.textContent = 'Very likely';
      legend.appendChild(low);
      legend.appendChild(high);

      const wrapper = document.createElement('div');
      wrapper.appendChild(row);
      wrapper.appendChild(legend);
      return wrapper;
    }

    return row;
  }

  function mount(survey: Survey) {
    if (isAnswered(survey.id)) {
      return;
    }

    const card = document.createElement('div');
    card.style.cssText = `
      position: fixed;
      ${positionStyles(survey.position)}
      z-index: 999996;
      box-sizing: border-box;
      width: 320px;
      max-width: calc(100vw - 40px);
      padding: 20px;
      border-radius: 16px;
      background: ${survey.bgColor};
      color: ${survey.textColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    `;

    const close = document.createElement('button');
    close.type = 'button';
    close.innerHTML = closeIcon;
    close.setAttribute('aria-label', 'Close survey');
    close.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: ${survey.textColor};
      opacity: 0.7;
      cursor: pointer;
    `;
    close.addEventListener('click', () => {
      // Dismissing counts as answered so we don't nag on every page view
      markAnswered(survey.id);
      card.remove();
    });
    card.appendChild(close);

    const body = document.createElement('div');
    card.appendChild(body);

    const showThankYou = () => {
      body.innerHTML = '';
      const done = document.createElement('p');
      done.textContent = survey.thankYouMessage;
      done.style.cssText =
        'margin: 8px 0; font-size: 14px; line-height: 1.5; text-align: center;';
      body.appendChild(done);
      window.setTimeout(() => card.remove(), 2500);
    };

    const renderForm = () => {
      let score: number | null = null;

      if (survey.title) {
        const title = document.createElement('h3');
        title.textContent = survey.title;
        title.style.cssText =
          'margin: 0 24px 6px 0; font-size: 15px; font-weight: 700; line-height: 1.3;';
        body.appendChild(title);
      }

      const question = document.createElement('p');
      question.textContent = survey.question;
      question.style.cssText =
        'margin: 0; font-size: 13px; line-height: 1.5; opacity: 0.9;';
      body.appendChild(question);

      const comment = document.createElement('textarea');
      const submitButton = document.createElement('button');

      if (survey.type !== 'text') {
        body.appendChild(
          buildScoreButtons(survey, (value) => {
            score = value;
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
            submitButton.style.cursor = 'pointer';
          }),
        );
      }

      comment.rows = 2;
      comment.placeholder = survey.commentLabel || 'Tell us more (optional)';
      comment.style.cssText = `
        box-sizing: border-box;
        width: 100%;
        margin-top: 12px;
        padding: 8px 10px;
        border: 1px solid ${withAlpha(survey.textColor, 0.3)};
        border-radius: 8px;
        background: ${withAlpha(survey.textColor, 0.08)};
        color: ${survey.textColor};
        font-family: inherit;
        font-size: 13px;
        resize: vertical;
      `;
      body.appendChild(comment);

      submitButton.type = 'button';
      submitButton.textContent = 'Submit';
      // Score surveys need a score first; text surveys are always submittable
      submitButton.disabled = survey.type !== 'text';
      submitButton.style.cssText = `
        width: 100%;
        margin-top: 12px;
        padding: 9px 16px;
        border: none;
        border-radius: 8px;
        background: ${survey.textColor};
        color: ${survey.bgColor};
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        opacity: ${submitButton.disabled ? '0.5' : '1'};
        cursor: ${submitButton.disabled ? 'not-allowed' : 'pointer'};
      `;
      submitButton.addEventListener('click', () => {
        if (submitButton.disabled) return;
        submitButton.disabled = true;
        submit(survey, score, comment.value.trim());
        showThankYou();
      });
      body.appendChild(submitButton);
    };

    renderForm();

    document.body.appendChild(card);
    mounted.push(card);
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

      const url = `${EMBED_CONFIG.CONVEX_HTTP_URL}/surveys?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { surveys?: Survey[] };

      // Only the first unanswered survey is shown, so we never stack cards
      const next = (data.surveys ?? []).find((survey) => !isAnswered(survey.id));

      if (!next) {
        return;
      }

      const delay = Math.max(0, next.delaySeconds) * 1000;
      timers.push(window.setTimeout(() => mount(next), delay));
    } catch (error) {
      console.error('Echo Widget: failed to load surveys', error);
    }
  }

  function destroy() {
    for (const timer of timers) {
      window.clearTimeout(timer);
    }
    timers.length = 0;

    for (const element of mounted) {
      element.remove();
    }
    mounted.length = 0;
  }

  return { load, destroy };
}
