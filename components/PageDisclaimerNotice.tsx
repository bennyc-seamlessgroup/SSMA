import {
  pageDisclaimerNotices,
  type DisclaimerKey,
  type PageDisclaimerNoticeKey,
} from '@/lib/legal/disclaimers';
import { DisclaimerTooltip } from './DisclaimerTooltip';

export function PageDisclaimerNotice({
  noticeKey,
  disclaimerKey,
  title = 'Important information',
}: {
  noticeKey: PageDisclaimerNoticeKey;
  disclaimerKey: DisclaimerKey;
  title?: string;
}) {
  return (
    <aside className="page-disclaimer-notice" aria-label={title}>
      <svg className="page-disclaimer-notice__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5M12 17.2v.1" />
      </svg>
      <p>{pageDisclaimerNotices[noticeKey]}</p>
      <DisclaimerTooltip disclaimerKey={disclaimerKey} label={`View full ${title.toLowerCase()}`} />
    </aside>
  );
}
