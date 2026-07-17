'use client';

import { useCallback, useEffect, useState } from 'react';

type TourStep = {
  heading: string;
  title: string;
  body: string;
};

const tourSteps: TourStep[] = [
  {
    heading: 'Executive Summary',
    title: 'Start with the current float estimate',
    body: 'Use the headline figures to understand the estimated reduction from issued shares to real tradable float before reviewing the underlying inputs.',
  },
  {
    heading: 'Ownership & Internal Float Breakdown',
    title: 'See where the shares sit',
    body: 'These charts separate institutional ownership, real tradable float, and internally tracked holdings so you can quickly see which categories constrain supply.',
  },
  {
    heading: 'Issued Share vs Real Tradable Float',
    title: 'Review the calculation bridge',
    body: 'Read the cards in order: issued shares are the starting point, each controlled holding is deducted, and real tradable float is the resulting estimate.',
  },
  {
    heading: 'Management / Strategic Holdings',
    title: 'Maintain management assumptions',
    body: 'Use Edit when supported records show a change in management or strategic holdings. Confirm whether each holding should be deducted from tradable supply.',
  },
  {
    heading: 'Tokenized Shares & Providers',
    title: 'Track tokenized supply',
    body: 'Record tokenized shares by chain and provider, then update this section when minting, redemption, migration, or custody arrangements change.',
  },
  {
    heading: 'Collateralized Shares & DeFi Exposure',
    title: 'Monitor pledged shares',
    body: 'Track shares pledged to lending protocols and review whether they remain restricted, encumbered, or potentially available to trade.',
  },
  {
    heading: 'Traditional Custody Breakdown',
    title: 'Reconcile custody information',
    body: 'Use a processed DTC position report to compare traditional broker and custodian positions with the internal assumptions shown above.',
  },
  {
    heading: 'Activity Log',
    title: 'Monitor and audit changes',
    body: 'Review saved changes, dates, and users here. Investigate material movements and reconcile the estimate regularly with current filings and provider data.',
  },
];

const storageKey = 'currenc-internal-float-tour-v1';

function findStepTarget(step: TourStep) {
  const headings = Array.from(document.querySelectorAll<HTMLElement>('.internal-float-page .terminal-section h2'));
  const heading = headings.find(item => item.textContent?.trim().includes(step.heading));
  return heading?.closest<HTMLElement>('.terminal-section') ?? null;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function InternalFloatPageTour() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetVersion, setTargetVersion] = useState(0);
  const step = tourSteps[stepIndex];

  const updateTarget = useCallback(() => {
    if (!active) return;
    const target = findStepTarget(tourSteps[stepIndex]);
    setTargetRect(target?.getBoundingClientRect() ?? null);
  }, [active, stepIndex]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setTargetRect(null);
    setActive(true);
  }, []);

  const finishTour = useCallback(() => {
    window.localStorage.setItem(storageKey, 'complete');
    setActive(false);
    setTargetRect(null);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem(storageKey) === 'complete') return;
    const timer = window.setTimeout(startTour, 900);
    return () => window.clearTimeout(timer);
  }, [startTour]);

  useEffect(() => {
    if (!active) return;
    const target = findStepTarget(step);
    if (!target) {
      const retry = window.setInterval(() => {
        if (!findStepTarget(step)) return;
        window.clearInterval(retry);
        setTargetVersion(current => current + 1);
      }, 250);
      return () => window.clearInterval(retry);
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateTarget();
    const settled = window.setTimeout(updateTarget, 420);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      window.clearTimeout(settled);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [active, step, targetVersion, updateTarget]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finishTour();
      if (event.key === 'ArrowRight') setStepIndex(current => Math.min(tourSteps.length - 1, current + 1));
      if (event.key === 'ArrowLeft') setStepIndex(current => Math.max(0, current - 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, finishTour]);

  const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
  const padding = 8;
  const visibleRect = targetRect ? {
    top: clamp(targetRect.top - padding, padding, viewportHeight - padding),
    right: clamp(targetRect.right + padding, padding, viewportWidth - padding),
    bottom: clamp(targetRect.bottom + padding, padding, viewportHeight - padding),
    left: clamp(targetRect.left - padding, padding, viewportWidth - padding),
  } : null;
  const cardWidth = Math.min(380, viewportWidth - 32);
  const cardTop = visibleRect
    ? visibleRect.bottom + 230 < viewportHeight
      ? visibleRect.bottom + 14
      : Math.max(16, visibleRect.top - 218)
    : Math.max(16, (viewportHeight - 210) / 2);
  const cardLeft = visibleRect
    ? clamp(visibleRect.left + 18, 16, viewportWidth - cardWidth - 16)
    : (viewportWidth - cardWidth) / 2;

  return (
    <>
      <section className="internal-float-tour-launcher" aria-label="Internal Float page guide">
        <div>
          <span aria-hidden="true">💡</span>
          <p><strong>New to Internal Float?</strong><small>Take a guided tour of the page and learn what to review, update, and monitor.</small></p>
        </div>
        <button className="button secondary internal-float-tour-launcher__button" type="button" onClick={startTour}>
          How to use this page
        </button>
      </section>

      {active && (
        <div className="internal-float-tour" aria-live="polite">
          {visibleRect ? (
            <>
              <div className="internal-float-tour__shade top" style={{ height: visibleRect.top }} />
              <div className="internal-float-tour__shade left" style={{ top: visibleRect.top, width: visibleRect.left, height: Math.max(0, visibleRect.bottom - visibleRect.top) }} />
              <div className="internal-float-tour__shade right" style={{ top: visibleRect.top, left: visibleRect.right, height: Math.max(0, visibleRect.bottom - visibleRect.top) }} />
              <div className="internal-float-tour__shade bottom" style={{ top: visibleRect.bottom }} />
              <div className="internal-float-tour__focus" style={{ top: visibleRect.top, left: visibleRect.left, width: Math.max(0, visibleRect.right - visibleRect.left), height: Math.max(0, visibleRect.bottom - visibleRect.top) }} />
            </>
          ) : <div className="internal-float-tour__shade full" />}

          <section
            className="internal-float-tour__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="internal-float-tour-title"
            style={{ top: cardTop, left: cardLeft, width: cardWidth }}
          >
            <div className="internal-float-tour__progress">
              <span>Step {stepIndex + 1} of {tourSteps.length}</span>
              <button type="button" onClick={finishTour} aria-label="Close guided tour">×</button>
            </div>
            <div className="internal-float-tour__dots" aria-hidden="true">
              {tourSteps.map((item, index) => <i className={index === stepIndex ? 'active' : index < stepIndex ? 'complete' : ''} key={item.heading} />)}
            </div>
            <h2 id="internal-float-tour-title">{step.title}</h2>
            <p>{step.body}</p>
            <div className="internal-float-tour__actions">
              <button className="internal-float-tour__skip" type="button" onClick={finishTour}>Skip tour</button>
              <div>
                <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex(current => Math.max(0, current - 1))}>Back</button>
                <button className="primary" type="button" onClick={() => stepIndex === tourSteps.length - 1 ? finishTour() : setStepIndex(current => current + 1)}>
                  {stepIndex === tourSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
