import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Clock,
  UserCheck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CalendarDays,
  Activity,
} from 'lucide-react';
import type {
  Intervention,
  InterventionStatus,
  TimelineEvent,
} from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

const STATUS_CARD_CONFIG: Record<
  InterventionStatus,
  { label: string; colorClass: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending',
    colorClass: 'text-yellow-500',
    icon: <Clock size={20} />,
  },
  assigned: {
    label: 'Assigned',
    colorClass: 'text-blue-500',
    icon: <UserCheck size={20} />,
  },
  in_progress: {
    label: 'In Progress',
    colorClass: 'text-accent',
    icon: <Wrench size={20} />,
  },
  done: {
    label: 'Done',
    colorClass: 'text-green-500',
    icon: <CheckCircle2 size={20} />,
  },
  issue: {
    label: 'Issue',
    colorClass: 'text-red-500',
    icon: <AlertTriangle size={20} />,
  },
  cancelled: {
    label: 'Cancelled',
    colorClass: 'text-gray-500',
    icon: <XCircle size={20} />,
  },
};

function StatusBadge({ status }: { status: InterventionStatus }) {
  const cfg = STATUS_CARD_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'pending' && 'bg-yellow-500/10 text-yellow-500',
        status === 'assigned' && 'bg-blue-500/10 text-blue-500',
        status === 'in_progress' && 'bg-accent/10 text-accent',
        status === 'done' && 'bg-green-500/10 text-green-500',
        status === 'issue' && 'bg-red-500/10 text-red-500',
        status === 'cancelled' && 'bg-gray-500/10 text-gray-500',
      )}
    >
      {cfg?.label ?? status}
    </span>
  );
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Record<InterventionStatus, number> | null>(null);
  const [schedule, setSchedule] = useState<Intervention[]>([]);
  const [recentEvents, setRecentEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sum, sched] = await Promise.all([
          interventionsApi.getSummary(),
          interventionsApi.getSchedule(),
        ]);
        setSummary(sum);
        setSchedule(sched);

        // Load recent activity from the first few scheduled interventions
        const eventPromises = sched.slice(0, 5).map((i) =>
          interventionsApi.getTimeline(i.id, 3).catch(() => [] as TimelineEvent[]),
        );
        const allEvents = (await Promise.all(eventPromises)).flat();
        allEvents.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setRecentEvents(allEvents.slice(0, 10));
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statuses: InterventionStatus[] = [
    'pending',
    'assigned',
    'in_progress',
    'done',
    'issue',
    'cancelled',
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <Link to="/intervention/new">
          <Button variant="primary" size="sm">
            <Plus size={16} className="mr-1.5" />
            New Intervention
          </Button>
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statuses.map((status) => {
          const cfg = STATUS_CARD_CONFIG[status];
          const count = summary?.[status] ?? 0;
          return (
            <div
              key={status}
              className="rounded-lg border border-border bg-bg-secondary p-4"
            >
              <div className={cn('flex items-center gap-2 mb-1', cfg.colorClass)}>
                {cfg.icon}
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <div className="text-sm text-text-secondary">{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Today's Schedule */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">
            Today&apos;s Schedule
          </h2>
          <span className="ml-2 text-sm text-text-secondary">
            ({schedule.length} intervention{schedule.length !== 1 ? 's' : ''})
          </span>
        </div>

        {schedule.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary">No interventions scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedule.map((intervention) => (
              <Link
                key={intervention.id}
                to={`/intervention/${intervention.id}`}
                className="block rounded-lg border border-border bg-bg-secondary p-4 hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-mono text-accent">
                      {formatTime(intervention.scheduledAt)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {intervention.title}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {intervention.clientName ?? 'No client'}
                        {intervention.assignedTechnicianName &&
                          ` \u2022 ${intervention.assignedTechnicianName}`}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={intervention.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
        </div>

        {recentEvents.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary">No recent activity.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border bg-bg-secondary p-3 flex items-start gap-3"
              >
                <div className="text-xs text-text-secondary whitespace-nowrap mt-0.5">
                  {new Date(event.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary">
                    <span className="font-medium">
                      {event.technicianName ?? 'System'}
                    </span>
                    {' \u2014 '}
                    <span className="text-text-secondary capitalize">
                      {event.type.replace('_', ' ')}
                    </span>
                  </div>
                  {event.message && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {event.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
