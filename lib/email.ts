import type { ReportRecord } from '@/lib/types';

export function formatEmailSubject(report: ReportRecord) {
  const ticker = report.ticker;
  const date = report.report_date;
  if (report.report_type === '8AM') return `[${ticker}] 8AM Pre-Market Risk Brief - ${date}`;
  if (report.report_type === '1150AM') return `[${ticker}] 11:50AM Midday Flow Report - ${date}`;
  return `[${ticker}] 7PM Post-Market Strategic Analysis - ${date}`;
}

export function buildEmailPreviewHtml(report: ReportRecord) {
  const rows = report.sections.map(section => `<tr><td style="padding:10px;border-bottom:1px solid #22314e;color:#8ea0bd;vertical-align:top;white-space:nowrap">${section.title}</td><td style="padding:10px;border-bottom:1px solid #22314e;color:#e5eefb">${section.items.join('<br/>')}</td></tr>`).join('');
  const bullets = report.executive_summary.map(item => `<li>${item}</li>`).join('');
  const actions = report.suggested_actions.map(item => `<li>${item}</li>`).join('');
  return `
  <div style="background:#08111f;color:#e5eefb;font-family:Inter,Arial,sans-serif;padding:24px">
    <div style="max-width:820px;margin:0 auto;background:#0f1d34;border:1px solid #22314e;border-radius:20px;overflow:hidden">
      <div style="padding:24px 26px;background:linear-gradient(180deg,#13233f,#0f1d34)">
        <div style="color:#8ea0bd;text-transform:uppercase;letter-spacing:.16em;font-size:12px">Currenc Intelligence</div>
        <h1 style="margin:10px 0 6px;font-size:28px">${report.title}</h1>
        <div style="color:#a5b6d8">${report.company_name} (${report.ticker}) · Generated ${report.generated_at}</div>
      </div>
      <div style="padding:24px 26px">
        <h2 style="font-size:18px;margin:0 0 8px">Executive Summary</h2>
        <ul style="line-height:1.7;color:#d8e4f6">${bullets}</ul>
        <h2 style="font-size:18px;margin:24px 0 8px">Sections</h2>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
        <h2 style="font-size:18px;margin:24px 0 8px">Suggested Management Actions</h2>
        <ul style="line-height:1.7;color:#d8e4f6">${actions}</ul>
        <p style="margin-top:24px;color:#8ea0bd">Open dashboard: <a href="http://localhost:3000/monitor/${report.ticker}" style="color:#82aaff">http://localhost:3000/monitor/${report.ticker}</a></p>
      </div>
    </div>
  </div>`;
}
