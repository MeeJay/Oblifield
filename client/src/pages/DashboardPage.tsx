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
  Users,
} from 'lucide-react';
import type {
  Intervention,
  InterventionStatus,
  Technician,
  TechnicianStatus,
  TimelineEvent,
} from '@oblifield/shared';
import { INTERVENTION_STATUS_LABELS } from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { techniciansApi } from '@/api/technicians.api';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

const STATUS_CARD_CONFIG: Record<
  InterventionStatus,
  { label: string; colorClass: string; icon: React.ReactNode }
> = {
  pending: { label: 'En attente', colorClass: 'text-yellow-500', icon: <Clock size={20} /> },
  assigned: { label: 'Assign\u00e9e', colorClass: 'text-blue-500', icon: <UserCheck size={20} /> },
  in_progress: { label: 'En cours', colorClass: 'text-accent', icon: <Wrench size={20} /> },
  paused: { label: 'En pause', colorClass: 'text-orange-500', icon: <Clock size={20} /> },
  pending_validation: { label: 'En validation', colorClass: 'text-purple-500', icon: <CheckCircle2 size={20} /> },
  closed: { label: 'Cl\u00f4tur\u00e9e', colorClass: 'text-green-500', icon: <CheckCircle2 size={20} /> },
  issue: { label: 'Probl\u00e8me', colorClass: 'text-red-500', icon: <AlertTriangle size={20} /> },
  cancelled: { label: 'Annul\u00e9e', colorClass: 'text-gray-500', icon: <XCircle size={20} /> },
};

const TECH_STATUS_CONFIG: Record<TechnicianStatus, { label: string; color: string }> = {
  available: { label: 'Disponible', color: 'bg-green-500' },
  on_site: { label: 'Sur site', color: 'bg-accent' },
  travelling: { label: 'En route', color: 'bg-blue-500' },
  offline: { label: 'Hors ligne', color: 'bg-gray-500' },
  on_break: { label: 'En pause', color: 'bg-yellow-500' },
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '--:--';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Record<InterventionStatus, number> | null>(null);
  const [schedule, setSchedule] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [recentEvents, setRecentEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sum, sched, techs] = await Promise.all([
          interventionsApi.getSummary(),
          interventionsApi.getSchedule(),
          techniciansApi.list(),
        ]);
        setSummary(sum);
        setSchedule(sched);
        setTechnicians(techs);

        const eventPromises = sched.slice(0, 5).map((i) =>
          interventionsApi.getTimeline(i.id, 3).catch(() => [] as TimelineEvent[]),
        );
        const allEvents = (await Promise.all(eventPromises)).flat();
        allEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentEvents(allEvents.slice(0, 10));
      } catch {
        toast.error('Erreur de chargement du tableau de bord');
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

  const statuses: InterventionStatus[] = ['pending', 'assigned', 'in_progress', 'paused', 'pending_validation', 'closed', 'issue', 'cancelled'];
  const activeCount = (summary?.pending ?? 0) + (summary?.assigned ?? 0) + (summary?.in_progress ?? 0) + (summary?.paused ?? 0);

  // Technician availability stats
  const techByStatus = new Map<TechnicianStatus, number>();
  for (const t of technicians) {
    techByStatus.set(t.status, (techByStatus.get(t.status) ?? 0) + 1);
  }

  const EVENT_TYPE_LABELS: Record<string, string> = {
    check_in: 'Check-in',
    check_out: 'Check-out',
    note: 'Note',
    photo: 'Photo',
    status_change: 'Changement de statut',
    assignment: 'Assignation',
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Tableau de bord</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {activeCount} intervention{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/intervention/new">
          <Button variant="primary" size="sm">
            <Plus size={16} className="mr-1.5" />
            Nouvelle intervention
          </Button>
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statuses.map((status) => {
          const cfg = STATUS_CARD_CONFIG[status];
          const count = summary?.[status] ?? 0;
          return (
            <Link
              key={status}
              to={`/interventions?status=${status}`}
              className="rounded-lg border border-border bg-bg-secondary p-4 hover:bg-bg-tertiary transition-colors"
            >
              <div className={cn('flex items-center gap-2 mb-1', cfg.colorClass)}>
                {cfg.icon}
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <div className="text-sm text-text-secondary">{cfg.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Technician Availability */}
        <div className="rounded-lg border border-border bg-bg-secondary p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Techniciens</h2>
            <span className="ml-auto text-xs text-text-secondary">{technicians.length} total</span>
          </div>
          <div className="space-y-2">
            {(Object.entries(TECH_STATUS_CONFIG) as [TechnicianStatus, { label: string; color: string }][]).map(
              ([status, cfg]) => {
                const count = techByStatus.get(status) ?? 0;
                return (
                  <div key={status} className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', cfg.color)} />
                    <span className="text-xs text-text-secondary flex-1">{cfg.label}</span>
                    <span className="text-sm font-medium text-text-primary">{count}</span>
                  </div>
                );
              },
            )}
          </div>
        </div>

        {/* Upcoming interventions */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-bg-secondary p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Interventions du jour</h2>
            <span className="ml-auto text-xs text-text-secondary">
              {schedule.length} planifiee{schedule.length > 1 ? 's' : ''}
            </span>
          </div>
          {schedule.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">
              Aucune intervention planifiee aujourd'hui.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {schedule.map((intv) => (
                <Link
                  key={intv.id}
                  to={`/intervention/${intv.id}`}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-bg-tertiary transition-colors"
                >
                  <span className="text-xs font-mono text-accent w-12 shrink-0">
                    {formatTime(intv.scheduledAt)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">{intv.title}</div>
                    <div className="text-[11px] text-text-secondary">
                      {intv.clientName ?? 'Pas de client'}
                      {intv.assignedTechnicianName && ` · ${intv.assignedTechnicianName}`}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                      intv.status === 'pending' && 'bg-yellow-500/10 text-yellow-500',
                      intv.status === 'assigned' && 'bg-blue-500/10 text-blue-500',
                      intv.status === 'in_progress' && 'bg-accent/10 text-accent',
                      intv.status === 'paused' && 'bg-orange-500/10 text-orange-500',
                      intv.status === 'pending_validation' && 'bg-purple-500/10 text-purple-500',
                      intv.status === 'closed' && 'bg-green-500/10 text-green-500',
                      intv.status === 'issue' && 'bg-red-500/10 text-red-500',
                      intv.status === 'cancelled' && 'bg-gray-500/10 text-gray-500',
                    )}
                  >
                    {INTERVENTION_STATUS_LABELS[intv.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">Activite recente</h2>
        </div>
        {recentEvents.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary text-sm">Aucune activite recente.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border bg-bg-secondary p-3 flex items-start gap-3"
              >
                <div className="text-[11px] text-text-secondary whitespace-nowrap mt-0.5 w-24 shrink-0">
                  {new Date(event.createdAt).toLocaleString([], {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary">
                    <span className="font-medium">{event.technicianName ?? 'Systeme'}</span>
                    {' — '}
                    <span className="text-text-secondary">
                      {EVENT_TYPE_LABELS[event.type] ?? event.type}
                    </span>
                  </div>
                  {event.message && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{event.message}</p>
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
