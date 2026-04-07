import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  UserCheck,
  CircleDot,
  Star,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Technician, TechnicianStatus } from '@oblifield/shared';
import { techniciansApi } from '@/api/technicians.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
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

function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-xs text-text-secondary">-</span>;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />);
    } else if (i === full && half) {
      stars.push(
        <span key={i} className="relative inline-block">
          <Star size={14} className="text-gray-500" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
          </span>
        </span>,
      );
    } else {
      stars.push(<Star key={i} size={14} className="text-gray-500" />);
    }
  }
  return <span className="inline-flex items-center gap-0.5">{stars}</span>;
}

interface TechForm {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
  preferredLanguage: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  type: string;
  typeOther: string;
  actionRadiusKm: string;
  rating: string;
  specialties: string;
}

const emptyForm: TechForm = {
  firstName: '',
  lastName: '',
  company: '',
  phone: '',
  email: '',
  preferredLanguage: 'fr',
  address: '',
  postalCode: '',
  city: '',
  country: '',
  type: 'electrician',
  typeOther: '',
  actionRadiusKm: '',
  rating: '',
  specialties: '',
};

export function TechnicianManagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TechForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const techs = await techniciansApi.list();
      setTechnicians(techs);
      return techs;
    } catch {
      toast.error('Failed to load technicians');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData().then((techs) => {
      const state = location.state as { editId?: number } | null;
      if (state?.editId) {
        const tech = techs.find((t) => t.id === state.editId);
        if (tech) openEdit(tech);
        // Clear the state so refreshing doesn't re-open
        navigate(location.pathname, { replace: true });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (tech: Technician) => {
    setEditingId(tech.id);
    setForm({
      firstName: tech.firstName,
      lastName: tech.lastName,
      company: tech.company ?? '',
      phone: tech.phone ?? '',
      email: tech.email ?? '',
      preferredLanguage: tech.preferredLanguage || 'fr',
      address: tech.address ?? '',
      postalCode: tech.postalCode ?? '',
      city: tech.city ?? '',
      country: tech.country ?? '',
      type: tech.type ?? 'electrician',
      typeOther: tech.typeOther ?? '',
      actionRadiusKm: tech.actionRadiusKm?.toString() ?? '',
      rating: tech.rating?.toString() ?? '',
      specialties: tech.specialties.join(', '),
    });
    setModalOpen(true);
  };

  const handleDelete = async (tech: Technician) => {
    if (!confirm(`Supprimer ${tech.firstName} ${tech.lastName} ?`)) return;
    try {
      await techniciansApi.delete(tech.id);
      toast.success('Technicien supprime');
      await fetchData();
    } catch {
      toast.error('Echec de la suppression');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Le prenom et le nom sont requis');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        company: form.company.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        preferredLanguage: form.preferredLanguage,
        address: form.address.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        type: form.type || undefined,
        typeOther: form.type === 'other' ? form.typeOther.trim() || undefined : undefined,
        actionRadiusKm: form.actionRadiusKm ? Number(form.actionRadiusKm) : undefined,
        rating: form.rating ? Number(form.rating) : undefined,
        specialties: form.specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (editingId) {
        await techniciansApi.update(editingId, payload);
        toast.success('Technicien modifie');
      } else {
        await techniciansApi.create(payload);
        toast.success('Technicien ajoute');
      }
      setModalOpen(false);
      setForm(emptyForm);
      await fetchData();
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
        <h1 className="text-2xl font-semibold text-text-primary">Techniciens</h1>
        <Button variant="primary" size="sm" onClick={() => openAdd()}>
          <Plus size={16} className="mr-1.5" />
          Ajouter un technicien
        </Button>
      </div>

      {/* Table */}
      {technicians.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-secondary p-8 text-center">
          <UserCheck size={32} className="mx-auto mb-3 text-text-secondary" />
          <p className="text-text-secondary">
            Aucun technicien. Ajoutez-en un pour commencer.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Nom
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Entreprise
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Ville / Pays
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Telephone
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Note
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
                        {tech.firstName} {tech.lastName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {tech.company ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {[tech.city, tech.country].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {tech.phone ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary truncate max-w-[180px]">
                      {tech.email ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {tech.type ? (tech.type === 'other' && tech.typeOther ? tech.typeOther : TYPE_LABELS[tech.type] ?? tech.type) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <RatingStars rating={tech.rating} />
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(tech); }}
                          className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(tech); }}
                          className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingId ? 'Modifier le technicien' : 'Ajouter un technicien'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identite */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Identite</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Prenom *"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Nom *"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Entreprise"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Coordonnees */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Coordonnees</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Telephone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    type="tel"
                  />
                  <Input
                    label="Email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    type="email"
                  />
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Langue</label>
                    <select
                      value={form.preferredLanguage}
                      onChange={(e) => setForm((f) => ({ ...f, preferredLanguage: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
                    >
                      <option value="fr">Francais</option>
                      <option value="en">English</option>
                      <option value="es">Espanol</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Adresse</h3>
                <div className="space-y-3">
                  <Input
                    label="Adresse"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Code postal"
                      name="postalCode"
                      value={form.postalCode}
                      onChange={handleChange}
                    />
                    <Input
                      label="Ville"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                    />
                    <Input
                      label="Pays"
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Profil */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Profil</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-text-secondary">Type</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="electrician">Electricien</option>
                      <option value="it">Informatique</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  {form.type === 'other' && (
                    <Input
                      label="Preciser le type"
                      name="typeOther"
                      value={form.typeOther}
                      onChange={handleChange}
                    />
                  )}
                  <Input
                    label="Rayon d'action (km)"
                    name="actionRadiusKm"
                    value={form.actionRadiusKm}
                    onChange={handleChange}
                    type="number"
                    min="0"
                  />
                  <Input
                    label="Note (0-5)"
                    name="rating"
                    value={form.rating}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                  />
                </div>
                <div className="mt-3">
                  <Input
                    label="Specialites (separees par des virgules)"
                    name="specialties"
                    value={form.specialties}
                    onChange={handleChange}
                    placeholder="Electricite, CVC, Reseaux"
                  />
                </div>
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
