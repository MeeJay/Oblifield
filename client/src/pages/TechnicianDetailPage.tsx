import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  CircleDot,
  Wrench,
  CheckCircle2,
  Timer,
  MapPin,
  Star,
  Navigation,
} from 'lucide-react';
import type { Technician, TechnicianStatus, Intervention } from '@oblifield/shared';
import { INTERVENTION_STATUS_LABELS } from '@oblifield/shared';
import { techniciansApi } from '@/api/technicians.api';
import { interventionsApi } from '@/api/interventions.api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<TechnicianStatus, { label: string; color: string }> = {
  available: { label: 'Disponible', color: 'bg-green-500/10 text-green-500' },
  on_site: { label: 'Sur site', color: 'bg-accent/10 text-accent' },
  travelling: { label: 'En route', color: 'bg-blue-500/10 text-blue-500' },
  offline: { label: 'Hors ligne', color: 'bg-gray-500/10 text-gray-500' },
  on_break: { label: 'En pause', color: 'bg-yellow-500/10 text-yellow-500' },
};

const TYPE_LABELS: Record<string, string> = {
  electrician: 'Electricien',
  it: 'Informatique',
  other: 'Autre',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  assigned: 'bg-blue-500/10 text-blue-500',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-green-500/10 text-green-500',
  issue: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-500/10 text-gray-500',
};

function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-sm text-text-secondary">-</span>;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />);
    } else if (i === full && half) {
      stars.push(
        <span key={i} className="relative inline-block">
          <Star size={16} className="text-gray-500" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star size={16} className="fill-yellow-400 text-yellow-400" />
          </span>
        </span>,
      );
    } else {
      stars.push(<Star key={i} size={16} className="text-gray-500" />);
    }
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      {stars}
      <span className="ml-1 text-sm text-text-secondary">({rating})</span>
    </span>
  );
}

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
  const typeLabel = technician.type
    ? technician.type === 'other' && technician.typeOther
      ? technician.typeOther
      : TYPE_LABELS[technician.type] ?? technician.type
    : null;

  const completedInterventions = interventions.filter((i) => i.status === 'done');
  const completedCount = completedInterventions.length;

  const durations = completedInterventions
    .filter((i) => i.startedAt && i.completedAt)
    .map((i) => {
      const start = new Date(i.startedAt!).getTime();
      const end = new Date(i.completedAt!).getTime();
      return (end - start) / 60000;
    });
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  const pastInterventions = interventions.filter(
    (i) => i.status === 'done' || i.status === 'cancelled' || i.status === 'issue',
  );

  const addressStr = [technician.address, technician.postalCode, technician.city, technician.country]
    .filter(Boolean)
    .join(', ');

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
              {technician.firstName} {technician.lastName}
            </h1>
            {technician.company && (
              <p className="text-sm text-text-secondary mb-2">{technician.company}</p>
            )}
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
              {typeLabel && (
                <span className="inline-flex items-center rounded-full bg-bg-tertiary px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                  {typeLabel}
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

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard
          icon={<MapPin size={16} />}
          label="Adresse"
          value={addressStr || '-'}
        />
        <InfoCard
          icon={<Phone size={16} />}
          label="Telephone"
          value={technician.phone ?? '-'}
        />
        <InfoCard
          icon={<Mail size={16} />}
          label="Email"
          value={technician.email ?? '-'}
        />
        <InfoCard
          icon={<Navigation size={16} />}
          label="Rayon d'action"
          value={technician.actionRadiusKm ? `${technician.actionRadiusKm} km` : '-'}
        />
      </div>

      {/* Rating card */}
      <div className="rounded-lg border border-border bg-bg-secondary p-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Star size={16} className="text-text-secondary" />
          <span className="text-xs text-text-secondary">Note</span>
        </div>
        <RatingStars rating={technician.rating} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="text-2xl font-bold text-green-500">{completedCount}</span>
          </div>
          <div className="text-sm text-text-secondary">Terminees</div>
        </div>
        <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Timer size={18} className="text-accent" />
            <span className="text-2xl font-bold text-accent">
              {avgDuration != null ? `${avgDuration}m` : '-'}
            </span>
          </div>
          <div className="text-sm text-text-secondary">Duree moyenne</div>
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
            Intervention en cours
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
                  {currentIntervention.clientName ?? 'Pas de client'}
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
          Historique des interventions
        </h2>
        {pastInterventions.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary">Aucune intervention passee.</p>
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
                      {intv.clientName ?? 'Pas de client'}
                      {intv.completedAt &&
                        ` \u2022 Termine le ${new Date(intv.completedAt).toLocaleDateString()}`}
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

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-secondary p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-text-secondary">{icon}</span>
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
