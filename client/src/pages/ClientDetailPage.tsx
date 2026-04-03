import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';
import type { Client, Site, Intervention, InterventionStatus } from '@oblifield/shared';
import { INTERVENTION_STATUS_LABELS } from '@oblifield/shared';
import { clientsApi } from '@/api/clients.api';
import { sitesApi } from '@/api/sites.api';
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
  const [sites, setSites] = useState<Site[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  // Add site form
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [siteForm, setSiteForm] = useState({ name: '', address: '', city: '', postalCode: '', country: '', contactName: '', contactPhone: '', contactEmail: '' });
  const [siteSaving, setSiteSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cl, siteList, intvs] = await Promise.all([
        clientsApi.getById(clientId),
        sitesApi.list({ clientId }),
        interventionsApi.list({ clientId }),
      ]);
      setClient(cl);
      setSites(siteList);
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

      {/* Sites */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <MapPin size={18} />
            Sites ({sites.length})
          </h2>
          <button
            onClick={() => setShowSiteForm(!showSiteForm)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            {showSiteForm ? <X size={14} /> : <Plus size={14} />}
            {showSiteForm ? 'Annuler' : 'Ajouter un site'}
          </button>
        </div>

        {/* Add site form */}
        {showSiteForm && (
          <div className="rounded-lg border border-border bg-bg-secondary p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                type="text" placeholder="Nom du site *" value={siteForm.name}
                onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text" placeholder="Adresse" value={siteForm.address}
                onChange={(e) => setSiteForm((f) => ({ ...f, address: e.target.value }))}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text" placeholder="Ville" value={siteForm.city}
                onChange={(e) => setSiteForm((f) => ({ ...f, city: e.target.value }))}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text" placeholder="Code postal" value={siteForm.postalCode}
                onChange={(e) => setSiteForm((f) => ({ ...f, postalCode: e.target.value }))}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text" placeholder="Pays" value={siteForm.country}
                onChange={(e) => setSiteForm((f) => ({ ...f, country: e.target.value }))}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text" placeholder="Nom du contact" value={siteForm.contactName}
                onChange={(e) => setSiteForm((f) => ({ ...f, contactName: e.target.value }))}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text" placeholder="Tel. contact" value={siteForm.contactPhone}
                onChange={(e) => setSiteForm((f) => ({ ...f, contactPhone: e.target.value }))}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="email" placeholder="Email contact" value={siteForm.contactEmail}
                onChange={(e) => setSiteForm((f) => ({ ...f, contactEmail: e.target.value }))}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <button
              disabled={!siteForm.name.trim() || siteSaving}
              onClick={async () => {
                setSiteSaving(true);
                try {
                  await sitesApi.create({
                    clientId,
                    name: siteForm.name.trim(),
                    address: siteForm.address.trim() || null,
                    city: siteForm.city.trim() || null,
                    postalCode: siteForm.postalCode.trim() || null,
                    country: siteForm.country.trim() || null,
                    contactName: siteForm.contactName.trim() || null,
                    contactPhone: siteForm.contactPhone.trim() || null,
                    contactEmail: siteForm.contactEmail.trim() || null,
                  });
                  toast.success('Site cree');
                  setShowSiteForm(false);
                  setSiteForm({ name: '', address: '', city: '', postalCode: '', country: '', contactName: '', contactPhone: '', contactEmail: '' });
                  const updated = await sitesApi.list({ clientId });
                  setSites(updated);
                } catch {
                  toast.error('Erreur lors de la creation du site');
                } finally {
                  setSiteSaving(false);
                }
              }}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {siteSaving ? 'Creation...' : 'Creer le site'}
            </button>
          </div>
        )}

        {sites.length === 0 && !showSiteForm ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary text-sm">Aucun site pour ce client.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="rounded-lg border border-border bg-bg-secondary p-4"
              >
                <div className="text-sm font-medium text-text-primary">{site.name}</div>
                {(site.city || site.country) && (
                  <div className="text-xs text-text-secondary mt-1">
                    {[site.city, site.country].filter(Boolean).join(', ')}
                  </div>
                )}
                {site.address && (
                  <div className="text-xs text-text-muted mt-0.5">{site.address}</div>
                )}
              </div>
            ))}
          </div>
        )}
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
