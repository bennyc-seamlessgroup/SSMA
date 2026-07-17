'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { OperationsDevelopmentData } from '@/components/OperationsDevelopmentData';
import { getOperationsTicker, setOperationsTicker } from '@/lib/operations/ticker-client';
import {
  getSocialDataPage,
  uploadStocktwitsCsv,
  type SocialMention,
  type SocialPlatform,
} from '@/lib/social-data-api';

type PlatformKey = 'x' | 'reddit' | 'facebook' | 'linkedin' | 'stocktwits';

type SocialMentionFile = {
  source: string;
  platform: SocialPlatform;
  updatedAt: string;
  recordCount: number;
  data: SocialMention[];
  raw: unknown;
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
    { key: 'x', label: 'X', hint: 'Automated social feed', jsonPath: `GET /social-data?ticker=${ticker}&platform=Twitter`, uploadable: false },
    { key: 'reddit', label: 'Reddit', hint: 'Automated social feed', jsonPath: `GET /social-data?ticker=${ticker}&platform=Reddit`, uploadable: false },
    { key: 'facebook', label: 'Facebook', hint: 'Automated social feed', jsonPath: `GET /social-data?ticker=${ticker}&platform=Facebook`, uploadable: false },
    { key: 'linkedin', label: 'LinkedIn', hint: 'Automated social feed', jsonPath: `GET /social-data?ticker=${ticker}&platform=LinkedIn`, uploadable: false },
    { key: 'stocktwits', label: 'Stocktwits', hint: 'CSV with message ID, timestamp, author, content, and sentiment fields', jsonPath: `POST /social-data?ticker=${ticker}`, uploadable: true },
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
  const [files, setFiles] = useState<Partial<Record<PlatformKey, File>>>({});
  const [data, setData] = useState<Partial<UploadState>>({});
  const [developmentData, setDevelopmentData] = useState<Partial<UploadState>>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'uploading' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [developmentTicker, setDevelopmentTicker] = useState('CURR');
  const inputRefs = useRef<Record<PlatformKey, HTMLInputElement | null>>({
    x: null,
    reddit: null,
    facebook: null,
    linkedin: null,
    stocktwits: null,
  });

  async function load(ticker = selectedTicker) {
    const normalizedTicker = ticker.trim().toUpperCase() || 'CURR';
    setStatus('loading');
    setDevelopmentTicker(normalizedTicker);
    setDevelopmentData(undefined);
    try {
      const definitions = platformCards(normalizedTicker);
      const responses = await Promise.all(definitions.map(async platform => {
        const apiPlatform: SocialPlatform = platform.key === 'x'
          ? 'X'
          : platform.key === 'linkedin'
            ? 'Linkedin'
            : `${platform.key[0].toUpperCase()}${platform.key.slice(1)}` as SocialPlatform;
        const response = await getSocialDataPage({
          ticker: normalizedTicker,
          platform: apiPlatform,
          page: 1,
          limit: 100,
        });
        const latestTimestamp = response.records
          .map(row => row.timestamp)
          .filter(Boolean)
          .sort((a, b) => b.localeCompare(a))[0] ?? '';
        return [platform.key, {
          source: platform.jsonPath,
          platform: apiPlatform,
          updatedAt: latestTimestamp,
          recordCount: response.pagination.totalItems,
          data: response.records,
          raw: response.raw,
        }] as const;
      }));
      const payload = Object.fromEntries(responses) as UploadState;
      setSelectedTicker(normalizedTicker);
      setOperationsTicker(normalizedTicker);
      setData(payload);
      setDevelopmentData(payload);
      setFiles({});
      setStatus('idle');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load current social data.');
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
      setMessage('No uploadable Stocktwits CSV was detected. Other platforms are maintained by the automated social-data pipeline.');
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

    const file = files.stocktwits;
    if (!file) return;

    setStatus('uploading');
    setMessage('');
    setDevelopmentData(undefined);

    try {
      const payload = await uploadStocktwitsCsv(selectedTicker, file);
      await load(selectedTicker);
      setFiles({});
      setStatus('done');
      setMessage(payload.message || `Uploaded ${(payload.uploadedCount ?? 0).toLocaleString('en-US')} Stocktwits records.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    }
  }

  return (
    <div className="ops-social-page">
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
          <p>Use this workspace for the Stocktwits CSV. Reddit, X, Facebook, and LinkedIn are loaded through the automated social-data API.</p>
        </div>
        <button className="ops-primary-button" type="button" disabled={status === 'uploading'} onClick={uploadFiles}>
          {status === 'uploading' ? 'Uploading...' : `Upload ${readyCount || ''}`.trim()}
        </button>
      </section>

      {message && <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>}

      <div className="ops-upload-grid">
        {cards.map(platform => {
          const selectedFile = files[platform.key];
          const current = developmentData?.[platform.key];
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
                <strong>{disabled ? 'API managed' : selectedFile?.name ?? 'Choose CSV'}</strong>
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
                <span>API source</span>
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
                )) : <p>No API records available.</p>}
              </div>
            </section>
          );
        })}
      </div>

      <OperationsDevelopmentData
        title="Social Data API Responses"
        description="Current per-platform GET /social-data payloads and the Stocktwits POST /social-data upload state."
        rows={cards.map(platform => {
          const current = data[platform.key];
          const pendingFile = files[platform.key];
          return {
            endpoint: platform.key === 'stocktwits' && (status === 'uploading' || pendingFile)
              ? `POST /social-data?ticker=${developmentTicker}`
              : current?.source || `GET /social-data?ticker=${developmentTicker}`,
            source: 'Centralized Social Data API',
            state: status === 'error' && message ? `error: ${message}` : pendingFile ? `${status} · file selected` : status,
            recordCount: current?.recordCount,
            updatedAt: current?.updatedAt,
            payload: current === undefined && !pendingFile ? undefined : {
              platform: platform.label,
              response: current,
              pendingFile: pendingFile ? {
                name: pendingFile.name,
                size: pendingFile.size,
                type: pendingFile.type,
                lastModified: pendingFile.lastModified,
              } : null,
            },
          };
        })}
      />
    </div>
  );
}
