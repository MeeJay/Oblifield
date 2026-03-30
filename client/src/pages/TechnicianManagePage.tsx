import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  UserCheck,
  Phone,
  Wrench,
  CircleDot,
} from 'lucide-react';
import type { Technician, TechnicianStatus, User } from '@oblifield/shared';
import { techniciansApi } from '@/api/technicians.api';
import { usersApi } from '@/api/users.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
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

export function TechnicianManagePage() {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addSpecialties, setAddSpecialties] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [techs, userList] = await Promise.all([
        techniciansApi.list(),
        usersApi.list(),
      ]);
      setTechnicians(techs);
      setUsers(userList);
    } catch {
      toast.error('Failed to load technicians');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const existingUserIds = new Set(technicians.map((t) => t.userId));
  const availableUsers = users.filter((u) => !existingUserIds.has(u.id) && u.isActive);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    setSaving(true);
    try {
      await techniciansApi.create({
        userId: Number(selectedUserId),
        phone: addPhone.trim() || undefined,
        specialties: addSpecialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success('Technician added');
      setAddModalOpen(false);
      setSelectedUserId('');
      setAddPhone('');
      setAddSpecialties('');
      await fetchData();
    } catch {
      toast.error('Failed to add technician');
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-2xl font-semibold text-text-primary">Technicians</h1>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setAddModalOpen(true)}
          disabled={availableUsers.length === 0}
        >
          <Plus size={16} className="mr-1.5" />
          Add Technician
        </Button>
      </div>

      {/* Table */}
      {technicians.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-secondary p-8 text-center">
          <UserCheck size={32} className="mx-auto mb-3 text-text-secondary" />
          <p className="text-text-secondary">
            No technicians yet. Add technicians from your user list.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Specialties
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Current
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {technicians.map((tech) => {
                const statusCfg = STATUS_CONFIG[tech.status];
                return (
                  <tr
                    key={tech.id}
                    onClick={() => navigate(`/technicians/${tech.id}`)}
                    className="bg-bg-secondary hover:bg-bg-tertiary transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-text-primary">
                        {tech.displayName ?? tech.username ?? `Tech #${tech.id}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          statusCfg.color,
                        )}
                      >
                        <CircleDot size={10} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {tech.phone ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tech.specialties.length > 0
                          ? tech.specialties.map((s) => (
                              <span
                                key={s}
                                className="rounded-full bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary"
                              >
                                {s}
                              </span>
                            ))
                          : <span className="text-xs text-text-secondary">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {tech.currentInterventionId ? (
                        <span className="text-accent">
                          #{tech.currentInterventionId}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Add Technician
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-text-secondary">
                  User *
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                >
                  <option value="">-- Select a user --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName ?? u.username}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Phone"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                type="tel"
              />
              <Input
                label="Specialties (comma-separated)"
                value={addSpecialties}
                onChange={(e) => setAddSpecialties(e.target.value)}
                placeholder="Electrical, Plumbing, HVAC"
              />
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" loading={saving}>
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
