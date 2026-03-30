import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Phone,
  CircleDot,
  Wrench,
  CheckCircle2,
  Timer,
} from 'lucide-react';
import type { Technician, TechnicianStatus, Intervention } from '@oblifield/shared';
import { INTERVENTION_STATUS_LABELS } from '@oblifield/shared';
import { techniciansApi } from '@/api/technicians.api';
import { interventionsApi } from '@/api/interventions.api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<TechnicianStatus, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-green-500/10 text-green-500' },
  on_site: { label: 'On Site', color: 'bg-accent/10 text-accent' },
  travelling: { label: 'Travelling', color: 'bg-blue-500/10 text-blue-500' },
  offline: { label: 'Offline', color: 'bg-gray-500/10 text-gray-500' },
  on_break: { label: 'On Break', color: 'bg-yellow-500/10 text-yellow-500' },
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  assigned: 'bg-blue-500/10 text-blue-500',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-green-500/10 text-green-500',
  issue: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-500/10 text-gray-500',
};

export function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const techId = Number(id);

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [currentIntervention, setCurrentIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const tech = await techniciansApi.getById(techId);
      setTechnician(tech);

      const intvs = await interventionsApi.list({ technicianId: techId });
      setInterventions(intvs);

      if (tech.currentInterventionId) {
        const current = intvs.find((i) => i.id === tech.currentInterventionId);
        if (current) {
          setCurrentIntervention(current);
        } else {
          try {
            const c = await interventionsApi.getById(tech.currentInterventionId);
            setCurrentIntervention(c);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      toast.error('Failed to load technician');
    } finally {
      setLoading(false);
    }
  }, [techId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !technician) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[technician.status];
  const completedInterventions = interventions.filter((i) => i.status === 'done');
  const completedCount = completedInterventions.length;

  // Calculate average duration from completed interventions
  const durations = completedInterventions
    .filter((i) => i.startedAt && i.completedAt)
    .map((i) => {
      const start = new Date(i.startedAt!).getTime();
      const end = new Date(i.completedAt!).getTime();
      return (end - start) / 60000; // minutes
    });
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  const pastInterventions = interventions.filter(
    (i) => i.status === 'done' || i.status === 'cancelled' || i.status === 'issue',
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-lg border border-border bg-bg-secondary p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent/10">
            <User size={24} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-text-primary mb-1">
              {technician.displayName ?? technician.username ?? `Technician #${technician.id}`}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  statusCfg.color,
                )}
              >
                <CircleDot size={10} />
                {statusCfg.label}
              </span>
              {technician.phone && (
                <span className="flex items-center gap-1 text-text-secondary">
                  <Phone size={14} />
                  {technician.phone}
                </span>
              )}
            </div>
            {technician.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {technician.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-accent/10 text-accent px-2.5 py-0.5 text-xs font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="text-2xl font-bold text-green-500">{completedCount}</span>
          </div>
          <div className="text-sm text-text-secondary">Completed</div>
        </div>
        <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Timer size={18} className="text-accent" />
            <span className="text-2xl font-bold text-accent">
              {avgDuration != null ? `${avgDuration}m` : '-'}
            </span>
          </div>
          <div className="text-sm text-text-secondary">Avg Duration</div>
        </div>
        <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Wrench size={18} className="text-text-primary" />
            <span className="text-2xl font-bold text-text-primary">
              {interventions.length}
            </span>
          </div>
          <div className="text-sm text-text-secondary">Total</div>
        </div>
      </div>

      {/* Current Intervention */}
      {currentIntervention && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Current Intervention
          </h2>
          <Link
            to={`/intervention/${currentIntervention.id}`}
            className="block rounded-lg border-2 border-accent/30 bg-bg-secondary p-4 hover:bg-bg-tertiary transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {currentIntervention.title}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {currentIntervention.clientName ?? 'No client'}
                  {currentIntervention.scheduledAt &&
                    ` \u2022 ${new Date(currentIntervention.scheduledAt).toLocaleString()}`}
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  STATUS_BADGE[currentIntervention.status] ?? '',
                )}
              >
                {INTERVENTION_STATUS_LABELS[currentIntervention.status]}
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Intervention History */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Intervention History
        </h2>
        {pastInterventions.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary">No past interventions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pastInterventions.map((intv) => (
              <Link
                key={intv.id}
                to={`/intervention/${intv.id}`}
                className="block rounded-lg border border-border bg-bg-secondary p-4 hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {intv.title}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {intv.clientName ?? 'No client'}
                      {intv.completedAt &&
                        ` \u2022 Completed ${new Date(intv.completedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_BADGE[intv.status] ?? '',
                    )}
                  >
                    {INTERVENTION_STATUS_LABELS[intv.status]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
