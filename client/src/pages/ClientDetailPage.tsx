import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { Client, Intervention, InterventionStatus } from '@oblifield/shared';
import { INTERVENTION_STATUS_LABELS } from '@oblifield/shared';
import { clientsApi } from '@/api/clients.api';
import { interventionsApi } from '@/api/interventions.api';
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

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);

  const [client, setClient] = useState<Client | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [cl, intvs] = await Promise.all([
        clientsApi.getById(clientId),
        interventionsApi.list({ clientId }),
      ]);
      setClient(cl);
      setInterventions(intvs);
    } catch {
      toast.error('Failed to load client details');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !client) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalCount = interventions.length;
  const pendingCount = interventions.filter(
    (i) => i.status === 'pending' || i.status === 'assigned' || i.status === 'in_progress',
  ).length;
  const doneCount = interventions.filter((i) => i.status === 'done').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-lg border border-border bg-bg-secondary p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent/10">
            <Building2 size={24} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-text-primary mb-1">
              {client.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              {client.address && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {client.address}
                </span>
              )}
              {client.contactName && (
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  {client.contactName}
                  {client.contactPhone && ` (${client.contactPhone})`}
                </span>
              )}
              {client.contactEmail && (
                <span className="flex items-center gap-1">
                  <Mail size={14} />
                  {client.contactEmail}
                </span>
              )}
            </div>
            {client.description && (
              <p className="text-sm text-text-secondary mt-2">{client.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
          <div className="text-2xl font-bold text-text-primary">{totalCount}</div>
          <div className="text-sm text-text-secondary">Total</div>
        </div>
        <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Clock size={18} className="text-yellow-500" />
            <span className="text-2xl font-bold text-yellow-500">{pendingCount}</span>
          </div>
          <div className="text-sm text-text-secondary">Active</div>
        </div>
        <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="text-2xl font-bold text-green-500">{doneCount}</span>
          </div>
          <div className="text-sm text-text-secondary">Done</div>
        </div>
      </div>

      {/* Interventions */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Interventions</h2>
        {interventions.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary">No interventions for this client.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {interventions.map((intv) => (
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
                      {intv.assignedTechnicianName ?? 'Unassigned'}
                      {intv.scheduledAt &&
                        ` \u2022 ${new Date(intv.scheduledAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_COLORS[intv.status],
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
