import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Pencil,
  MapPin,
  MessageSquare,
  Camera,
  ArrowRight,
  LogIn,
  LogOut,
  Clock,
  User,
  Building2,
  Phone,
  Mail,
  CalendarDays,
  Timer,
  ChevronDown,
  ImageIcon,
  FileDown,
} from 'lucide-react';
import type {
  Intervention,
  InterventionStatus,
  InterventionPhoto,
  TimelineEvent,
  TimelineEventType,
} from '@oblifield/shared';
import {
  INTERVENTION_STATUS,
  INTERVENTION_STATUS_LABELS,
  INTERVENTION_PRIORITY_LABELS,
  INTERVENTION_TYPE_LABELS,
} from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<InterventionStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  assigned: 'bg-blue-500/10 text-blue-500',
  in_progress: 'bg-accent/10 text-accent',
  done: 'bg-green-500/10 text-green-500',
  issue: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-500/10 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-400',
  normal: 'bg-blue-500/10 text-blue-400',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-red-500/10 text-red-500',
};

const TIMELINE_ICONS: Record<TimelineEventType, React.ReactNode> = {
  check_in: <MapPin size={16} className="text-green-500" />,
  check_out: <MapPin size={16} className="text-red-500" />,
  note: <MessageSquare size={16} className="text-blue-500" />,
  photo: <Camera size={16} className="text-purple-500" />,
  status_change: <ArrowRight size={16} className="text-accent" />,
  assignment: <User size={16} className="text-yellow-500" />,
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InterventionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [photos, setPhotos] = useState<InterventionPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const interventionId = Number(id);

  const fetchData = useCallback(async () => {
    try {
      const [intv, tl, ph] = await Promise.all([
        interventionsApi.getById(interventionId),
        interventionsApi.getTimeline(interventionId),
        interventionsApi.getPhotos(interventionId),
      ]);
      setIntervention(intv);
      setTimeline(tl);
      setPhotos(ph);
    } catch {
      toast.error('Failed to load intervention');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [interventionId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const captureGPS = (): Promise<{ latitude: number; longitude: number; accuracy?: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const gps = await captureGPS().catch(() => undefined);
      await interventionsApi.checkIn(interventionId, gps);
      toast.success('Checked in successfully');
      await fetchData();
    } catch {
      toast.error('Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const gps = await captureGPS().catch(() => undefined);
      await interventionsApi.checkOut(interventionId, {
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        accuracy: gps?.accuracy,
      });
      toast.success('Checked out successfully');
      await fetchData();
    } catch {
      toast.error('Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (status: InterventionStatus) => {
    setStatusMenuOpen(false);
    setActionLoading(true);
    try {
      await interventionsApi.changeStatus(interventionId, status);
      toast.success(`Status changed to ${INTERVENTION_STATUS_LABELS[status]}`);
      await fetchData();
    } catch {
      toast.error('Failed to change status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !intervention) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            {intervention.title}
          </h1>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[intervention.status])}>
              {INTERVENTION_STATUS_LABELS[intervention.status]}
            </span>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', PRIORITY_COLORS[intervention.priority] ?? '')}>
              {INTERVENTION_PRIORITY_LABELS[intervention.priority]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/interventions/${intervention.id}/report/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" size="sm">
              <FileDown size={14} className="mr-1.5" />
              Rapport PDF
            </Button>
          </a>
          <Link to={`/intervention/${intervention.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil size={14} className="mr-1.5" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <InfoCard icon={<Building2 size={16} />} label="Type" value={INTERVENTION_TYPE_LABELS[intervention.type]} />
        <InfoCard icon={<Building2 size={16} />} label="Client" value={intervention.clientName ?? '-'} />
        <InfoCard icon={<Building2 size={16} />} label="Site" value={intervention.siteName ?? '-'} />
        <InfoCard icon={<User size={16} />} label="Technician" value={intervention.assignedTechnicianName ?? 'Unassigned'} />
        <InfoCard icon={<CalendarDays size={16} />} label="Scheduled" value={formatDateTime(intervention.scheduledAt)} />
        <InfoCard icon={<CalendarDays size={16} />} label="Due" value={formatDateTime(intervention.dueAt)} />
        <InfoCard icon={<MapPin size={16} />} label="Address" value={intervention.address ?? '-'} />
        <InfoCard icon={<Phone size={16} />} label="Contact" value={intervention.contactName ? `${intervention.contactName} ${intervention.contactPhone ?? ''}` : '-'} />
        <InfoCard icon={<Mail size={16} />} label="Email" value={intervention.contactEmail ?? '-'} />
        <InfoCard icon={<Timer size={16} />} label="Est. Duration" value={intervention.estimatedDurationMinutes ? `${intervention.estimatedDurationMinutes} min` : '-'} />
      </div>

      {/* Description */}
      {intervention.description && (
        <div className="rounded-lg border border-border bg-bg-secondary p-4 mb-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Description</h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {intervention.description}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <Button
          variant="primary"
          size="sm"
          onClick={handleCheckIn}
          loading={actionLoading}
          disabled={intervention.status === 'done' || intervention.status === 'cancelled'}
        >
          <LogIn size={16} className="mr-1.5" />
          Check In
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCheckOut}
          loading={actionLoading}
          disabled={intervention.status === 'done' || intervention.status === 'cancelled'}
        >
          <LogOut size={16} className="mr-1.5" />
          Check Out
        </Button>

        {/* Status Dropdown */}
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            disabled={actionLoading}
          >
            Change Status
            <ChevronDown size={14} className="ml-1.5" />
          </Button>
          {statusMenuOpen && (
            <div className="absolute z-10 mt-1 w-44 rounded-lg border border-border bg-bg-secondary shadow-lg">
              {INTERVENTION_STATUS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors',
                    s === intervention.status
                      ? 'text-accent font-medium'
                      : 'text-text-primary',
                  )}
                >
                  {INTERVENTION_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Timeline</h2>
        </div>

        {timeline.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary">No timeline events yet.</p>
          </div>
        ) : (
          <div className="relative ml-4 border-l-2 border-border pl-6 space-y-4">
            {timeline.map((event) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-[33px] top-1 flex items-center justify-center w-6 h-6 rounded-full bg-bg-tertiary border-2 border-border">
                  {TIMELINE_ICONS[event.type] ?? <ArrowRight size={14} />}
                </div>
                <div className="rounded-lg border border-border bg-bg-secondary p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {event.technicianName ?? 'System'}
                      </span>
                      <span className="text-xs text-text-secondary capitalize">
                        {event.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                  {event.message && (
                    <p className="text-sm text-text-secondary">{event.message}</p>
                  )}
                  {event.previousStatus && event.newStatus && (
                    <p className="text-xs text-text-secondary mt-1">
                      {INTERVENTION_STATUS_LABELS[event.previousStatus]} {'\u2192'}{' '}
                      {INTERVENTION_STATUS_LABELS[event.newStatus]}
                    </p>
                  )}
                  {event.latitude != null && event.longitude != null && (
                    <p className="text-xs text-text-secondary mt-1">
                      <MapPin size={12} className="inline mr-1" />
                      {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
                      {event.accuracy != null && ` (\u00b1${Math.round(event.accuracy)}m)`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Photos</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-lg border border-border bg-bg-secondary overflow-hidden"
              >
                <img
                  src={`/api/interventions/${intervention.id}/photos/${photo.id}`}
                  alt={photo.originalName}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs text-text-secondary truncate">
                    {photo.originalName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
