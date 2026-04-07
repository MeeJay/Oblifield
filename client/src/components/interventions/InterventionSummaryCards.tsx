import { INTERVENTION_STATUS_LABELS } from '@oblifield/shared';
import type { InterventionStatus } from '@oblifield/shared';
import {
  Clock,
  UserCheck,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  summary: Record<string, number>;
}

const statusCardConfig: Record<
  InterventionStatus,
  { icon: typeof Clock; textClass: string; bgClass: string }
> = {
  pending:            { icon: Clock,          textClass: 'text-status-pending',      bgClass: 'bg-status-pending-bg' },
  assigned:           { icon: UserCheck,      textClass: 'text-status-maintenance',  bgClass: 'bg-status-maintenance-bg' },
  in_progress:        { icon: Play,           textClass: 'text-status-in-progress',  bgClass: 'bg-status-in-progress-bg' },
  paused:             { icon: Clock,          textClass: 'text-orange-500',           bgClass: 'bg-orange-500/10' },
  pending_validation: { icon: CheckCircle2,   textClass: 'text-purple-500',           bgClass: 'bg-purple-500/10' },
  closed:             { icon: CheckCircle2,   textClass: 'text-status-up',            bgClass: 'bg-status-up-bg' },
  issue:              { icon: AlertTriangle,  textClass: 'text-status-down',          bgClass: 'bg-status-down-bg' },
  cancelled:          { icon: XCircle,        textClass: 'text-status-paused',        bgClass: 'bg-status-paused-bg' },
};

const statusOrder: InterventionStatus[] = [
  'pending',
  'assigned',
  'in_progress',
  'paused',
  'pending_validation',
  'closed',
  'issue',
  'cancelled',
];

export function InterventionSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {statusOrder.map((status) => {
        const config = statusCardConfig[status];
        const Icon = config.icon;
        const count = summary[status] ?? 0;
        const label = INTERVENTION_STATUS_LABELS[status];

        return (
          <div
            key={status}
            className={cn(
              'rounded-lg border border-border bg-bg-secondary p-4',
              'flex flex-col items-center gap-2',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                config.bgClass,
              )}
            >
              <Icon className={cn('h-5 w-5', config.textClass)} />
            </div>
            <span className="text-2xl font-bold text-text-primary">{count}</span>
            <span className="text-xs font-medium text-text-secondary">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
