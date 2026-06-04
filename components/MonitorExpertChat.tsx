'use client';

import { useEffect, useMemo, useState } from 'react';

const starterQuestions = [
  'How can management respond to short seller pressure?',
  'What changed in short interest today?',
  'Which risks should IR prioritize this week?',
];

type Message = {
  role: 'assistant' | 'user';
  text: string;
};

export function openMonitorExpertChat(question?: string) {
  window.dispatchEvent(new CustomEvent('open-monitor-expert-chat', { detail: { question } }));
}

export function MonitorExpertButton({ label = 'Ask Monitor Expert', question }: { label?: string; question?: string }) {
  return (
    <button className="button monitor-expert-inline-button" type="button" onClick={() => openMonitorExpertChat(question)}>
      {label}
    </button>
  );
}

export function MonitorExpertChat({ ticker }: { ticker: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `I can help interpret ${ticker} short pressure, float structure, sentiment, ownership, and management response priorities. LLM connectivity is not enabled yet, so this is a demo interface.`,
    },
  ]);

  const placeholderReply = useMemo(() => (
    'Demo response: the monitor expert will later review current portal data, explain the risk drivers, and suggest management and IR follow-up questions. This interface is ready for the future LLM backend.'
  ), []);

  useEffect(() => {
    function handleOpen(event: Event) {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question;
      setIsOpen(true);
      if (question) submitQuestion(question);
    }

    window.addEventListener('open-monitor-expert-chat', handleOpen);
    return () => window.removeEventListener('open-monitor-expert-chat', handleOpen);
    // submitQuestion intentionally stays stable enough for this demo UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitQuestion(question = draft.trim()) {
    const text = question.trim();
    if (!text) return;
    setMessages(current => [
      ...current,
      { role: 'user', text },
      { role: 'assistant', text: placeholderReply },
    ]);
    setDraft('');
  }

  return (
    <>
      <button className="monitor-expert-fab" type="button" onClick={() => setIsOpen(true)} aria-label="Open monitor expert chat">
        <span>AI</span>
      </button>

      {isOpen && <button className="monitor-expert-backdrop" type="button" aria-label="Close monitor expert chat" onClick={() => setIsOpen(false)} />}

      <aside className={`monitor-expert-drawer ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <div className="monitor-expert-drawer__head">
          <div>
            <span>Monitor Expert</span>
            <h2>Ask about {ticker}</h2>
          </div>
          <button className="monitor-expert-close" type="button" onClick={() => setIsOpen(false)} aria-label="Close chat">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="monitor-expert-prompts">
          {starterQuestions.map(question => (
            <button key={question} type="button" onClick={() => submitQuestion(question)}>{question}</button>
          ))}
        </div>

        <div className="monitor-expert-messages">
          {messages.map((message, index) => (
            <div className={`monitor-expert-message ${message.role}`} key={`${message.role}-${index}`}>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <form className="monitor-expert-composer" onSubmit={event => {
          event.preventDefault();
          submitQuestion();
        }}>
          <input
            value={draft}
            onChange={event => setDraft(event.target.value)}
            placeholder="Ask about short pressure, float, sentiment, or response priorities"
            suppressHydrationWarning
          />
          <button type="submit">Send</button>
        </form>
      </aside>
    </>
  );
}
