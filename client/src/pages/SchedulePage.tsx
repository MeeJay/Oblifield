import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  AlertTriangle,
  Flame,
  CalendarOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  Intervention,
  InterventionStatus,
  Technician,
  Client,
} from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { techniciansApi } from '@/api/technicians.api';
import { clientsApi } from '@/api/clients.api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOUR_START = 7;
const HOUR_END = 20;
const HOUR_HEIGHT_PX = 72; // px per hour slot

const STATUS_BORDER: Record<InterventionStatus, string> = {
  pending: 'border-l-yellow-500',
  assigned: 'border-l-blue-500',
  in_progress: 'border-l-accent',
  done: 'border-l-green-500',
  issue: 'border-l-red-500',
  cancelled: 'border-l-gray-500',
};

const STATUS_BG: Record<InterventionStatus, string> = {
  pending: 'bg-yellow-500/10',
  assigned: 'bg-blue-500/10',
  in_progress: 'bg-accent/10',
  done: 'bg-green-500/10',
  issue: 'bg-red-500/10',
  cancelled: 'bg-gray-500/10',
};

const STATUS_LABEL: Record<InterventionStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  done: 'Done',
  issue: 'Issue',
  cancelled: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Get fractional hour (e.g. 9.5 for 09:30) from an ISO date string. */
function getHourFraction(isoStr: string): number {
  const d = new Date(isoStr);
  return d.getHours() + d.getMinutes() / 60;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InterventionBlock({
  intervention,
  style,
}: {
  intervention: Intervention;
  style?: React.CSSProperties;
}) {
  const navigate = useNavigate();

  const isUrgent =
    intervention.priority === 'urgent' || intervention.priority === 'high';

  return (
    <button
      type="button"
      onClick={() => navigate(`/intervention/${intervention.id}`)}
      style={style}
      className={cn(
        'absolute left-16 right-2 rounded-md border-l-4 px-3 py-2 text-left transition-colors',
        'hover:brightness-110 cursor-pointer overflow-hidden',
        STATUS_BORDER[intervention.status],
        STATUS_BG[intervention.status],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary truncate">
          {intervention.title}
        </span>
        {isUrgent && (
          <Flame size={14} className="shrink-0 text-red-500" />
        )}
      </div>
      <div className="text-xs text-text-secondary truncate mt-0.5">
        {intervention.clientName}
        {intervention.siteName ? ` \u2022 ${intervention.siteName}` : ''}
      </div>
      {intervention.assignedTechnicianName && (
        <div className="text-xs text-text-secondary truncate mt-0.5">
          {intervention.assignedTechnicianName}
        </div>
      )}
      <span
        className={cn(
          'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight',
          STATUS_BG[intervention.status],
          'text-text-primary',
        )}
      >
        {STATUS_LABEL[intervention.status]}
      </span>
    </button>
  );
}

function UnscheduledCard({ intervention }: { intervention: Intervention }) {
  const navigate = useNavigate();
  const isUrgent =
    intervention.priority === 'urgent' || intervention.priority === 'high';

  return (
    <button
      type="button"
      onClick={() => navigate(`/intervention/${intervention.id}`)}
      className={cn(
        'w-full rounded-md border-l-4 px-4 py-3 text-left transition-colors',
        'hover:brightness-110 cursor-pointer bg-bg-secondary',
        STATUS_BORDER[intervention.status],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary">
          {intervention.title}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {isUrgent && <Flame size={14} className="text-red-500" />}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight',
              STATUS_BG[intervention.status],
              'text-text-primary',
            )}
          >
            {STATUS_LABEL[intervention.status]}
          </span>
        </div>
      </div>
      <div className="text-xs text-text-secondary mt-1">
        {intervention.clientName}
        {intervention.siteName ? ` \u2022 ${intervention.siteName}` : ''}
        {intervention.assignedTechnicianName
          ? ` \u2014 ${intervention.assignedTechnicianName}`
          : ''}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SchedulePage() {
  const { t } = useTranslation();

  // State
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [techFilter, setTechFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Fetch schedule data whenever selected date changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      interventionsApi.getSchedule(selectedDate),
      techniciansApi.list(),
      clientsApi.list(),
    ])
      .then(([intv, techs, cls]) => {
        if (cancelled) return;
        setInterventions(intv);
        setTechnicians(techs);
        setClients(cls);
      })
      .catch(() => {
        if (!cancelled) {
          setInterventions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  // Filter interventions
  const filtered = useMemo(() => {
    return interventions.filter((iv) => {
      if (techFilter !== 'all' && String(iv.assignedTechnicianId) !== techFilter)
        return false;
      if (clientFilter !== 'all' && String(iv.clientId) !== clientFilter)
        return false;
      return true;
    });
  }, [interventions, techFilter, clientFilter]);

  // Separate scheduled vs unscheduled
  const { scheduled, unscheduled } = useMemo(() => {
    const s: Intervention[] = [];
    const u: Intervention[] = [];
    for (const iv of filtered) {
      if (iv.scheduledAt) {
        s.push(iv);
      } else {
        u.push(iv);
      }
    }
    // Sort scheduled by time
    s.sort(
      (a, b) =>
        new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime(),
    );
    return { scheduled: s, unscheduled: u };
  }, [filtered]);

  // Navigation
  const goToPrevDay = () => setSelectedDate((d) => addDays(d, -1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => setSelectedDate(today());
  const isToday = selectedDate === today();

  // Build hour labels
  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    hours.push(h);
  }
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT_PX;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays size={24} className="text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">
            {t('schedule.title', 'Planning')}
          </h1>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToPrevDay}>
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant={isToday ? 'primary' : 'secondary'}
            size="sm"
            onClick={goToToday}
          >
            {t('schedule.today', "Aujourd'hui")}
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNextDay}>
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      {/* Date display */}
      <p className="text-lg text-text-secondary capitalize">
        {formatDateDisplay(selectedDate)}
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Technician filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="tech-filter"
            className="text-sm text-text-secondary whitespace-nowrap"
          >
            {t('schedule.technician', 'Technicien')}
          </label>
          <select
            id="tech-filter"
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">{t('common.all', 'Tous')}</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={String(tech.id)}>
                {tech.displayName || tech.username || `Tech #${tech.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Client filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="client-filter"
            className="text-sm text-text-secondary whitespace-nowrap"
          >
            {t('schedule.client', 'Client')}
          </label>
          <select
            id="client-filter"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">{t('common.all', 'Tous')}</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Loading state                                                   */}
      {/* ---------------------------------------------------------------- */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Timeline                                                        */}
      {/* ---------------------------------------------------------------- */}
      {!loading && (
        <>
          <div className="rounded-lg border border-border bg-bg-primary overflow-hidden">
            <div className="relative" style={{ height: totalHeight }}>
              {/* Hour grid lines */}
              {hours.map((h) => {
                const top = (h - HOUR_START) * HOUR_HEIGHT_PX;
                return (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border"
                    style={{ top }}
                  >
                    <span className="absolute -top-2.5 left-2 text-xs text-text-secondary font-mono select-none">
                      {String(h).padStart(2, '0')}:00
                    </span>
                  </div>
                );
              })}

              {/* Scheduled interventions */}
              {scheduled.map((iv) => {
                const startHour = getHourFraction(iv.scheduledAt!);
                const duration = iv.estimatedDurationMinutes
                  ? iv.estimatedDurationMinutes / 60
                  : 1; // default 1h
                const clampedStart = Math.max(startHour, HOUR_START);
                const clampedEnd = Math.min(startHour + duration, HOUR_END);
                if (clampedEnd <= HOUR_START || clampedStart >= HOUR_END) return null;

                const top = (clampedStart - HOUR_START) * HOUR_HEIGHT_PX;
                const height = (clampedEnd - clampedStart) * HOUR_HEIGHT_PX;

                return (
                  <InterventionBlock
                    key={iv.id}
                    intervention={iv}
                    style={{
                      top: `${top}px`,
                      height: `${Math.max(height, 36)}px`,
                    }}
                  />
                );
              })}

              {/* "Now" line */}
              {isToday && (() => {
                const now = new Date();
                const nowHour = now.getHours() + now.getMinutes() / 60;
                if (nowHour >= HOUR_START && nowHour <= HOUR_END) {
                  const top = (nowHour - HOUR_START) * HOUR_HEIGHT_PX;
                  return (
                    <div
                      className="absolute left-14 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
                      style={{ top }}
                    >
                      <div className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full bg-red-500" />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Empty timeline message */}
          {scheduled.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
              <Clock size={32} className="mb-2 opacity-50" />
              <p className="text-sm">
                {t(
                  'schedule.noScheduled',
                  'Aucune intervention planifiee pour cette journee.',
                )}
              </p>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Unscheduled section                                            */}
          {/* -------------------------------------------------------------- */}
          {unscheduled.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarOff size={18} className="text-text-secondary" />
                <h2 className="text-lg font-semibold text-text-primary">
                  {t('schedule.unscheduled', 'Non planifiees')}
                  <span className="ml-2 text-sm font-normal text-text-secondary">
                    ({unscheduled.length})
                  </span>
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unscheduled.map((iv) => (
                  <UnscheduledCard key={iv.id} intervention={iv} />
                ))}
              </div>
            </div>
          )}

          {/* All empty */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <AlertTriangle size={32} className="mb-2 opacity-50" />
              <p className="text-sm">
                {t(
                  'schedule.noInterventions',
                  'Aucune intervention pour cette date.',
                )}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
