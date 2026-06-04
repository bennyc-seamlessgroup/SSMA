import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';
import { readPageContent } from '@/lib/import-data';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function recordList(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export default async function SmartMoneyPage() {
  const pageContent = await readPageContent('smartMoney');
  const hero = record(pageContent.hero);
  const cards = recordList(pageContent.cards);
  const displayCards = cards.length ? cards : [
    { label: 'Institutional Activity', value: 'Accumulation Watch', note: 'Review ownership changes and activist filings below.' },
    { label: 'Insider Activity', value: 'Neutral', note: 'Review Form 3/4/5 style imported records below.' },
    { label: 'Options Activity', value: 'Bullish', note: 'Review put/call and gamma files below.' },
  ];

  return (
    <ImportDataPreviewPage
      title="Smart Money Intelligence"
      description={text(pageContent.pageDescription, 'Institutional ownership, shareholder changes, insider activity, and options positioning research.')}
      files={[
        'ownership/top_holders.json',
        'ownership/ownership_changes.json',
        'ownership/activist_filings.json',
        'insider/insider_transactions.json',
        'insider/net_insider_activity.json',
        'options/put_call_ratio.json',
        'options/open_interest.json',
        'options/gamma_exposure.json',
      ]}
    >
      <div className="research-module-grid">
        <div className="research-hero-card"><span>{text(hero.signalLabel, 'Smart Money Signal')}</span><strong>{text(hero.signalValue, 'Bullish Bias')}</strong><p>{text(hero.description, 'Detailed ownership, insider, and options records remain below. Use this page to validate what institutions, insiders, and options traders are doing.')}</p></div>
        {displayCards.map(card => (
          <div className="research-mini-card" key={String(card.label)}>
            <span>{String(card.label)}</span>
            <strong>{String(card.value)}</strong>
            <small>{String(card.note)}</small>
          </div>
        ))}
      </div>
    </ImportDataPreviewPage>
  );
}
