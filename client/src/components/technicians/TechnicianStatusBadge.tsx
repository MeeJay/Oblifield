import type { TechnicianStatus } from '@oblifield/shared';
import { cn } from '@/utils/cn';

interface Props {
  status: TechnicianStatus;
}

const statusConfig: Record<TechnicianStatus, { label: string; dotClass: string; bgClass: string }> = {
  available:  { label: 'Available',  dotClass: 'bg-status-up',           bgClass: 'bg-status-up-bg text-status-up' },
  on_site:    { label: 'On Site',    dotClass: 'bg-status-in-progress',  bgClass: 'bg-status-in-progress-bg text-status-in-progress' },
  travelling: { label: 'Travelling', dotClass: 'bg-status-maintenance',  bgClass: 'bg-status-maintenance-bg text-status-maintenance' },
  offline:    { label: 'Offline',    dotClass: 'bg-status-paused',       bgClass: 'bg-status-paused-bg text-status-paused' },
  on_break:   { label: 'On Break',   dotClass: 'bg-status-pending',      bgClass: 'bg-status-pending-bg text-status-pending' },
};

export function TechnicianStatusBadge({ status }: Props) {
  const config = statusConfig[status] || statusConfig.offline;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
        config.bgClass,
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  );
}
