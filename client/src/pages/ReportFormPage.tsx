import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileDown,
  Users,
  Camera,
  Tag,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import type { Intervention, Client, Site, Technician, User } from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { clientsApi } from '@/api/clients.api';
import { sitesApi } from '@/api/sites.api';
import { techniciansApi } from '@/api/technicians.api';
import { usersApi } from '@/api/users.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ReportFormData {
  clientName: string;
  siteName: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  technicianName: string;
  supervisorId: string;
  ticketReference: string;
  technicianObservations: string;
  supervisorObservations: string;
  photoFilenames: string;
}

export function ReportFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interventionId = id ? Number(id) : null;

  const [loading, setLoading] = useState(!!interventionId);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closingAndGenerating, setClosingAndGenerating] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState<ReportFormData>({
    clientName: '',
    siteName: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '',
    endTime: '',
    title: '',
    technicianName: '',
    supervisorId: '',
    ticketReference: '',
    technicianObservations: '',
    supervisorObservations: '',
    photoFilenames: '',
  });

  // Load reference data
  useEffect(() => {
    Promise.all([
      clientsApi.list(),
      techniciansApi.list(),
      usersApi.list(),
    ]).then(([c, tech, u]) => {
      setClients(c);
      setTechnicians(tech);
      setUsers(u);
    }).catch(() => {});
  }, []);

  // Pre-fill from intervention if editing
  useEffect(() => {
    if (!interventionId) return;
    (async () => {
      try {
        const intv = await interventionsApi.getById(interventionId);
        const photos = await interventionsApi.getPhotos(interventionId);

        // Load sites for this client
        if (intv.clientId) {
          const clientSites = await sitesApi.list({ clientId: intv.clientId });
          setSites(clientSites);
        }

        // Format times
        const startTime = intv.startedAt ? new Date(intv.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
        const endTime = intv.completedAt ? new Date(intv.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
        const date = intv.startedAt
          ? new Date(intv.startedAt).toISOString().slice(0, 10)
          : intv.scheduledAt
            ? new Date(intv.scheduledAt).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

        setForm({
          clientName: intv.clientName ?? '',
          siteName: intv.siteName ?? '',
          date,
          startTime,
          endTime,
          title: intv.title,
          technicianName: intv.assignedTechnicianName ?? '',
          supervisorId: intv.supervisorId?.toString() ?? '',
          ticketReference: intv.ticketReference ?? '',
          technicianObservations: intv.technicianObservations ?? '',
          supervisorObservations: intv.supervisorObservations ?? '',
          photoFilenames: photos.map(p => p.originalName).join('\n'),
        });
      } catch {
        toast.error('Failed to load intervention');
      } finally {
        setLoading(false);
      }
    })();
  }, [interventionId]);

  // Save fields back to intervention before generating
  const saveFields = async () => {
    if (!interventionId) return;
    setSaving(true);
    try {
      const supervisorUser = users.find(u => String(u.id) === form.supervisorId);
      await interventionsApi.update(interventionId, {
        supervisorId: form.supervisorId ? Number(form.supervisorId) : null,
        supervisorName: supervisorUser ? (supervisorUser.displayName ?? supervisorUser.username) : null,
        ticketReference: form.ticketReference.trim() || null,
        technicianObservations: form.technicianObservations.trim() || null,
        supervisorObservations: form.supervisorObservations.trim() || null,
      } as Partial<Intervention>);
    } catch {
      // Non-blocking
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!interventionId) {
      toast.error('Save the intervention first');
      return;
    }
    setGenerating(true);
    await saveFields();

    const supervisorUser = users.find(u => String(u.id) === form.supervisorId);
    const supervisorName = supervisorUser ? (supervisorUser.displayName ?? supervisorUser.username ?? '') : '';
    const supervisorParam = supervisorName
      ? `?supervisor=${encodeURIComponent(supervisorName)}`
      : '';
    window.open(`/api/interventions/${interventionId}/report/pdf${supervisorParam}`, '_blank');
    setGenerating(false);
  };

  const handleGenerateAndClose = async () => {
    if (!interventionId) {
      toast.error('Save the intervention first');
      return;
    }
    setClosingAndGenerating(true);
    try {
      await saveFields();

      // Generate PDF
      const supervisorUser = users.find(u => String(u.id) === form.supervisorId);
      const supervisorName = supervisorUser ? (supervisorUser.displayName ?? supervisorUser.username ?? '') : '';
      const supervisorParam = supervisorName
        ? `?supervisor=${encodeURIComponent(supervisorName)}`
        : '';
      window.open(`/api/interventions/${interventionId}/report/pdf${supervisorParam}`, '_blank');

      // Set status to done
      await interventionsApi.changeStatus(interventionId, 'done');
      toast.success('Intervention cloturee');
      navigate(`/intervention/${interventionId}`);
    } catch {
      toast.error('Echec de la cloture');
    } finally {
      setClosingAndGenerating(false);
    }
  };

  const handleClientChange = async (clientName: string) => {
    setForm(f => ({ ...f, clientName, siteName: '' }));
    const client = clients.find(c => c.name === clientName);
    if (client) {
      const clientSites = await sitesApi.list({ clientId: client.id });
      setSites(clientSites);
    } else {
      setSites([]);
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
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header banner */}
      <div className="rounded-t-lg bg-gradient-to-r from-[#2D3561] to-[#3B4578] p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-accent/20 flex items-center justify-center">
          <FileDown size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">{t('report.title', "Rapport d'intervention")}</h1>
          <p className="text-xs text-white/60">{t('report.subtitle', "Rapport d'intervention")}</p>
        </div>
      </div>

      <div className="rounded-b-lg border border-t-0 border-border bg-bg-primary">
        {/* IDENTIFICATION */}
        <Section label={t('report.identification', 'IDENTIFICATION')} icon={<Tag size={14} />}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                {t('intervention.client', 'CLIENT')} *
              </label>
              <select
                value={form.clientName}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">---</option>
                {clients.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                {t('intervention.site', 'SITE')}
              </label>
              <select
                value={form.siteName}
                onChange={(e) => setForm(f => ({ ...f, siteName: e.target.value }))}
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">---</option>
                {sites.map(s => (
                  <option key={s.id} value={s.name}>{s.name} {s.city ? `(${s.city})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <Input
              label={`${t('report.date', 'DATE')} *`}
              type="date"
              value={form.date}
              onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <Input
              label={t('report.start', 'DEBUT')}
              type="time"
              value={form.startTime}
              onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))}
            />
            <Input
              label={t('report.end', 'FIN')}
              type="time"
              value={form.endTime}
              onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))}
            />
          </div>
          <div className="mt-3">
            <Input
              label={t('report.object', 'OBJET')}
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="ex: Remplacement d'onduleur"
            />
          </div>
        </Section>

        {/* INTERVENANTS */}
        <Section label={t('report.participants', 'INTERVENANTS')} icon={<Users size={14} />}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                {t('intervention.technician', 'TECHNICIEN')}
              </label>
              <select
                value={form.technicianName}
                onChange={(e) => setForm(f => ({ ...f, technicianName: e.target.value }))}
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">---</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={`${tech.firstName} ${tech.lastName}`}>
                    {tech.firstName} {tech.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                {t('report.supervisor', 'SUPERVISEUR')}
              </label>
              <select
                value={form.supervisorId}
                onChange={(e) => setForm(f => ({ ...f, supervisorId: e.target.value }))}
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">---</option>
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>
                    {u.displayName ?? u.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <Input
              label={t('report.ticket', 'TICKET OPERATEUR')}
              value={form.ticketReference}
              onChange={(e) => setForm(f => ({ ...f, ticketReference: e.target.value }))}
              placeholder="ex: C35234948 (optionnel)"
            />
          </div>
        </Section>

        {/* OBSERVATIONS TECHNICIEN */}
        <Section label={t('report.techObs', 'OBSERVATIONS TECHNICIEN')} icon={<MessageSquare size={14} />}>
          <textarea
            value={form.technicianObservations}
            onChange={(e) => setForm(f => ({ ...f, technicianObservations: e.target.value }))}
            rows={4}
            placeholder={t('report.techObsPlaceholder', "Observations du technicien sur l'intervention...")}
            className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </Section>

        {/* OBSERVATIONS SUPERVISEUR */}
        <Section label={t('report.supObs', 'OBSERVATIONS SUPERVISEUR')} icon={<MessageSquare size={14} />}>
          <textarea
            value={form.supervisorObservations}
            onChange={(e) => setForm(f => ({ ...f, supervisorObservations: e.target.value }))}
            rows={4}
            placeholder={t('report.supObsPlaceholder', "Observations du superviseur...")}
            className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </Section>

        {/* PHOTOS */}
        <Section label={t('report.photos', 'PHOTOS')} icon={<Camera size={14} />}>
          <p className="text-xs text-text-muted mb-2">
            {t('report.photosHint', "Les photos uploadees sur l'intervention seront incluses dans le PDF.")}
          </p>
          {form.photoFilenames ? (
            <div className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary font-mono whitespace-pre-wrap">
              {form.photoFilenames}
            </div>
          ) : (
            <p className="text-sm text-text-muted italic">
              {t('report.noPhotos', 'Aucune photo attachee.')}
            </p>
          )}
        </Section>

        {/* BUTTONS */}
        <div className="p-5 space-y-3">
          <Button
            variant="primary"
            className="w-full py-3 text-base font-semibold"
            loading={generating || saving}
            onClick={handleGenerate}
            disabled={!interventionId}
          >
            <FileDown size={18} className="mr-2" />
            {t('report.generate', 'Generer le rapport PDF')}
          </Button>
          <Button
            variant="primary"
            className="w-full py-3 text-base font-semibold !bg-green-600 hover:!bg-green-700"
            loading={closingAndGenerating}
            onClick={handleGenerateAndClose}
            disabled={!interventionId}
          >
            <CheckCircle2 size={18} className="mr-2" />
            Generer & Cloturer
          </Button>
          {!interventionId && (
            <p className="text-xs text-text-muted text-center mt-2">
              {t('report.saveFirst', "Sauvegardez l'intervention d'abord pour generer le rapport.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-5 py-2 bg-[#3B4578]/80">
        {icon && <span className="text-accent">{icon}</span>}
        <span className="text-xs font-bold text-white uppercase tracking-wider">{label}</span>
      </div>
      <div className="px-5 py-4">
        {children}
      </div>
    </div>
  );
}
