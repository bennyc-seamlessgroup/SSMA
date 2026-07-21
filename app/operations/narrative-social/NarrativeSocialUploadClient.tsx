'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { OperationsDevelopmentData } from '@/components/OperationsDevelopmentData';
import { getOperationsTicker, setOperationsTicker } from '@/lib/operations/ticker-client';
import {
  getSocialDataPage,
  getSocialImportProgress,
  uploadSocialCsv,
  type SocialImportJob,
  type SocialMention,
  type SocialPlatform,
  type SocialUploadResponse,
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
type UploadResponseState = Partial<Record<PlatformKey, SocialUploadResponse>>;

function platformCards(ticker: string): Array<{
  key: PlatformKey;
  label: string;
  hint: string;
  jsonPath: string;
  uploadable: boolean;
}> {
  return [
    { key: 'x', label: 'X', hint: 'CSV requires platform=Twitter and datetime columns', jsonPath: `GET /social-data?ticker=${ticker}&platform=X`, uploadable: true },
    { key: 'reddit', label: 'Reddit', hint: 'CSV requires platform=Reddit and datetime columns', jsonPath: `GET /social-data?ticker=${ticker}&platform=Reddit`, uploadable: true },
    { key: 'facebook', label: 'Facebook', hint: 'Automated social feed', jsonPath: `GET /social-data?ticker=${ticker}&platform=Facebook`, uploadable: false },
    { key: 'linkedin', label: 'LinkedIn', hint: 'Automated social feed', jsonPath: `GET /social-data?ticker=${ticker}&platform=LinkedIn`, uploadable: false },
    { key: 'stocktwits', label: 'Stocktwits', hint: 'CSV requires messages__id and datetime columns', jsonPath: `GET /social-data?ticker=${ticker}&platform=Stocktwits`, uploadable: true },
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
  const [uploadResponses, setUploadResponses] = useState<UploadResponseState>({});
  const [jobs, setJobs] = useState<Record<string, SocialImportJob>>({});
  const [progressPayload, setProgressPayload] = useState<unknown>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'uploading' | 'processing' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [developmentTicker, setDevelopmentTicker] = useState('CURR');
  const finishingJobs = useRef(false);
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
      try {
        const progress = await getSocialImportProgress({ ticker: normalizedTicker });
        setProgressPayload(progress.raw);
        setJobs(Object.fromEntries(progress.jobs.map(job => [job.jobId, job])));
        setStatus(progress.jobs.length ? 'processing' : 'idle');
        setMessage(progress.jobs.length ? `${progress.jobs.length} social import job${progress.jobs.length === 1 ? '' : 's'} in progress.` : '');
      } catch {
        setJobs({});
        setStatus('idle');
        setMessage('');
      }
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

  const activeJobIds = useMemo(() => Object.values(jobs)
    .filter(job => job.status === 'PENDING' || job.status === 'PROCESSING')
    .map(job => job.jobId)
    .sort(), [jobs]);
  const activeJobKey = activeJobIds.join('|');

  useEffect(() => {
    if (!activeJobIds.length || finishingJobs.current) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const results = await Promise.all(activeJobIds.map(jobId => getSocialImportProgress({ jobId })));
        if (cancelled) return;
        const nextJobs = results.flatMap(result => result.jobs);
        const mergedJobs = { ...jobs, ...Object.fromEntries(nextJobs.map(job => [job.jobId, job])) };
        setProgressPayload(results.map(result => result.raw));
        setJobs(mergedJobs);
        const complete = nextJobs.length === activeJobIds.length && nextJobs.every(job => job.status === 'COMPLETED' || job.status === 'FAILED');
        if (complete) {
          finishingJobs.current = true;
          const completedBatch = Object.values(mergedJobs);
          const failures = completedBatch.filter(job => job.status === 'FAILED');
          if (failures.length) {
            setStatus('error');
            setMessage(failures.map(job => `${job.platform || job.filename}: ${job.error || 'Import failed.'}`).join(' '));
          } else {
            const uploadedCount = completedBatch.reduce((sum, job) => sum + job.uploadedCount, 0);
            await load(selectedTicker);
            if (!cancelled) {
              setStatus('done');
              setMessage(`Processed ${uploadedCount.toLocaleString('en-US')} records across ${completedBatch.length} platform${completedBatch.length === 1 ? '' : 's'}.`);
            }
          }
          finishingJobs.current = false;
          return;
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Unable to check social import progress.');
        }
        return;
      }
      timer = setTimeout(poll, 1500);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // The stable job key intentionally controls polling restarts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobKey, selectedTicker]);

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
      setMessage('No supported Reddit, X, or Stocktwits CSV was detected.');
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

    setStatus('uploading');
    setMessage('');
    setDevelopmentData(undefined);

    try {
      const uploads = (Object.entries(files) as Array<[PlatformKey, File | undefined]>)
        .filter((entry): entry is [PlatformKey, File] => Boolean(entry[1]));
      const responses = await Promise.all(uploads.map(async ([platform, file]) => ({
        platform,
        response: await uploadSocialCsv(selectedTicker, file),
      })));
      setUploadResponses(current => ({
        ...current,
        ...Object.fromEntries(responses.map(item => [item.platform, item.response])),
      }));
      const queuedJobs = responses.map(({ platform, response }) => ({
        jobId: response.jobId,
        status: response.status,
        ticker: selectedTicker,
        platform: cards.find(card => card.key === platform)?.label ?? platform,
        filename: files[platform]?.name ?? '',
        uploadedCount: 0,
        totalRows: 0,
        error: null,
        timestamp: new Date().toISOString(),
        raw: response,
      } satisfies SocialImportJob));
      setJobs(Object.fromEntries(queuedJobs.map(job => [job.jobId, job])));
      setFiles({});
      setStatus('processing');
      setMessage(`Queued ${responses.length} social import job${responses.length === 1 ? '' : 's'}. Processing continues in the background.`);
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
          <p>Upload Reddit, X, or Stocktwits CSV files. Each upload replaces the existing dataset for the detected platform only.</p>
        </div>
        <button className="ops-primary-button" type="button" disabled={status === 'uploading' || status === 'processing'} onClick={uploadFiles}>
          {status === 'uploading' ? 'Uploading...' : status === 'processing' ? 'Processing...' : `Upload ${readyCount || ''}`.trim()}
        </button>
      </section>

      {message && <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>}

      {Object.keys(jobs).length > 0 && (
        <section className="ops-panel ops-social-progress" aria-label="Social import progress">
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">Background Processing</span><h2>Import progress</h2></div>
            <strong>{activeJobIds.length ? `${activeJobIds.length} active` : 'Complete'}</strong>
          </div>
          <div className="ops-social-progress__list">
            {Object.values(jobs).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(job => {
              const progress = job.totalRows > 0 ? Math.min(100, Math.round((job.uploadedCount / job.totalRows) * 100)) : job.status === 'COMPLETED' ? 100 : 0;
              return (
                <article key={job.jobId} className={`is-${job.status.toLowerCase()}`}>
                  <div><strong>{job.platform || 'Social data'}</strong><span>{job.filename || job.jobId}</span></div>
                  <div className="ops-social-progress__bar"><i style={{ width: `${progress}%` }} /></div>
                  <small>{job.status} · {job.uploadedCount.toLocaleString('en-US')} / {job.totalRows ? job.totalRows.toLocaleString('en-US') : '—'}</small>
                </article>
              );
            })}
          </div>
        </section>
      )}

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
        description="Current social records, queued upload responses, and background processing progress are kept as separate API responses."
        rows={[...cards.map(platform => {
          const current = data[platform.key];
          const pendingFile = files[platform.key];
          const uploadResponse = uploadResponses[platform.key];
          return {
            endpoint: platform.uploadable && (status === 'uploading' || pendingFile || uploadResponse)
              ? `POST /social-data?ticker=${developmentTicker}`
              : current?.source || `GET /social-data?ticker=${developmentTicker}`,
            source: 'Centralized Social Data API',
            state: status === 'error' && message
              ? `error: ${message}`
              : pendingFile
                ? `${status} · file selected`
                : uploadResponse
                  ? 'upload completed'
                  : status,
            recordCount: current?.recordCount,
            updatedAt: current?.updatedAt,
            payload: current === undefined && !pendingFile && !uploadResponse ? undefined : {
              platform: platform.label,
              currentResponse: current,
              uploadResponse,
              pendingFile: pendingFile ? {
                name: pendingFile.name,
                size: pendingFile.size,
                type: pendingFile.type,
                lastModified: pendingFile.lastModified,
              } : null,
            },
          };
        }), {
          endpoint: `GET /social-data/progress?ticker=${developmentTicker}`,
          source: 'Centralized Social Data API',
          state: activeJobIds.length ? `${activeJobIds.length} active` : 'idle',
          recordCount: Object.keys(jobs).length,
          payload: progressPayload ?? Object.values(jobs),
        }]}
      />
    </div>
  );
}
