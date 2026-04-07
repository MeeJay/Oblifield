import type { InterventionStatus } from '@oblifield/shared';
import { INTERVENTION_STATUS_LABELS } from '@oblifield/shared';
import { cn } from '@/utils/cn';

interface Props {
  status: InterventionStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<InterventionStatus, { dotClass: string; bgClass: string }> = {
  pending:            { dotClass: 'bg-status-pending',      bgClass: 'bg-status-pending-bg text-status-pending' },
  assigned:           { dotClass: 'bg-status-maintenance',   bgClass: 'bg-status-maintenance-bg text-status-maintenance' },
  in_progress:        { dotClass: 'bg-status-in-progress',   bgClass: 'bg-status-in-progress-bg text-status-in-progress' },
  paused:             { dotClass: 'bg-orange-500',            bgClass: 'bg-orange-500/10 text-orange-500' },
  pending_validation: { dotClass: 'bg-purple-500',            bgClass: 'bg-purple-500/10 text-purple-500' },
  closed:             { dotClass: 'bg-status-up',             bgClass: 'bg-status-up-bg text-status-up' },
  issue:              { dotClass: 'bg-status-down',           bgClass: 'bg-status-down-bg text-status-down' },
  cancelled:          { dotClass: 'bg-status-paused',         bgClass: 'bg-status-paused-bg text-status-paused' },
};

const sizes = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
};

export function InterventionStatusBadge({ status, size = 'md' }: Props) {
  const config = statusConfig[status] || statusConfig.pending;
  const label = INTERVENTION_STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        config.bgClass,
        sizes[size],
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', config.dotClass)} />
      {label}
    </span>
  );
}
