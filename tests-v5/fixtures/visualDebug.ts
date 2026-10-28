import { test as base } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

// Need to add these environment variables to the .env file to enable visual debug
// VISUAL_DEBUG=true
// DEBUG_COLOUR=red

const colours = {
  red: {
    color: 'rgba(239, 68, 68, 0.3)',
    border: '#ef4444',
  },
  blue: {
    color: 'rgba(79, 110, 247, 0.25)',
    border: '#4f6ef7',
  },
  green: {
    color: 'rgba(22, 163, 74, 0.3)',
    border: '#16a34a',
  },
};

const focusActionCSS = (border: string, color: string) => {
  return `*:focus {
      outline: 1px solid ${border} !important;
      outline-offset: 3px !important;
      border-radius: 4px !important;
       border-color: ${border} !important;
      box-shadow: 0 0 0 4px ${color} !important;
      transition: outline 0.15s ease, box-shadow 0.15s ease !important;
    }
    input:focus,
    textarea:focus,
    select:focus {
      outline: 1px solid ${border} !important;
      outline-offset: 0px !important;
      border-radius: 4px !important;
      box-shadow: 0 0 0 3px ${color}, inset 0 0 0 1px ${border} !important;
    }
    button:focus {
      outline: 1px solid ${border} !important;
      outline-offset: 3px !important;
      border-radius: 4px !important;
      box-shadow: 0 0 0 4px ${color} !important;
    }`;
}

const clickActionPulseCSS = (color: string) => {
  return `@keyframes clickPulse {
        0% {
            transform: scale(1);
            opacity: 1;
            box-shadow: 0 0 0 2px ${color};
        }
        100% {
            transform: scale(1.5);
            opacity: 0;
            box-shadow: 0 0 0 10px ${color};
        }
    }
`;
}

const visualDebug = process.env.VISUAL_DEBUG === 'true';
const defaultColor = (process.env.DEBUG_COLOUR as keyof typeof colours) || 'red';
const color = colours[defaultColor];

export const test = base.extend({
  context: async ({ context }, use) => {
    // This script runs on every page load across every page in the context

    if (visualDebug) {
      // Pre-compute static CSS strings in Node.js scope before passing into the
      // browser-serialized addInitScript callback (browser cannot access Node.js closures).

      const focusCss = focusActionCSS(color.border, color.color);
      const pulseCss = clickActionPulseCSS(color.color);

      await context.addInitScript(({ color, focusCss, pulseCss }) => {
        const injectFocusStyle = () => {
          const style = document.createElement('style');
          style.innerHTML = focusCss;
          document.head.appendChild(style);
        };

        const buildClickCSS = (event: MouseEvent) => [
          'position: fixed',
          `left: ${event.clientX - 12}px`,
          `top: ${event.clientY - 12}px`,
          'width: 24px',
          'height: 24px',
          'border-radius: 50%',
          `background-color: ${color}`,
          `border: 2px solid ${color}`,
          'pointer-events: none',
          'z-index: 999999',
          `box-shadow: 0 0 0 2px ${color}`,
          'animation: clickPulse 0.6s ease-out forwards',
        ].join(';');

        // Focus styles
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', injectFocusStyle);
        } else {
          injectFocusStyle();
        }

        // Click indicator
        window.addEventListener('mousedown', (event) => {
          if (!document.body) return;

          const clickPoint = document.createElement('div');
          clickPoint.style.cssText = buildClickCSS(event);

          // Add animation keyframes if not already added
          if (!document.getElementById('click-indicator-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'click-indicator-styles';
            styleSheet.innerHTML = pulseCss;
            document.head.appendChild(styleSheet);
          }

          document.body.appendChild(clickPoint);
          setTimeout(() => clickPoint.remove(), 600);
        });
      }, { border: color.border, color: color.color, focusCss, pulseCss });
    }

    await use(context);
  },
});

export {
  expect,
  type Page,
  type Locator,
  type BrowserContext,
  type Browser,
  type Download,
  type FileChooser,
  type Response,
} from '@playwright/test';
