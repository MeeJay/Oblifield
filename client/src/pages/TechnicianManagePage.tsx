import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  UserCheck,
  CircleDot,
  Star,
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
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState<TechForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const techs = await techniciansApi.list();
      setTechnicians(techs);
    } catch {
      toast.error('Failed to load technicians');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Le prenom et le nom sont requis');
      return;
    }
    setSaving(true);
    try {
      await techniciansApi.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        company: form.company.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
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
      });
      toast.success('Technicien ajoute');
      setAddModalOpen(false);
      setForm(emptyForm);
      await fetchData();
    } catch {
      toast.error("Echec de l'ajout");
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
        <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
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
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Note
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Statut
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
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Ajouter un technicien
            </h2>
            <form onSubmit={handleAdd} className="space-y-5">
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
                  Ajouter
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddModalOpen(false);
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
