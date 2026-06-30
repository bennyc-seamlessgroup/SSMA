'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getOperationsTicker, setOperationsTicker } from '@/lib/operations/ticker-client';

type PlatformKey = 'x' | 'reddit' | 'stocktwits';

type SocialMentionFile = {
  updatedAt: string;
  recordCount: number;
  originalFileName: string;
  data: Array<{
    id: string;
    author: string;
    timestamp: string;
    text: string;
    sentiment_label: string;
  }>;
};

type UploadState = Record<PlatformKey, SocialMentionFile>;

function platformCards(ticker: string): Array<{
  key: PlatformKey;
  label: string;
  hint: string;
  jsonPath: string;
  uploadable: boolean;
}> {
  return [
    { key: 'x', label: 'X', hint: `S3-managed from social-data/Twitter__${ticker}`, jsonPath: `public S3 prefix: social-data/Twitter__${ticker}`, uploadable: false },
    { key: 'reddit', label: 'Reddit', hint: `S3-managed from social-data/Reddit_${ticker}`, jsonPath: `public S3 prefix: social-data/Reddit_${ticker}`, uploadable: false },
    { key: 'stocktwits', label: 'Stocktwits', hint: 'message ID, followers, likes, reshares', jsonPath: `import_data/social/stocktwits_${ticker}_mentions.json`, uploadable: true },
  ];
}

function classifyFile(file: File): PlatformKey | null {
  const name = file.name.toLowerCase();
  if (name.includes('reddit')) return 'reddit';
  if (name.includes('stocktwits')) return 'stocktwits';
  if (name.includes('x_') || name.includes('- x') || name.includes('twitter') || name.includes('mentions')) return 'x';
  return null;
}

function formatDateTime(value: string) {
  if (!value) return 'Not uploaded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function NarrativeSocialUploadClient() {
  const [selectedTicker, setSelectedTicker] = useState('CURR');
  const [tickerDraft, setTickerDraft] = useState('CURR');
  const [files, setFiles] = useState<Partial<Record<PlatformKey, File>>>({});
  const [data, setData] = useState<Partial<UploadState>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'uploading' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const inputRefs = useRef<Record<PlatformKey, HTMLInputElement | null>>({ x: null, reddit: null, stocktwits: null });

  async function load(ticker = selectedTicker) {
    const normalizedTicker = ticker.trim().toUpperCase() || 'CURR';
    setStatus('loading');
    try {
      const response = await fetch(`/api/operations/narrative-social?ticker=${encodeURIComponent(normalizedTicker)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to load current narrative social data.');
      setSelectedTicker(normalizedTicker);
      setOperationsTicker(normalizedTicker);
      setTickerDraft(normalizedTicker);
      setData(payload.data);
      setFiles({});
      setStatus('idle');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load current narrative social data.');
    }
  }

  useEffect(() => {
    load(getOperationsTicker());
    // Initial operations workspace load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readyCount = useMemo(() => Object.values(files).filter(Boolean).length, [files]);
  const cards = useMemo(() => platformCards(selectedTicker), [selectedTicker]);

  function assignFiles(fileList: FileList | File[], forcedPlatform?: PlatformKey) {
    const next: Partial<Record<PlatformKey, File>> = {};
    Array.from(fileList).forEach(file => {
      if (!file.name.toLowerCase().endsWith('.csv')) return;
      const platform = forcedPlatform ?? classifyFile(file);
      if (platform && !cards.find(card => card.key === platform)?.uploadable) return;
      if (platform) next[platform] = file;
    });
    setFiles(current => ({ ...current, ...next }));
    if (!Object.keys(next).length) {
      setStatus('error');
      setMessage('No uploadable Stocktwits CSV was detected. Reddit and X are now loaded from S3.');
    } else {
      setStatus('idle');
      setMessage('');
    }
  }

  async function uploadFiles() {
    if (!readyCount) {
      setStatus('error');
      setMessage('Attach at least one CSV before uploading.');
      return;
    }

    const formData = new FormData();
    formData.append('ticker', selectedTicker);
    cards.forEach(platform => {
      const file = files[platform.key];
      if (platform.uploadable && file) formData.append(platform.key, file);
    });

    setStatus('uploading');
    setMessage('');

    try {
      const response = await fetch('/api/operations/narrative-social', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Upload failed.');
      setData(payload.data);
      setFiles({});
      setStatus('done');
      setMessage(`Updated ${Object.keys(payload.updated ?? {}).length} narrative JSON file(s).`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    }
  }

  return (
    <div className="ops-social-page">
      <div className="ops-ticker-context">
        <label>
          <span>Company ticker</span>
          <input value={tickerDraft} maxLength={10} onChange={event => setTickerDraft(event.target.value.toUpperCase())} />
        </label>
        <button type="button" onClick={() => load(tickerDraft)} disabled={status === 'loading' || status === 'uploading'}>
          {status === 'loading' ? 'Loading...' : 'Load Workspace'}
        </button>
        <small>Stocktwits target: social/stocktwits_{selectedTicker}_mentions.json</small>
      </div>
      <section
        className="ops-panel ops-social-dropzone"
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault();
          assignFiles(event.dataTransfer.files);
        }}
      >
        <div>
          <span className="ops-eyebrow">Batch Upload</span>
          <h2>Drop CSV files here</h2>
          <p>Reddit and X are loaded from S3. Use this tool only for the Stocktwits manual CSV until that feed is automated.</p>
        </div>
        <button className="ops-primary-button" type="button" disabled={status === 'uploading'} onClick={uploadFiles}>
          {status === 'uploading' ? 'Uploading...' : `Upload ${readyCount || ''}`.trim()}
        </button>
      </section>

      {message && <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>}

      <div className="ops-upload-grid">
        {cards.map(platform => {
          const selectedFile = files[platform.key];
          const current = data[platform.key];
          const previewRows = current?.data?.slice(0, 3) ?? [];
          const disabled = !platform.uploadable;

          return (
            <section className={`ops-panel ops-upload-zone ${selectedFile ? 'is-ready' : ''}${disabled ? ' is-disabled' : ''}`} key={platform.key}>
              <input
                ref={node => {
                  inputRefs.current[platform.key] = node;
                }}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={event => {
                  if (!disabled && event.target.files) assignFiles(event.target.files, platform.key);
                  event.currentTarget.value = '';
                }}
              />
              <button
                type="button"
                className="ops-upload-target"
                disabled={disabled}
                onClick={() => {
                  if (!disabled) inputRefs.current[platform.key]?.click();
                }}
                onDragOver={event => event.preventDefault()}
                onDrop={event => {
                  event.preventDefault();
                  if (!disabled) assignFiles(event.dataTransfer.files, platform.key);
                }}
              >
                <span>{platform.label}</span>
                <strong>{disabled ? 'S3 managed' : selectedFile?.name ?? 'Choose CSV'}</strong>
                <small>{platform.hint}</small>
              </button>

              <div className="ops-social-summary">
                <div>
                  <small>Current records</small>
                  <strong>{(current?.recordCount ?? 0).toLocaleString('en-US')}</strong>
                </div>
                <div>
                  <small>Last upload</small>
                  <strong>{formatDateTime(current?.updatedAt ?? '')}</strong>
                </div>
              </div>

              <div className="ops-storage-box">
                <span>Local JSON</span>
                <strong>{platform.jsonPath}</strong>
              </div>

              <div className="ops-social-preview">
                <span className="ops-eyebrow">Preview</span>
                {previewRows.length ? previewRows.map(row => (
                  <article key={row.id}>
                    <strong>{row.author || 'Unknown author'}</strong>
                    <p>{row.text || 'No text provided.'}</p>
                    <small>{formatDateTime(row.timestamp)} · {row.sentiment_label || 'Unclassified'}</small>
                  </article>
                )) : <p>No local records yet.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
