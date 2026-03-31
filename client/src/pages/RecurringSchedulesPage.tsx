import { useEffect, useState, type FormEvent } from 'react';
import {
  Plus,
  CalendarClock,
  Pencil,
  Trash2,
  Play,
} from 'lucide-react';
import type {
  RecurringSchedule,
  RecurringFrequency,
  Client,
  Site,
  Technician,
  StepTemplate,
} from '@oblifield/shared';
import {
  INTERVENTION_TYPES,
  INTERVENTION_TYPE_LABELS,
  INTERVENTION_PRIORITY,
  INTERVENTION_PRIORITY_LABELS,
} from '@oblifield/shared';
import { recurringSchedulesApi } from '@/api/recurringSchedules.api';
import { clientsApi } from '@/api/clients.api';
import { sitesApi } from '@/api/sites.api';
import { techniciansApi } from '@/api/technicians.api';
import { stepTemplatesApi } from '@/api/stepTemplates.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function formatFrequency(schedule: RecurringSchedule): string {
  const { frequency, interval, dayOfWeek, dayOfMonth } = schedule;

  if (frequency === 'daily') {
    if (interval === 1) return 'Tous les jours';
    return `Tous les ${interval} jours`;
  }
  if (frequency === 'weekly') {
    const day = dayOfWeek != null ? DAY_NAMES[dayOfWeek] : '';
    if (interval === 1) return `Chaque semaine le ${day}`;
    return `Toutes les ${interval} semaines le ${day}`;
  }
  if (frequency === 'monthly') {
    if (interval === 1) return `Chaque mois le ${dayOfMonth ?? 1}`;
    return `Tous les ${interval} mois le ${dayOfMonth ?? 1}`;
  }
  if (frequency === 'yearly') {
    if (interval === 1) return `Chaque annee le ${dayOfMonth ?? 1}`;
    return `Tous les ${interval} ans le ${dayOfMonth ?? 1}`;
  }
  return frequency;
}

interface ScheduleForm {
  title: string;
  description: string;
  type: string;
  priority: string;
  clientId: string;
  siteId: string;
  assignedTechnicianId: string;
  stepTemplateId: string;
  frequency: RecurringFrequency;
  interval: string;
  dayOfWeek: string;
  dayOfMonth: string;
  timeOfDay: string;
  estimatedDurationMinutes: string;
  address: string;
  contactName: string;
  contactPhone: string;
  isActive: boolean;
}

const emptyForm: ScheduleForm = {
  title: '',
  description: '',
  type: 'maintenance',
  priority: 'normal',
  clientId: '',
  siteId: '',
  assignedTechnicianId: '',
  stepTemplateId: '',
  frequency: 'weekly',
  interval: '1',
  dayOfWeek: '1',
  dayOfMonth: '1',
  timeOfDay: '08:00',
  estimatedDurationMinutes: '',
  address: '',
  contactName: '',
  contactPhone: '',
  isActive: true,
};

export function RecurringSchedulesPage() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [stepTemplates, setStepTemplates] = useState<StepTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchSchedules = async () => {
    try {
      const data = await recurringSchedulesApi.list();
      setSchedules(data);
    } catch {
      toast.error('Echec du chargement des planifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [c, t, st] = await Promise.all([
        clientsApi.list(),
        techniciansApi.list(),
        stepTemplatesApi.list(),
      ]);
      setClients(c);
      setTechnicians(t);
      setStepTemplates(st);
    } catch {
      toast.error('Echec du chargement des donnees de reference');
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchReferenceData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch sites when client changes
  useEffect(() => {
    if (form.clientId) {
      sitesApi
        .list({ clientId: Number(form.clientId) })
        .then(setSites)
        .catch(() => setSites([]));
    } else {
      setSites([]);
    }
  }, [form.clientId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((f) => ({ ...f, [name]: checked }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (schedule: RecurringSchedule) => {
    setEditingId(schedule.id);
    setForm({
      title: schedule.title,
      description: schedule.description ?? '',
      type: schedule.type,
      priority: schedule.priority,
      clientId: schedule.clientId?.toString() ?? '',
      siteId: schedule.siteId?.toString() ?? '',
      assignedTechnicianId: schedule.assignedTechnicianId?.toString() ?? '',
      stepTemplateId: schedule.stepTemplateId?.toString() ?? '',
      frequency: schedule.frequency,
      interval: schedule.interval.toString(),
      dayOfWeek: schedule.dayOfWeek?.toString() ?? '1',
      dayOfMonth: schedule.dayOfMonth?.toString() ?? '1',
      timeOfDay: schedule.timeOfDay ?? '08:00',
      estimatedDurationMinutes: schedule.estimatedDurationMinutes?.toString() ?? '',
      address: schedule.address ?? '',
      contactName: schedule.contactName ?? '',
      contactPhone: schedule.contactPhone ?? '',
      isActive: schedule.isActive,
    });
    setModalOpen(true);
  };

  const handleDelete = async (schedule: RecurringSchedule) => {
    if (!confirm(`Supprimer la planification "${schedule.title}" ?`)) return;
    try {
      await recurringSchedulesApi.delete(schedule.id);
      toast.success('Planification supprimee');
      await fetchSchedules();
    } catch {
      toast.error('Echec de la suppression');
    }
  };

  const handleProcessNow = async () => {
    setProcessing(true);
    try {
      const result = await recurringSchedulesApi.processNow();
      toast.success(`Traitement termine : ${result.created} intervention(s) creee(s)`);
      await fetchSchedules();
    } catch {
      toast.error('Echec du traitement');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<RecurringSchedule> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        priority: form.priority,
        clientId: form.clientId ? Number(form.clientId) : null,
        siteId: form.siteId ? Number(form.siteId) : null,
        assignedTechnicianId: form.assignedTechnicianId
          ? Number(form.assignedTechnicianId)
          : null,
        stepTemplateId: form.stepTemplateId ? Number(form.stepTemplateId) : null,
        frequency: form.frequency,
        interval: Number(form.interval) || 1,
        dayOfWeek: form.frequency === 'weekly' ? Number(form.dayOfWeek) : null,
        dayOfMonth:
          form.frequency === 'monthly' || form.frequency === 'yearly'
            ? Number(form.dayOfMonth)
            : null,
        timeOfDay: form.timeOfDay || null,
        estimatedDurationMinutes: form.estimatedDurationMinutes
          ? Number(form.estimatedDurationMinutes)
          : null,
        address: form.address.trim() || null,
        contactName: form.contactName.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        isActive: form.isActive,
      };
      if (editingId) {
        await recurringSchedulesApi.update(editingId, payload);
        toast.success('Planification modifiee');
      } else {
        await recurringSchedulesApi.create(payload);
        toast.success('Planification ajoutee');
      }
      setModalOpen(false);
      setForm(emptyForm);
      await fetchSchedules();
    } catch {
      toast.error('Echec de la sauvegarde');
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
    'w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Planifications recurrentes</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleProcessNow} loading={processing}>
            <Play size={16} className="mr-1.5" />
            Traiter maintenant
          </Button>
          <Button variant="primary" size="sm" onClick={() => openAdd()}>
            <Plus size={16} className="mr-1.5" />
            Ajouter une planification
          </Button>
        </div>
      </div>

      {/* Table */}
      {schedules.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-secondary p-8 text-center">
          <CalendarClock size={32} className="mx-auto mb-3 text-text-secondary" />
          <p className="text-text-secondary">
            Aucune planification recurrente. Ajoutez-en une pour commencer.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Titre
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Frequence
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Technicien
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Prochaine execution
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedules.map((schedule) => (
                <tr
                  key={schedule.id}
                  className="bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-text-primary">
                      {schedule.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {formatFrequency(schedule)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {schedule.clientName ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {schedule.assignedTechnicianName ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {schedule.nextRunAt
                      ? new Date(schedule.nextRunAt).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        schedule.isActive
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-gray-500/10 text-gray-500',
                      )}
                    >
                      {schedule.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(schedule)}
                        className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(schedule)}
                        className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingId ? 'Modifier la planification' : 'Ajouter une planification'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* General */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">General</h3>
                <div className="space-y-3">
                  <Input
                    label="Titre *"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                  />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-text-secondary">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      className={selectClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-text-secondary">Type</label>
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
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-text-secondary">
                        Priorite
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
                </div>
              </div>

              {/* Affectation */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Affectation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-text-secondary">Client</label>
                    <select
                      name="clientId"
                      value={form.clientId}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="">-- Aucun --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-text-secondary">Site</label>
                    <select
                      name="siteId"
                      value={form.siteId}
                      onChange={handleChange}
                      className={selectClass}
                      disabled={!form.clientId}
                    >
                      <option value="">-- Aucun --</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      <option value="">-- Aucun --</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-text-secondary">
                      Modele d'etapes
                    </label>
                    <select
                      name="stepTemplateId"
                      value={form.stepTemplateId}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="">-- Aucun --</option>
                      {stepTemplates.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Recurrence</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-text-secondary">
                      Frequence
                    </label>
                    <select
                      name="frequency"
                      value={form.frequency}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="daily">Quotidienne</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuelle</option>
                      <option value="yearly">Annuelle</option>
                    </select>
                  </div>
                  <Input
                    label="Intervalle"
                    name="interval"
                    value={form.interval}
                    onChange={handleChange}
                    type="number"
                    min="1"
                  />
                  {form.frequency === 'weekly' && (
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-text-secondary">
                        Jour de la semaine
                      </label>
                      <select
                        name="dayOfWeek"
                        value={form.dayOfWeek}
                        onChange={handleChange}
                        className={selectClass}
                      >
                        {DAY_NAMES.map((name, i) => (
                          <option key={i} value={i}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(form.frequency === 'monthly' || form.frequency === 'yearly') && (
                    <Input
                      label="Jour du mois"
                      name="dayOfMonth"
                      value={form.dayOfMonth}
                      onChange={handleChange}
                      type="number"
                      min="1"
                      max="31"
                    />
                  )}
                  <Input
                    label="Heure"
                    name="timeOfDay"
                    value={form.timeOfDay}
                    onChange={handleChange}
                    type="time"
                  />
                  <Input
                    label="Duree estimee (minutes)"
                    name="estimatedDurationMinutes"
                    value={form.estimatedDurationMinutes}
                    onChange={handleChange}
                    type="number"
                    min="0"
                  />
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Contact / Lieu</h3>
                <div className="space-y-3">
                  <Input
                    label="Adresse"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Nom du contact"
                      name="contactName"
                      value={form.contactName}
                      onChange={handleChange}
                    />
                    <Input
                      label="Telephone du contact"
                      name="contactPhone"
                      value={form.contactPhone}
                      onChange={handleChange}
                      type="tel"
                    />
                  </div>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-text-secondary">
                  Planification active
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" loading={saving}>
                  {editingId ? 'Enregistrer' : 'Ajouter'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setModalOpen(false);
                    setForm(emptyForm);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
