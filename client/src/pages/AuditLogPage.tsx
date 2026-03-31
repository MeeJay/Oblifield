import { useState, useEffect, useCallback } from 'react';
import { History, Filter, ChevronDown, User as UserIcon } from 'lucide-react';
import type { AuditLog, User } from '@oblifield/shared';
import { auditLogsApi } from '@/api/auditLogs.api';
import { usersApi } from '@/api/users.api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  status_change: 'Changement de statut',
  login: 'Connexion',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  intervention: 'Intervention',
  client: 'Client',
  technician: 'Technicien',
  site: 'Site',
  document: 'Document',
};

const ENTITY_TYPES = Object.keys(ENTITY_TYPE_LABELS);

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ChangesCell({ changes }: { changes: unknown }) {
  const [expanded, setExpanded] = useState(false);

  if (!changes || (typeof changes === 'object' && Object.keys(changes as object).length === 0)) {
    return <span className="text-gray-400">—</span>;
  }

  const changesObj = changes as Record<string, { old?: unknown; new?: unknown }>;

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-accent hover:underline"
      >
        {Object.keys(changesObj).length} champ(s)
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
        />
      </button>
      {expanded && (
        <div className="mt-1 max-h-48 overflow-auto rounded border border-gray-700 bg-gray-800 p-2 text-xs">
          {Object.entries(changesObj).map(([field, val]) => (
            <div key={field} className="mb-1 last:mb-0">
              <span className="font-semibold text-gray-300">{field}:</span>{' '}
              <span className="text-red-400">{JSON.stringify(val?.old ?? null)}</span>
              {' → '}
              <span className="text-green-400">{JSON.stringify(val?.new ?? null)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterUserId, setFilterUserId] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(
    async (offset: number, append: boolean) => {
      try {
        const filters: { entityType?: string; userId?: number; limit?: number; offset?: number } = {
          limit: PAGE_SIZE,
          offset,
        };
        if (filterEntityType) filters.entityType = filterEntityType;
        if (filterUserId !== '') filters.userId = filterUserId as number;

        const data = await auditLogsApi.list(filters);
        if (append) {
          setLogs((prev) => [...prev, ...data]);
        } else {
          setLogs(data);
        }
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        // silently fail
      }
    },
    [filterEntityType, filterUserId],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [, usersData] = await Promise.all([
          fetchLogs(0, false),
          usersApi.list(),
        ]);
        setUsers(usersData);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchLogs]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchLogs(logs.length, true);
    setLoadingMore(false);
  };

  const handleApplyFilters = () => {
    setLoading(true);
    fetchLogs(0, false).finally(() => setLoading(false));
  };

  const handleResetFilters = () => {
    setFilterEntityType('');
    setFilterUserId('');
  };

  const getUserName = (userId: number | null | undefined): string => {
    if (!userId) return '—';
    const u = users.find((u) => u.id === userId);
    return u ? u.displayName || u.username : `#${userId}`;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <History className="h-6 w-6 text-accent" />
          Journal d&apos;audit
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition',
            showFilters
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-gray-600 text-gray-300 hover:border-gray-400',
          )}
        >
          <Filter className="h-4 w-4" />
          Filtres
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Type d&apos;entité</label>
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
            >
              <option value="">Tous</option>
              {ENTITY_TYPES.map((et) => (
                <option key={et} value={et}>
                  {ENTITY_TYPE_LABELS[et]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Utilisateur</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value ? Number(e.target.value) : '')}
              className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
            >
              <option value="">Tous</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.username}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-black transition hover:bg-accent/80"
            >
              Appliquer
            </button>
            <button
              onClick={handleResetFilters}
              className="rounded-md border border-gray-600 px-4 py-1.5 text-sm text-gray-300 transition hover:border-gray-400"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-700 bg-gray-800/60 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  Utilisateur
                </span>
              </th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Type d&apos;entité</th>
              <th className="px-4 py-3">Entité</th>
              <th className="px-4 py-3">Changements</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Aucune entrée trouvée
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-800/30">
                <td className="whitespace-nowrap px-4 py-2.5 text-gray-300">
                  {formatDate(log.createdAt as string | undefined)}
                </td>
                <td className="px-4 py-2.5 text-gray-300">
                  {getUserName(log.userId)}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                      log.action === 'create' && 'bg-green-900/40 text-green-400',
                      log.action === 'update' && 'bg-blue-900/40 text-blue-400',
                      log.action === 'delete' && 'bg-red-900/40 text-red-400',
                      log.action === 'status_change' && 'bg-yellow-900/40 text-yellow-400',
                      log.action === 'login' && 'bg-purple-900/40 text-purple-400',
                    )}
                  >
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-300">
                  {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}
                </td>
                <td className="px-4 py-2.5 text-gray-300">
                  {log.entityId ? `#${log.entityId}` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <ChangesCell changes={log.changes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {hasMore && logs.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-lg border border-gray-600 px-6 py-2 text-sm text-gray-300 transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {loadingMore ? (
              <LoadingSpinner size="sm" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Charger plus
          </button>
        </div>
      )}
    </div>
  );
}
