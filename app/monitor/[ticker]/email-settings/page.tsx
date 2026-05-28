'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ImportDataTable } from '@/components/ImportDataTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { SettingsBackLink } from '@/components/SettingsBackLink';
import type { EmailRecipient } from '@/lib/types';

const deliveryWindows = [
  { key: 'send8am', label: 'Pre-market brief', time: '8:00 AM ET', description: 'Opening setup, overnight news, pre-market movement, and executive watch items.' },
  { key: 'send1150', label: 'Midday flow report', time: '11:50 AM ET', description: 'Intraday price action, volume, short pressure, options signals, and narrative changes.' },
  { key: 'send7pm', label: 'Post-market analysis', time: '7:00 PM ET', description: 'Close recap, filings/news review, ownership updates, and next-day risk watch.' },
] as const;

export default function DeliverySettingsPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params?.ticker ?? 'CURR').toUpperCase();
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [send8am, setSend8am] = useState(true);
  const [send1150, setSend1150] = useState(true);
  const [send7pm, setSend7pm] = useState(true);

  async function loadRecipients() {
    const res = await fetch(`/api/email-recipients/${ticker}`);
    const json = await res.json();
    setRecipients(json.recipients);
  }

  useEffect(() => { loadRecipients(); }, [ticker]);

  async function addRecipient() {
    if (!email.trim()) {
      setMessage('Enter an email address before saving.');
      return;
    }
    const res = await fetch('/api/email-recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, email, receive_8am: send8am, receive_1150am: send1150, receive_7pm: send7pm }),
    });
    const json = await res.json();
    setRecipients(json.recipients);
    setEmail('');
    setMessage('Recipient saved.');
  }

  async function removeRecipient(id: string) {
    const res = await fetch(`/api/email-recipients/delete/${id}`, { method: 'DELETE' });
    const json = await res.json();
    setRecipients(json.recipients);
  }

  async function testEmail() {
    const res = await fetch('/api/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
    });
    const json = await res.json();
    setMessage(json.message);
  }

  const activeWindows = [send8am, send1150, send7pm].filter(Boolean).length;
  const tableRows = recipients.map(recipient => ({
    email: recipient.email,
    preMarket: recipient.receive_8am ? 'Yes' : 'No',
    midday: recipient.receive_1150am ? 'Yes' : 'No',
    postMarket: recipient.receive_7pm ? 'Yes' : 'No',
    status: recipient.active ? 'Active' : 'Inactive',
    remove: `Remove:${recipient.id}`,
  }));

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Delivery Settings</h1>
          <p className="page__desc">
            Configure report windows, recipient routing, and delivery controls for the {ticker} workspace.
          </p>
        </div>
        <div className="page-header-actions">
          <SettingsBackLink ticker={ticker} />
          <button className="button secondary" onClick={testEmail}>Send test email</button>
        </div>
      </div>

      <section className="grid cols-4">
        <div className="metric">
          <div className="metric__label with-info">Active windows <InfoTooltip text="Number of scheduled report windows currently enabled for this company workspace." /></div>
          <div className="metric__value">{activeWindows}</div>
          <div className="metric__note">of 3 daily report windows</div>
        </div>
        <div className="metric">
          <div className="metric__label with-info">Recipients <InfoTooltip text="Active recipients who can receive one or more scheduled company intelligence reports." /></div>
          <div className="metric__value">{recipients.length}</div>
          <div className="metric__note">workspace routing list</div>
        </div>
        <div className="metric">
          <div className="metric__label with-info">Timezone <InfoTooltip text="Timezone used to schedule report delivery windows for this company." /></div>
          <div className="metric__value" style={{ fontSize: 22 }}>{timezone.replace('America/', '')}</div>
          <div className="metric__note">delivery clock</div>
        </div>
        <div className="metric">
          <div className="metric__label with-info">Approval mode <InfoTooltip text="Controls whether reports are sent automatically or held for internal review before delivery." /></div>
          <div className="metric__value" style={{ fontSize: 22 }}>Review</div>
          <div className="metric__note">demo workflow setting</div>
        </div>
      </section>

      <section className="grid cols-2">
        <div className="panel">
          <div className="section__head">
            <h2 className="panel__title with-info">Report Windows <InfoTooltip text="Scheduled report times for recurring company intelligence delivery." /></h2>
          </div>
          <div className="section-list">
            <div className="section">
              <div className="sidebar__label">Delivery timezone</div>
              <select className="input" value={timezone} onChange={event => setTimezone(event.target.value)}>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            {deliveryWindows.map(window => {
              const checked = window.key === 'send8am' ? send8am : window.key === 'send1150' ? send1150 : send7pm;
              const onChange = window.key === 'send8am' ? setSend8am : window.key === 'send1150' ? setSend1150 : setSend7pm;
              return (
                <label className="section delivery-window-row" key={window.key}>
                  <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
                  <span>
                    <strong>{window.label}</strong>
                    <small>{window.time} · {window.description}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="section__head">
            <h2 className="panel__title with-info">Recipient Routing <InfoTooltip text="Controls who receives each scheduled report window." /></h2>
          </div>
          <div className="section-list">
            <input className="input" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@company.com" />
            <div className="delivery-window-toggle-row">
              <label><input type="checkbox" checked={send8am} onChange={event => setSend8am(event.target.checked)} /> Pre-market</label>
              <label><input type="checkbox" checked={send1150} onChange={event => setSend1150(event.target.checked)} /> Midday</label>
              <label><input type="checkbox" checked={send7pm} onChange={event => setSend7pm(event.target.checked)} /> Post-market</label>
            </div>
            <button className="button" onClick={addRecipient}>Add recipient</button>
            {message && <p className="page__desc delivery-message">{message}</p>}
          </div>
        </div>
      </section>

      <section className="grid cols-2">
        <div className="panel">
          <div className="section__head">
            <h2 className="panel__title with-info">Delivery Governance <InfoTooltip text="Operational controls that define how reports are reviewed, retained, and sent." /></h2>
          </div>
          <div className="section-list">
            <div className="section"><strong>Approval before send</strong><p className="page__desc">Enabled for executive-ready report review.</p></div>
            <div className="section"><strong>Market holiday skip</strong><p className="page__desc">Enabled for US trading holidays and weekends.</p></div>
            <div className="section"><strong>Archive copy</strong><p className="page__desc">Every sent PDF is retained in the report archive.</p></div>
          </div>
        </div>

        <div className="panel">
          <div className="section__head">
            <h2 className="panel__title with-info">Recipients <InfoTooltip text="Searchable recipient list for this company workspace." /></h2>
          </div>
          {tableRows.length ? (
            <RecipientTable rows={tableRows} onRemove={removeRecipient} />
          ) : (
            <p className="page__desc">No recipients configured yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function RecipientTable({ rows, onRemove }: { rows: Array<Record<string, string>>; onRemove: (id: string) => void }) {
  const visibleRows = rows.map(row => ({ ...row, remove: row.remove.replace('Remove:', '') }));
  return (
    <div className="recipient-table-wrap">
      <ImportDataTable columns={['email', 'preMarket', 'midday', 'postMarket', 'status']} rows={visibleRows} pageSize={25} />
      <div className="recipient-remove-list">
        {rows.map(row => (
          <button className="button secondary" key={row.remove} onClick={() => onRemove(row.remove.replace('Remove:', ''))}>Remove {row.email}</button>
        ))}
      </div>
    </div>
  );
}
