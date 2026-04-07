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
const HOUR_HEIGHT_PX = 72;

const STATUS_BORDER: Record<InterventionStatus, string> = {
  pending: 'border-l-yellow-500',
  assigned: 'border-l-blue-500',
  in_progress: 'border-l-accent',
  paused: 'border-l-orange-500',
  pending_validation: 'border-l-purple-500',
  closed: 'border-l-green-500',
  issue: 'border-l-red-500',
  cancelled: 'border-l-gray-500',
};

const STATUS_BG: Record<InterventionStatus, string> = {
  pending: 'bg-yellow-500/10',
  assigned: 'bg-blue-500/10',
  in_progress: 'bg-accent/10',
  paused: 'bg-orange-500/10',
  pending_validation: 'bg-purple-500/10',
  closed: 'bg-green-500/10',
  issue: 'bg-red-500/10',
  cancelled: 'bg-gray-500/10',
};

const STATUS_DOT: Record<InterventionStatus, string> = {
  pending: 'bg-yellow-500',
  assigned: 'bg-blue-500',
  in_progress: 'bg-accent',
  paused: 'bg-orange-500',
  pending_validation: 'bg-purple-500',
  closed: 'bg-green-500',
  issue: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

const STATUS_LABEL: Record<InterventionStatus, string> = {
  pending: 'En attente',
  assigned: 'Assignee',
  in_progress: 'En cours',
  paused: 'En pause',
  pending_validation: 'En validation',
  closed: 'Cloturee',
  issue: 'Probleme',
  cancelled: 'Annulee',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
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

function getHourFraction(isoStr: string): number {
  const d = new Date(isoStr);
  return d.getHours() + d.getMinutes() / 60;
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getFirstOfMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getLastOfMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().slice(0, 10);
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function formatWeekRange(monday: string): string {
  const sun = addDays(monday, 6);
  const m = new Date(monday + 'T00:00:00');
  const s = new Date(sun + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${m.toLocaleDateString('fr-FR', opts)} - ${s.toLocaleDateString('fr-FR', opts)} ${s.getFullYear()}`;
}

function getDayShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
}

type ViewMode = 'day' | 'week' | 'month';

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
  const isUrgent = intervention.priority === 'urgent' || intervention.priority === 'high';

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
        {isUrgent && <Flame size={14} className="shrink-0 text-red-500" />}
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
  const isUrgent = intervention.priority === 'urgent' || intervention.priority === 'high';

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
// Week view
// ---------------------------------------------------------------------------

function WeekView({
  monday,
  interventions,
  onDayClick,
}: {
  monday: string;
  interventions: Intervention[];
  onDayClick: (date: string) => void;
}) {
  const navigate = useNavigate();
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(monday, i));

  const byDay: Record<string, Intervention[]> = {};
  for (const d of days) byDay[d] = [];
  for (const iv of interventions) {
    if (!iv.scheduledAt) continue;
    const dayKey = iv.scheduledAt.slice(0, 10);
    if (byDay[dayKey]) byDay[dayKey].push(iv);
  }

  const td = todayStr();

  return (
    <div className="grid grid-cols-7 gap-1 rounded-lg border border-border bg-bg-primary overflow-hidden">
      {days.map((d) => {
        const isToday = d === td;
        const dayInterventions = byDay[d] ?? [];
        return (
          <div key={d} className="min-h-[200px] border-r border-border last:border-r-0">
            {/* Day header */}
            <button
              onClick={() => onDayClick(d)}
              className={cn(
                'w-full px-2 py-2 text-center text-xs font-medium border-b border-border transition-colors hover:bg-bg-tertiary',
                isToday
                  ? 'bg-accent/10 text-accent font-bold'
                  : 'bg-bg-secondary text-text-secondary',
              )}
            >
              {getDayShort(d)}
            </button>
            {/* Interventions */}
            <div className="p-1 space-y-1">
              {dayInterventions.map((iv) => {
                const time = iv.scheduledAt
                  ? new Date(iv.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '';
                return (
                  <button
                    key={iv.id}
                    onClick={() => navigate(`/intervention/${iv.id}`)}
                    className={cn(
                      'w-full rounded border-l-3 px-2 py-1.5 text-left cursor-pointer hover:brightness-110 transition-colors',
                      STATUS_BORDER[iv.status],
                      STATUS_BG[iv.status],
                    )}
                  >
                    <div className="text-xs font-medium text-text-primary truncate">
                      {iv.title}
                    </div>
                    {time && (
                      <div className="text-[10px] text-text-secondary">{time}</div>
                    )}
                  </button>
                );
              })}
              {dayInterventions.length === 0 && (
                <div className="text-[10px] text-text-muted text-center py-4">-</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month view
// ---------------------------------------------------------------------------

function MonthView({
  firstOfMonth,
  interventions,
  onDayClick,
}: {
  firstOfMonth: string;
  interventions: Intervention[];
  onDayClick: (date: string) => void;
}) {
  const d = new Date(firstOfMonth + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();

  // Build grid
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    cells.push(ds);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  // Index interventions by day
  const byDay: Record<string, Intervention[]> = {};
  for (const iv of interventions) {
    if (!iv.scheduledAt) continue;
    const dayKey = iv.scheduledAt.slice(0, 10);
    if (!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push(iv);
  }

  const td = todayStr();
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <div className="rounded-lg border border-border bg-bg-primary overflow-hidden">
      {/* Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map((dn) => (
          <div
            key={dn}
            className="text-center text-xs font-medium text-text-secondary py-2 bg-bg-secondary"
          >
            {dn}
          </div>
        ))}
      </div>
      {/* Rows */}
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7 border-b border-border last:border-b-0">
          {row.map((cell, ci) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${ri}-${ci}`}
                  className="min-h-[80px] border-r border-border last:border-r-0 bg-bg-primary"
                />
              );
            }
            const isToday = cell === td;
            const dayIvs = byDay[cell] ?? [];
            const dayNum = new Date(cell + 'T00:00:00').getDate();

            // Count by status for dots
            const statusCounts: Partial<Record<InterventionStatus, number>> = {};
            for (const iv of dayIvs) {
              statusCounts[iv.status] = (statusCounts[iv.status] ?? 0) + 1;
            }

            return (
              <button
                key={cell}
                onClick={() => onDayClick(cell)}
                className={cn(
                  'min-h-[80px] border-r border-border last:border-r-0 p-1.5 text-left hover:bg-bg-tertiary transition-colors cursor-pointer',
                  isToday && 'bg-accent/5',
                )}
              >
                <div
                  className={cn(
                    'text-xs font-medium mb-1',
                    isToday ? 'text-accent font-bold' : 'text-text-primary',
                  )}
                >
                  {dayNum}
                </div>
                {dayIvs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <span
                        key={status}
                        className={cn(
                          'w-2.5 h-2.5 rounded-full',
                          STATUS_DOT[status as InterventionStatus],
                        )}
                        title={`${count} ${STATUS_LABEL[status as InterventionStatus]}`}
                      />
                    ))}
                  </div>
                )}
                {dayIvs.length > 0 && (
                  <div className="text-[10px] text-text-secondary">
                    {dayIvs.length} intervention{dayIvs.length > 1 ? 's' : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SchedulePage() {
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [techFilter, setTechFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Derived dates
  const monday = useMemo(() => getMonday(selectedDate), [selectedDate]);
  const sunday = useMemo(() => addDays(monday, 6), [monday]);
  const firstOfMonth = useMemo(() => getFirstOfMonth(selectedDate), [selectedDate]);
  const lastOfMonth = useMemo(() => getLastOfMonth(selectedDate), [selectedDate]);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchInterventions = async () => {
      if (viewMode === 'day') {
        return interventionsApi.getSchedule(selectedDate);
      } else if (viewMode === 'week') {
        return interventionsApi.getScheduleRange(monday, sunday);
      } else {
        return interventionsApi.getScheduleRange(firstOfMonth, lastOfMonth);
      }
    };

    Promise.all([
      fetchInterventions(),
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
        if (!cancelled) setInterventions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, viewMode, monday, sunday, firstOfMonth, lastOfMonth]);

  // Filter
  const filtered = useMemo(() => {
    return interventions.filter((iv) => {
      if (techFilter !== 'all' && String(iv.assignedTechnicianId) !== techFilter) return false;
      if (clientFilter !== 'all' && String(iv.clientId) !== clientFilter) return false;
      return true;
    });
  }, [interventions, techFilter, clientFilter]);

  // Day view: separate scheduled vs unscheduled
  const { scheduled, unscheduled } = useMemo(() => {
    if (viewMode !== 'day') return { scheduled: [], unscheduled: [] };
    const s: Intervention[] = [];
    const u: Intervention[] = [];
    for (const iv of filtered) {
      if (iv.scheduledAt) s.push(iv);
      else u.push(iv);
    }
    s.sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
    return { scheduled: s, unscheduled: u };
  }, [filtered, viewMode]);

  // Navigation helpers
  const goToPrev = () => {
    if (viewMode === 'day') setSelectedDate((d) => addDays(d, -1));
    else if (viewMode === 'week') setSelectedDate((d) => addDays(d, -7));
    else {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setMonth(d.getMonth() - 1);
      setSelectedDate(d.toISOString().slice(0, 10));
    }
  };

  const goToNext = () => {
    if (viewMode === 'day') setSelectedDate((d) => addDays(d, 1));
    else if (viewMode === 'week') setSelectedDate((d) => addDays(d, 7));
    else {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setMonth(d.getMonth() + 1);
      setSelectedDate(d.toISOString().slice(0, 10));
    }
  };

  const goToToday = () => setSelectedDate(todayStr());
  const isToday = selectedDate === todayStr();

  const todayLabel =
    viewMode === 'day'
      ? t('schedule.today', "Aujourd'hui")
      : viewMode === 'week'
        ? 'Cette semaine'
        : 'Ce mois';

  const dateLabel =
    viewMode === 'day'
      ? formatDateDisplay(selectedDate)
      : viewMode === 'week'
        ? formatWeekRange(monday)
        : formatMonth(selectedDate);

  const switchToDayView = (date: string) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  // Build hour labels for day view
  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT_PX;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays size={24} className="text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">
            {t('schedule.title', 'Planning')}
          </h1>
        </div>

        {/* View mode selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1">
          {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === mode
                  ? 'bg-accent text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              )}
            >
              {mode === 'day' ? 'Jour' : mode === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToPrev}>
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant={isToday ? 'primary' : 'secondary'}
            size="sm"
            onClick={goToToday}
          >
            {todayLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNext}>
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      {/* Date display */}
      <p className="text-lg text-text-secondary capitalize">{dateLabel}</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="tech-filter" className="text-sm text-text-secondary whitespace-nowrap">
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
                {tech.firstName} {tech.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="client-filter" className="text-sm text-text-secondary whitespace-nowrap">
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* ---- DAY VIEW ---- */}
          {viewMode === 'day' && (
            <>
              <div className="rounded-lg border border-border bg-bg-primary overflow-hidden">
                <div className="relative" style={{ height: totalHeight }}>
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

                  {scheduled.map((iv) => {
                    const startHour = getHourFraction(iv.scheduledAt!);
                    const duration = iv.estimatedDurationMinutes
                      ? iv.estimatedDurationMinutes / 60
                      : 1;
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

                  {/* Now line */}
                  {isToday &&
                    (() => {
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

              {scheduled.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
                  <Clock size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">
                    {t('schedule.noScheduled', 'Aucune intervention planifiee pour cette journee.')}
                  </p>
                </div>
              )}

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
            </>
          )}

          {/* ---- WEEK VIEW ---- */}
          {viewMode === 'week' && (
            <WeekView
              monday={monday}
              interventions={filtered}
              onDayClick={switchToDayView}
            />
          )}

          {/* ---- MONTH VIEW ---- */}
          {viewMode === 'month' && (
            <MonthView
              firstOfMonth={firstOfMonth}
              interventions={filtered}
              onDayClick={switchToDayView}
            />
          )}

          {/* All empty */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <AlertTriangle size={32} className="mb-2 opacity-50" />
              <p className="text-sm">
                {t('schedule.noInterventions', 'Aucune intervention pour cette periode.')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
