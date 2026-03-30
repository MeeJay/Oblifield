import { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Users,
  Building2,
} from 'lucide-react';
import type { Technician, Client } from '@oblifield/shared';
import {
  INTERVENTION_STATUS_LABELS,
  INTERVENTION_TYPE_LABELS,
} from '@oblifield/shared';
import {
  reportsApi,
  type ReportSummary,
  type TechnicianReport,
  type ClientReport,
} from '@/api/reports.api';
import { techniciansApi } from '@/api/technicians.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

type TabKey = 'summary' | 'technician' | 'client';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Summary
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Technician
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [techReport, setTechReport] = useState<TechnicianReport | null>(null);
  const [techLoading, setTechLoading] = useState(false);

  // Client
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientReport, setClientReport] = useState<ClientReport | null>(null);
  const [clientLoading, setClientLoading] = useState(false);

  // Load technicians + clients for dropdowns
  useEffect(() => {
    techniciansApi.list().then(setTechnicians).catch(() => {});
    clientsApi.list().then(setClients).catch(() => {});
  }, []);

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await reportsApi.getSummary(from || undefined, to || undefined);
      setSummary(data);
    } catch {
      toast.error('Failed to load summary report');
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadTechReport = async () => {
    if (!selectedTechId) return;
    setTechLoading(true);
    try {
      const data = await reportsApi.getTechnicianReport(
        Number(selectedTechId),
        from || undefined,
        to || undefined,
      );
      setTechReport(data);
    } catch {
      toast.error('Failed to load technician report');
    } finally {
      setTechLoading(false);
    }
  };

  const loadClientReport = async () => {
    if (!selectedClientId) return;
    setClientLoading(true);
    try {
      const data = await reportsApi.getClientReport(
        Number(selectedClientId),
        from || undefined,
        to || undefined,
      );
      setClientReport(data);
    } catch {
      toast.error('Failed to load client report');
    } finally {
      setClientLoading(false);
    }
  };

  // Auto-load summary on mount or when tab switches to summary
  useEffect(() => {
    if (activeTab === 'summary' && !summary) {
      loadSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: 'Summary', icon: <BarChart3 size={16} /> },
    { key: 'technician', label: 'By Technician', icon: <Users size={16} /> },
    { key: 'client', label: 'By Client', icon: <Building2 size={16} /> },
  ];

  const selectClass =
    'w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Reports</h1>

      {/* Date Range */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-text-secondary" />
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (activeTab === 'summary') loadSummary();
            else if (activeTab === 'technician') loadTechReport();
            else loadClientReport();
          }}
        >
          Apply
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <SummaryTab summary={summary} loading={summaryLoading} />
      )}
      {activeTab === 'technician' && (
        <TechnicianTab
          technicians={technicians}
          selectedId={selectedTechId}
          onSelect={(id) => setSelectedTechId(id)}
          report={techReport}
          loading={techLoading}
          onLoad={loadTechReport}
          selectClass={selectClass}
        />
      )}
      {activeTab === 'client' && (
        <ClientTab
          clients={clients}
          selectedId={selectedClientId}
          onSelect={(id) => setSelectedClientId(id)}
          report={clientReport}
          loading={clientLoading}
          onLoad={loadClientReport}
          selectClass={selectClass}
        />
      )}
    </div>
  );
}

function SummaryTab({
  summary,
  loading,
}: {
  summary: ReportSummary | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
        <p className="text-text-secondary">No data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-bg-secondary p-4">
          <div className="text-2xl font-bold text-text-primary">{summary.total}</div>
          <div className="text-sm text-text-secondary">Total Interventions</div>
        </div>
        <div className="rounded-lg border border-border bg-bg-secondary p-4">
          <div className="text-2xl font-bold text-accent">
            {summary.avgDurationMinutes != null
              ? `${Math.round(summary.avgDurationMinutes)}m`
              : '-'}
          </div>
          <div className="text-sm text-text-secondary">Avg Duration</div>
        </div>
      </div>

      {/* By Status Table */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          By Status
        </h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border">
                <th className="text-left px-4 py-2 text-xs font-medium text-text-secondary">
                  Status
                </th>
                <th className="text-right px-4 py-2 text-xs font-medium text-text-secondary">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(summary.byStatus).map(([status, count]) => (
                <tr key={status} className="bg-bg-secondary">
                  <td className="px-4 py-2 text-sm text-text-primary">
                    {(INTERVENTION_STATUS_LABELS as Record<string, string>)[status] ?? status}
                  </td>
                  <td className="px-4 py-2 text-sm text-text-primary text-right font-medium">
                    {count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By Type Table */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          By Type
        </h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border">
                <th className="text-left px-4 py-2 text-xs font-medium text-text-secondary">
                  Type
                </th>
                <th className="text-right px-4 py-2 text-xs font-medium text-text-secondary">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(summary.byType).map(([type, count]) => (
                <tr key={type} className="bg-bg-secondary">
                  <td className="px-4 py-2 text-sm text-text-primary">
                    {(INTERVENTION_TYPE_LABELS as Record<string, string>)[type] ?? type}
                  </td>
                  <td className="px-4 py-2 text-sm text-text-primary text-right font-medium">
                    {count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TechnicianTab({
  technicians,
  selectedId,
  onSelect,
  report,
  loading,
  onLoad,
  selectClass,
}: {
  technicians: Technician[];
  selectedId: string;
  onSelect: (id: string) => void;
  report: TechnicianReport | null;
  loading: boolean;
  onLoad: () => void;
  selectClass: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs space-y-1">
          <label className="block text-sm font-medium text-text-secondary">
            Technician
          </label>
          <select
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            className={selectClass}
          >
            <option value="">-- Select --</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName ?? t.username ?? `Tech #${t.id}`}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onLoad}
          disabled={!selectedId}
        >
          Load Report
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!loading && report && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
              <div className="text-2xl font-bold text-text-primary">
                {report.completedCount}
              </div>
              <div className="text-sm text-text-secondary">Completed</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
              <div className="text-2xl font-bold text-accent">
                {report.avgDurationMinutes != null
                  ? `${Math.round(report.avgDurationMinutes)}m`
                  : '-'}
              </div>
              <div className="text-sm text-text-secondary">Avg Duration</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
              <div className="text-2xl font-bold text-text-primary">
                {report.totalHours != null
                  ? `${report.totalHours.toFixed(1)}h`
                  : '-'}
              </div>
              <div className="text-sm text-text-secondary">Total Hours</div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <p className="text-sm text-text-secondary">
              Technician: <span className="text-text-primary font-medium">{report.technicianName}</span>
            </p>
          </div>
        </div>
      )}

      {!loading && !report && selectedId && (
        <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
          <p className="text-text-secondary">
            Click &quot;Load Report&quot; to view data.
          </p>
        </div>
      )}
    </div>
  );
}

function ClientTab({
  clients,
  selectedId,
  onSelect,
  report,
  loading,
  onLoad,
  selectClass,
}: {
  clients: Client[];
  selectedId: string;
  onSelect: (id: string) => void;
  report: ClientReport | null;
  loading: boolean;
  onLoad: () => void;
  selectClass: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs space-y-1">
          <label className="block text-sm font-medium text-text-secondary">
            Client
          </label>
          <select
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            className={selectClass}
          >
            <option value="">-- Select --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onLoad}
          disabled={!selectedId}
        >
          Load Report
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!loading && report && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <p className="text-sm text-text-secondary">
              Client: <span className="text-text-primary font-medium">{report.clientName}</span>
              {' \u2022 '}
              <span className="text-text-primary">{report.interventions.length} intervention{report.interventions.length !== 1 ? 's' : ''}</span>
            </p>
          </div>

          {report.interventions.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-tertiary border-b border-border">
                    <th className="text-left px-4 py-2 text-xs font-medium text-text-secondary">
                      ID
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-text-secondary">
                      Title
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-text-secondary">
                      Type
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-text-secondary">
                      Status
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-text-secondary">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.interventions.map((intv) => (
                    <tr key={intv.id} className="bg-bg-secondary hover:bg-bg-tertiary">
                      <td className="px-4 py-2 text-sm text-text-secondary">
                        #{intv.id}
                      </td>
                      <td className="px-4 py-2 text-sm text-text-primary font-medium">
                        {intv.title}
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary">
                        {(INTERVENTION_TYPE_LABELS as Record<string, string>)[intv.type] ?? intv.type}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className="capitalize text-text-secondary">
                          {(INTERVENTION_STATUS_LABELS as Record<string, string>)[intv.status] ?? intv.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary">
                        {intv.completedAt
                          ? new Date(intv.completedAt).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && !report && selectedId && (
        <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
          <p className="text-text-secondary">
            Click &quot;Load Report&quot; to view data.
          </p>
        </div>
      )}
    </div>
  );
}
