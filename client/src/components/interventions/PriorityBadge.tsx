import type { InterventionPriority } from '@oblifield/shared';
import { INTERVENTION_PRIORITY_LABELS } from '@oblifield/shared';
import { cn } from '@/utils/cn';

interface Props {
  priority: InterventionPriority;
}

const priorityConfig: Record<InterventionPriority, { dotClass: string; bgClass: string }> = {
  low:    { dotClass: 'bg-gray-400',   bgClass: 'bg-gray-400/15 text-gray-400' },
  normal: { dotClass: 'bg-blue-400',   bgClass: 'bg-blue-400/15 text-blue-400' },
  high:   { dotClass: 'bg-orange-400', bgClass: 'bg-orange-400/15 text-orange-400' },
  urgent: { dotClass: 'bg-red-500 animate-pulse', bgClass: 'bg-red-500/15 text-red-500' },
};

export function PriorityBadge({ priority }: Props) {
  const config = priorityConfig[priority] || priorityConfig.normal;
  const label = INTERVENTION_PRIORITY_LABELS[priority] || priority;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
        config.bgClass,
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', config.dotClass)} />
      {label}
    </span>
  );
}
