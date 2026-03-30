import type { Intervention } from '@oblifield/shared';
import { INTERVENTION_TYPE_LABELS } from '@oblifield/shared';
import { Calendar, User, Building2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { InterventionStatusBadge } from './InterventionStatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  intervention: Intervention;
  onClick?: () => void;
}

export function InterventionCard({ intervention, onClick }: Props) {
  const scheduledDate = intervention.scheduledAt
    ? new Date(intervention.scheduledAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <button
      onClick={onClick}
      data-status={intervention.status}
      className={cn(
        'w-full rounded-lg bg-bg-secondary border border-border p-4 text-left',
        'transition-colors hover:bg-bg-hover hover:border-border-light',
        'focus:outline-none focus:ring-1 focus:ring-accent',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <InterventionStatusBadge status={intervention.status} size="sm" />
            <PriorityBadge priority={intervention.priority} />
          </div>

          <h3 className="text-sm font-medium text-text-primary truncate mt-2">
            {intervention.title}
          </h3>

          <span className="text-xs text-text-muted">
            {INTERVENTION_TYPE_LABELS[intervention.type] || intervention.type}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
        {intervention.clientName && (
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-text-muted" />
            {intervention.clientName}
          </span>
        )}

        {intervention.assignedTechnicianName && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-text-muted" />
            {intervention.assignedTechnicianName}
          </span>
        )}

        {scheduledDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-text-muted" />
            {scheduledDate}
          </span>
        )}
      </div>
    </button>
  );
}
