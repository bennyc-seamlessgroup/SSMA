'use client';

import { useEffect } from 'react';
import { translatePortalPageText } from '@/lib/portal-page-translations';
import { usePortalLanguage } from './usePortalLanguage';

type NodeState = { source: string; rendered: string };
const textState = new WeakMap<Text, NodeState>();
const attributeState = new WeakMap<Element, Map<string, NodeState>>();
const translatedAttributes = ['aria-label', 'placeholder', 'title'] as const;
const skippedSelector = [
  'script', 'style', 'textarea', '[data-no-translate]',
  '.import-data-dev-panel tbody', '.operations-development-data tbody',
  '.narrative-feed-text', '.short-ai-analysis-copy', '.report-history-card__summary',
].join(',');

function isSkipped(node: Node) {
  return node.parentElement?.closest(skippedSelector) !== null;
}

function applyTextNode(node: Text, language: Parameters<typeof translatePortalPageText>[0]) {
  if (isSkipped(node)) return;
  const current = node.data;
  const existing = textState.get(node);
  const source = existing && current === existing.rendered ? existing.source : current;
  const rendered = translatePortalPageText(language, source, Boolean(node.parentElement?.closest('svg')));
  textState.set(node, { source, rendered });
  if (current !== rendered) node.data = rendered;
}

function applyElementAttributes(element: Element, language: Parameters<typeof translatePortalPageText>[0]) {
  if (element.closest(skippedSelector)) return;
  const states = attributeState.get(element) ?? new Map<string, NodeState>();
  translatedAttributes.forEach(attribute => {
    const current = element.getAttribute(attribute);
    if (!current) return;
    const existing = states.get(attribute);
    const source = existing && current === existing.rendered ? existing.source : current;
    const rendered = translatePortalPageText(language, source);
    states.set(attribute, { source, rendered });
    if (current !== rendered) element.setAttribute(attribute, rendered);
  });
  attributeState.set(element, states);
}

function applyTree(root: Node, language: Parameters<typeof translatePortalPageText>[0]) {
  if (root.nodeType === Node.TEXT_NODE) {
    applyTextNode(root as Text, language);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const element = root as Element;
  if (element.matches(skippedSelector)) return;
  applyElementAttributes(element, language);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) applyTextNode(node as Text, language);
    else applyElementAttributes(node as Element, language);
    node = walker.nextNode();
  }
}

export function PortalPageTranslator({ rootSelector = '.monitor-portal' }: { rootSelector?: string }) {
  const { language } = usePortalLanguage();

  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;
    applyTree(root, language);
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === 'characterData') applyTextNode(record.target as Text, language);
        record.addedNodes.forEach(node => applyTree(node, language));
        if (record.type === 'attributes') applyElementAttributes(record.target as Element, language);
      });
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributes],
    });
    return () => observer.disconnect();
  }, [language, rootSelector]);

  return null;
}
