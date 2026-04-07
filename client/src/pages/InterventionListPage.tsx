import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import type {
  Intervention,
  InterventionStatus,
  Client,
  Technician,
} from '@oblifield/shared';
import {
  INTERVENTION_STATUS,
  INTERVENTION_STATUS_LABELS,
  INTERVENTION_PRIORITY_LABELS,
} from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { clientsApi } from '@/api/clients.api';
import { techniciansApi } from '@/api/technicians.api';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';

const STATUS_COLORS: Record<InterventionStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  assigned: 'bg-blue-500/10 text-blue-500',
  in_progress: 'bg-accent/10 text-accent',
  paused: 'bg-orange-500/10 text-orange-500',
  pending_validation: 'bg-purple-500/10 text-purple-500',
  closed: 'bg-green-500/10 text-green-500',
  issue: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-500/10 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-400',
  normal: 'bg-blue-500/10 text-blue-400',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-red-500/10 text-red-500',
};

type SortField = 'title' | 'clientName' | 'siteName' | 'assignedTechnicianName' | 'status' | 'priority' | 'scheduledAt';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InterventionListPage() {
  const navigate = useNavigate();

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [techFilter, setTechFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('scheduledAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const load = async () => {
      try {
        const [intv, cls, techs] = await Promise.all([
          interventionsApi.list(),
          clientsApi.list(),
          techniciansApi.list(),
        ]);
        setInterventions(intv);
        setClients(cls);
        setTechnicians(techs);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return interventions.filter((iv) => {
      if (statusFilter !== 'all' && iv.status !== statusFilter) return false;
      if (clientFilter !== 'all' && String(iv.clientId) !== clientFilter) return false;
      if (techFilter !== 'all' && String(iv.assignedTechnicianId) !== techFilter) return false;
      if (dateFrom && iv.scheduledAt && new Date(iv.scheduledAt) < new Date(dateFrom)) return false;
      if (dateTo && iv.scheduledAt && new Date(iv.scheduledAt) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [interventions, statusFilter, clientFilter, techFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="inline ml-1" />
    ) : (
      <ChevronDown size={12} className="inline ml-1" />
    );
  };

  const selectClass =
    'rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Interventions</h1>
        <Link to="/intervention/new">
          <Button variant="primary" size="sm">
            <Plus size={16} className="mr-1.5" />
            Nouvelle intervention
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6 rounded-lg border border-border bg-bg-secondary p-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-text-secondary" />
          <span className="text-sm font-medium text-text-secondary">Filtres</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Statut</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="all">Tous</option>
            {INTERVENTION_STATUS.map((s) => (
              <option key={s} value={s}>{INTERVENTION_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Client</label>
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={selectClass}>
            <option value="all">Tous</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Technicien</label>
          <select value={techFilter} onChange={(e) => setTechFilter(e.target.value)} className={selectClass}>
            <option value="all">Tous</option>
            {technicians.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={selectClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Au</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={selectClass}
          />
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-secondary p-8 text-center">
          <p className="text-text-secondary">Aucune intervention trouvee.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border">
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('title')}
                >
                  Titre <SortIcon field="title" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('clientName')}
                >
                  Client <SortIcon field="clientName" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('siteName')}
                >
                  Site <SortIcon field="siteName" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('assignedTechnicianName')}
                >
                  Technicien <SortIcon field="assignedTechnicianName" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('status')}
                >
                  Statut <SortIcon field="status" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('priority')}
                >
                  Priorite <SortIcon field="priority" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('scheduledAt')}
                >
                  Date planifiee <SortIcon field="scheduledAt" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((iv) => (
                <tr
                  key={iv.id}
                  onClick={() => navigate(`/intervention/${iv.id}`)}
                  className="bg-bg-secondary hover:bg-bg-tertiary transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">
                    {iv.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {iv.clientName ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {iv.siteName ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {iv.assignedTechnicianName ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_COLORS[iv.status],
                      )}
                    >
                      {INTERVENTION_STATUS_LABELS[iv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        PRIORITY_COLORS[iv.priority] ?? '',
                      )}
                    >
                      {INTERVENTION_PRIORITY_LABELS[iv.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {formatDate(iv.scheduledAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
