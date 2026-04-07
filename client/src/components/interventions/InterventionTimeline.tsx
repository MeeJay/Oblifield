import type { TimelineEvent } from '@oblifield/shared';
import { INTERVENTION_STATUS_LABELS } from '@oblifield/shared';
import { MapPin, MessageSquare, Camera, ArrowRight, UserPlus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  events: TimelineEvent[];
}

const eventIcons: Record<string, typeof MapPin> = {
  check_in:      MapPin,
  check_out:     MapPin,
  note:          MessageSquare,
  photo:         Camera,
  status_change: ArrowRight,
  assignment:    UserPlus,
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEventDescription(event: TimelineEvent): string {
  if (event.type === 'status_change' && event.previousStatus && event.newStatus) {
    const from = INTERVENTION_STATUS_LABELS[event.previousStatus] || event.previousStatus;
    const to = INTERVENTION_STATUS_LABELS[event.newStatus] || event.newStatus;
    return `Status changed from ${from} to ${to}`;
  }
  if (event.type === 'check_in') return 'Checked in';
  if (event.type === 'check_out') return 'Checked out';
  if (event.type === 'assignment') return 'Technician assigned';
  if (event.type === 'photo') return 'Photo added';
  return event.message || 'Event';
}

export function InterventionTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-text-muted">
        No timeline events yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {events.map((event, index) => {
          const Icon = eventIcons[event.type] || MessageSquare;
          const isLast = index === events.length - 1;

          return (
            <div key={event.id} className="relative flex gap-3 pl-1">
              {/* Icon circle */}
              <div
                className={cn(
                  'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                  'bg-bg-secondary border-border',
                )}
              >
                <Icon className="h-3.5 w-3.5 text-text-muted" />
              </div>

              {/* Content */}
              <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-primary">
                    {event.technicianName || 'System'}
                  </span>
                  <span className="text-xs text-text-muted">
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </div>

                <p className="mt-0.5 text-sm text-text-secondary">
                  {getEventDescription(event)}
                </p>

                {event.message && event.type === 'note' && (
                  <p className="mt-1 rounded-md bg-bg-tertiary px-3 py-2 text-sm text-text-primary">
                    {event.message}
                  </p>
                )}

                {event.photoUrl && (
                  <img
                    src={event.photoUrl}
                    alt="Timeline photo"
                    className="mt-2 max-w-xs rounded-md border border-border"
                  />
                )}

                {event.latitude != null && event.longitude != null && (
                  <span className="mt-1 block text-[10px] text-text-muted">
                    GPS: {Number(event.latitude).toFixed(6)}, {Number(event.longitude).toFixed(6)}
                    {event.accuracy != null && ` (~${Math.round(Number(event.accuracy))}m)`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
