'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

const acceptedExtensions = ['pdf', 'csv', 'xls', 'xlsx'];
const maxFileSize = 25 * 1024 * 1024;

function fileSize(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toLocaleString('en-US', { maximumFractionDigits: 1 })} MB`;
}

function validateFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!acceptedExtensions.includes(extension)) return 'Upload a PDF, CSV, XLS, or XLSX report.';
  if (file.size > maxFileSize) return 'The file must be 25 MB or smaller.';
  return '';
}

export function DtcReportUploadClient({ ticker }: { ticker: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');

  function assignFile(file: File | undefined) {
    if (!file) return;
    const error = validateFile(file);
    if (error) {
      setSelectedFile(null);
      setMessage(error);
      return;
    }
    setSelectedFile(file);
    setMessage('');
  }

  function proceed() {
    if (!selectedFile || !confirmed) return;
    setMessage('Your submission is ready. Secure payment and S3 upload will be connected in the next implementation stage; no charge was made.');
  }

  return (
    <div className="dtc-upload-layout">
      <main className="dtc-upload-main">
        <section className="terminal-section">
          <div className="terminal-section__head">
            <div>
              <h2>Upload DTC Position Report</h2>
              <p className="section-subtitle">Submit one report for normalization and entry into the Traditional Custody Breakdown.</p>
            </div>
            <span className="dtc-prototype-badge">Prototype · no charge today</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,.xls,.xlsx,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={event => {
              assignFile(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />

          <button
            className={`dtc-upload-dropzone ${selectedFile ? 'has-file' : ''}`}
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault();
              assignFile(event.dataTransfer.files?.[0]);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M5 14v5h14v-5" />
            </svg>
            {selectedFile ? (
              <>
                <strong>{selectedFile.name}</strong>
                <span>{fileSize(selectedFile.size)} · Ready for review</span>
                <small>Click or drop another file to replace it</small>
              </>
            ) : (
              <>
                <strong>Drop your DTC report here</strong>
                <span>or click to choose a file</span>
                <small>PDF, CSV, XLS, or XLSX · maximum 25 MB</small>
              </>
            )}
          </button>

          <label className="dtc-upload-confirmation">
            <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
            <span>I confirm this report is authorized for processing and understand the service fee is $100 per uploaded report.</span>
          </label>

          {message && <p className={`dtc-upload-message ${selectedFile && confirmed ? 'success' : 'error'}`}>{message}</p>}

          <div className="dtc-upload-actions">
            <Link className="button secondary" href={`/monitor/${ticker}/internal-float`}>Back to Internal Float</Link>
            <button className="button primary" type="button" disabled={!selectedFile || !confirmed} onClick={proceed}>
              Proceed · $100
            </button>
          </div>
        </section>
      </main>

      <aside className="dtc-upload-sidebar">
        <section className="terminal-card dtc-price-card">
          <span>Processing fee</span>
          <strong>$100</strong>
          <small>per uploaded report</small>
          <ul>
            <li>File validation and intake review</li>
            <li>Custodian and broker normalization</li>
            <li>Workspace data entry</li>
            <li>Traditional custody chart update</li>
          </ul>
        </section>

        <section className="terminal-card dtc-process-card">
          <h2>What happens next</h2>
          <ol>
            <li><span>1</span><div><strong>Upload</strong><small>Submit one authorized DTC report.</small></div></li>
            <li><span>2</span><div><strong>Review</strong><small>Our team verifies the report structure.</small></div></li>
            <li><span>3</span><div><strong>Process</strong><small>Positions are normalized by custodian.</small></div></li>
            <li><span>4</span><div><strong>Publish</strong><small>The custody breakdown is updated.</small></div></li>
          </ol>
        </section>
      </aside>
    </div>
  );
}
