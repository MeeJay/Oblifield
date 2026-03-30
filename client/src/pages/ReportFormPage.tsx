import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileDown,
  Users,
  MessageSquare,
  Camera,
  Tag,
} from 'lucide-react';
import type { Intervention, Client, Site, Technician } from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { clientsApi } from '@/api/clients.api';
import { sitesApi } from '@/api/sites.api';
import { techniciansApi } from '@/api/technicians.api';
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
  supervisorName: string;
  ticketReference: string;
  comments: string;
  photoFilenames: string;
}

export function ReportFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const interventionId = id ? Number(id) : null;

  const [loading, setLoading] = useState(!!interventionId);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [form, setForm] = useState<ReportFormData>({
    clientName: '',
    siteName: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '',
    endTime: '',
    title: '',
    technicianName: '',
    supervisorName: '',
    ticketReference: '',
    comments: '',
    photoFilenames: '',
  });

  // Load reference data
  useEffect(() => {
    Promise.all([
      clientsApi.list(),
      techniciansApi.list(),
    ]).then(([c, tech]) => {
      setClients(c);
      setTechnicians(tech);
    }).catch(() => {});
  }, []);

  // Pre-fill from intervention if editing
  useEffect(() => {
    if (!interventionId) return;
    (async () => {
      try {
        const intv = await interventionsApi.getById(interventionId);
        const timeline = await interventionsApi.getTimeline(interventionId);
        const photos = await interventionsApi.getPhotos(interventionId);

        // Load sites for this client
        if (intv.clientId) {
          const clientSites = await sitesApi.list({ clientId: intv.clientId });
          setSites(clientSites);
        }

        // Gather comments from timeline notes
        const notes = timeline
          .filter(e => e.type === 'note' || e.type === 'check_in' || e.type === 'check_out')
          .filter(e => e.message)
          .map(e => e.message!)
          .join('\n');

        const allComments = [intv.description, notes].filter(Boolean).join('\n');

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
          supervisorName: intv.supervisorName ?? '',
          ticketReference: intv.ticketReference ?? '',
          comments: allComments,
          photoFilenames: photos.map(p => p.originalName).join('\n'),
        });
      } catch {
        toast.error('Failed to load intervention');
      } finally {
        setLoading(false);
      }
    })();
  }, [interventionId]);

  // Save supervisor/ticket back to intervention before generating
  const saveFields = async () => {
    if (!interventionId) return;
    setSaving(true);
    try {
      await interventionsApi.update(interventionId, {
        supervisorName: form.supervisorName.trim() || null,
        ticketReference: form.ticketReference.trim() || null,
        description: form.comments.trim() || null,
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

    // Open PDF in new tab
    const supervisorParam = form.supervisorName.trim()
      ? `?supervisor=${encodeURIComponent(form.supervisorName.trim())}`
      : '';
    window.open(`/api/interventions/${interventionId}/report/pdf${supervisorParam}`, '_blank');
    setGenerating(false);
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
        {/* ── IDENTIFICATION ── */}
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
                <option value="">—</option>
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
                <option value="">—</option>
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

        {/* ── INTERVENANTS ── */}
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
                <option value="">—</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.displayName || tech.username || ''}>
                    {tech.displayName || tech.username}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t('report.supervisor', 'SUPERVISEUR')}
              value={form.supervisorName}
              onChange={(e) => setForm(f => ({ ...f, supervisorName: e.target.value }))}
              placeholder="ex: A. Allard"
            />
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

        {/* ── COMMENTAIRES ── */}
        <Section label={`${t('report.comments', 'COMMENTAIRES')} *`} icon={<MessageSquare size={14} />}>
          <textarea
            value={form.comments}
            onChange={(e) => setForm(f => ({ ...f, comments: e.target.value }))}
            rows={6}
            placeholder={t('report.commentsPlaceholder', "Décrivez le déroulé de l'intervention...\nUne ligne = un paragraphe dans le PDF.")}
            className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </Section>

        {/* ── PHOTOS ── */}
        <Section label={t('report.photos', 'PHOTOS')} icon={<Camera size={14} />}>
          <p className="text-xs text-text-muted mb-2">
            {t('report.photosHint', "Les photos uploadées sur l'intervention seront incluses dans le PDF.")}
          </p>
          {form.photoFilenames ? (
            <div className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary font-mono whitespace-pre-wrap">
              {form.photoFilenames}
            </div>
          ) : (
            <p className="text-sm text-text-muted italic">
              {t('report.noPhotos', 'Aucune photo attachée.')}
            </p>
          )}
        </Section>

        {/* ── GENERATE BUTTON ── */}
        <div className="p-5">
          <Button
            variant="primary"
            className="w-full py-3 text-base font-semibold"
            loading={generating || saving}
            onClick={handleGenerate}
            disabled={!interventionId}
          >
            <FileDown size={18} className="mr-2" />
            {t('report.generate', 'Générer le rapport PDF')}
          </Button>
          {!interventionId && (
            <p className="text-xs text-text-muted text-center mt-2">
              {t('report.saveFirst', "Sauvegardez l'intervention d'abord pour générer le rapport.")}
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
