import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import type {
  Intervention,
  InterventionType,
  InterventionPriority,
  Client,
  Site,
  Technician,
  User,
} from '@oblifield/shared';
import {
  INTERVENTION_TYPES,
  INTERVENTION_TYPE_LABELS,
  INTERVENTION_PRIORITY,
  INTERVENTION_PRIORITY_LABELS,
} from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { clientsApi } from '@/api/clients.api';
import { sitesApi } from '@/api/sites.api';
import { techniciansApi } from '@/api/technicians.api';
import { usersApi } from '@/api/users.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface FormData {
  title: string;
  description: string;
  type: InterventionType;
  priority: InterventionPriority;
  clientId: string;
  siteId: string;
  assignedTechnicianId: string;
  supervisorId: string;
  scheduledAt: string;
  dueAt: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  estimatedDurationMinutes: string;
  typeOther: string;
  technicianObservations: string;
  supervisorObservations: string;
}

const emptyForm: FormData = {
  title: '',
  description: '',
  type: 'maintenance',
  priority: 'normal',
  clientId: '',
  siteId: '',
  assignedTechnicianId: '',
  supervisorId: '',
  scheduledAt: '',
  dueAt: '',
  address: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  estimatedDurationMinutes: '',
  typeOther: '',
  technicianObservations: '',
  supervisorObservations: '',
};

function toDatetimeLocal(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterventionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id != null;

  const [form, setForm] = useState<FormData>(emptyForm);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Derived: selected technician phone
  const selectedTech = technicians.find((t) => String(t.id) === form.assignedTechnicianId);

  useEffect(() => {
    const load = async () => {
      try {
        const [allClients, allTechs, allUsers] = await Promise.all([
          clientsApi.list(),
          techniciansApi.list(),
          usersApi.list(),
        ]);
        setClients(allClients);
        setTechnicians(allTechs);
        setUsers(allUsers);

        if (isEdit) {
          const intv = await interventionsApi.getById(Number(id));
          setForm({
            title: intv.title,
            description: intv.description ?? '',
            type: intv.type,
            priority: intv.priority,
            clientId: intv.clientId?.toString() ?? '',
            siteId: intv.siteId?.toString() ?? '',
            assignedTechnicianId: intv.assignedTechnicianId?.toString() ?? '',
            supervisorId: intv.supervisorId?.toString() ?? '',
            scheduledAt: toDatetimeLocal(intv.scheduledAt),
            dueAt: toDatetimeLocal(intv.dueAt),
            address: intv.address ?? '',
            contactName: intv.contactName ?? '',
            contactPhone: intv.contactPhone ?? '',
            contactEmail: intv.contactEmail ?? '',
            estimatedDurationMinutes: intv.estimatedDurationMinutes?.toString() ?? '',
            technicianObservations: intv.technicianObservations ?? '',
            supervisorObservations: intv.supervisorObservations ?? '',
          });

          if (intv.clientId) {
            const clientSites = await sitesApi.list({ clientId: intv.clientId });
            setSites(clientSites);
          }
        }
      } catch {
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  const handleClientChange = (clientId: string) => {
    setForm((f) => ({ ...f, clientId, siteId: '', address: '', contactName: '', contactPhone: '', contactEmail: '' }));
    if (clientId) {
      sitesApi.list({ clientId: Number(clientId) }).then(setSites);
    } else {
      setSites([]);
    }
  };

  const handleSiteChange = (siteId: string) => {
    setForm((f) => {
      const site = sites.find((s) => String(s.id) === siteId);
      if (site) {
        const addressParts = [site.address, site.city, site.postalCode, site.country].filter(Boolean);
        return {
          ...f,
          siteId,
          address: addressParts.join(', ') || f.address,
          contactName: site.contactName ?? f.contactName,
          contactPhone: site.contactPhone ?? f.contactPhone,
          contactEmail: site.contactEmail ?? f.contactEmail,
        };
      }
      return { ...f, siteId };
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === 'clientId') {
      handleClientChange(value);
      return;
    }
    if (name === 'siteId') {
      handleSiteChange(value);
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Intervention> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        priority: form.priority,
        clientId: form.clientId ? Number(form.clientId) : null,
        siteId: form.siteId ? Number(form.siteId) : null,
        assignedTechnicianId: form.assignedTechnicianId
          ? Number(form.assignedTechnicianId)
          : null,
        supervisorId: form.supervisorId ? Number(form.supervisorId) : null,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        address: form.address.trim() || null,
        contactName: form.contactName.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        estimatedDurationMinutes: form.estimatedDurationMinutes
          ? Number(form.estimatedDurationMinutes)
          : null,
        technicianObservations: form.technicianObservations.trim() || null,
        supervisorObservations: form.supervisorObservations.trim() || null,
      };

      let result: Intervention;
      if (isEdit) {
        result = await interventionsApi.update(Number(id), payload);
        toast.success('Intervention updated');
      } else {
        result = await interventionsApi.create(payload);
        toast.success('Intervention created');
      }
      navigate(`/intervention/${result.id}`);
    } catch {
      toast.error(isEdit ? 'Failed to update' : 'Failed to create');
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

  const selectClass =
    'w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        {isEdit ? 'Edit Intervention' : 'New Intervention'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <Input
          label="Title *"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Intervention title"
          required
        />

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-secondary">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className={cn(selectClass, 'resize-y')}
            placeholder="Detailed description..."
          />
        </div>

        {/* Type + Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Type
            </label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className={selectClass}
            >
              {INTERVENTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {INTERVENTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {form.type === 'other' && (
              <Input
                name="typeOther"
                value={form.typeOther}
                onChange={handleChange}
                placeholder="Preciser le type..."
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Priority
            </label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className={selectClass}
            >
              {INTERVENTION_PRIORITY.map((p) => (
                <option key={p} value={p}>
                  {INTERVENTION_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Client + Site */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Client
            </label>
            <select
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">-- None --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Site
            </label>
            <select
              name="siteId"
              value={form.siteId}
              onChange={handleChange}
              className={selectClass}
              disabled={!form.clientId}
            >
              <option value="">-- None --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Site contact info (auto-filled) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Contact site"
            name="contactName"
            value={form.contactName}
            onChange={handleChange}
          />
          <Input
            label="Tel. site"
            name="contactPhone"
            value={form.contactPhone}
            onChange={handleChange}
            type="tel"
          />
          <Input
            label="Email site"
            name="contactEmail"
            value={form.contactEmail}
            onChange={handleChange}
            type="email"
          />
        </div>

        {/* Technician + Supervisor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Technicien assigne
            </label>
            <select
              name="assignedTechnicianId"
              value={form.assignedTechnicianId}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">-- Non assigne --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
            {selectedTech?.phone && (
              <p className="text-xs text-text-secondary mt-1">
                Tel. technicien : {selectedTech.phone}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Superviseur
            </label>
            <select
              name="supervisorId"
              value={form.supervisorId}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">-- Aucun --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName ?? u.username}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Scheduled At"
            type="datetime-local"
            name="scheduledAt"
            value={form.scheduledAt}
            onChange={handleChange}
          />
          <Input
            label="Due At"
            type="datetime-local"
            name="dueAt"
            value={form.dueAt}
            onChange={handleChange}
          />
        </div>

        {/* Address */}
        <Input
          label="Address"
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="123 Main St, City"
        />

        {/* Duration */}
        <Input
          label="Estimated Duration (minutes)"
          name="estimatedDurationMinutes"
          value={form.estimatedDurationMinutes}
          onChange={handleChange}
          type="number"
          min="1"
        />

        {/* Observations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Observations technicien
            </label>
            <textarea
              name="technicianObservations"
              value={form.technicianObservations}
              onChange={handleChange}
              rows={3}
              className={cn(selectClass, 'resize-y')}
              placeholder="Observations du technicien..."
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Observations superviseur
            </label>
            <textarea
              name="supervisorObservations"
              value={form.supervisorObservations}
              onChange={handleChange}
              rows={3}
              className={cn(selectClass, 'resize-y')}
              placeholder="Observations du superviseur..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button type="submit" variant="primary" loading={saving}>
            <Save size={16} className="mr-1.5" />
            {isEdit ? 'Update' : 'Create'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(isEdit ? `/intervention/${id}` : '/')}
          >
            <X size={16} className="mr-1.5" />
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
