import {OpeningHours} from '@/types';
import {getOpenStatus} from '@/lib/hours';

interface Props {
  hours: OpeningHours[];
}

/** Colored open/closed pill; hover reveals "until HH:MM" or "opens …". */
export default function StatusBadge({hours}: Props) {
  const status = getOpenStatus(hours);

  if (status.state === 'unknown') {
    return (
      <span className="status status-unknown" title="Hours unknown">
        <span className="status-dot" />
        <span className="status-label">Hours?</span>
      </span>
    );
  }

  const open = status.state === 'open';
  return (
    <span
      className={open ? 'status status-open' : 'status status-closed'}
      title={status.detail}
    >
      <span className="status-dot" />
      <span className="status-label">{open ? 'Open' : 'Closed'}</span>
      <span className="status-tip">{status.detail}</span>
    </span>
  );
}
