import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Pencil,
  MapPin,
  MessageSquare,
  Camera,
  ArrowRight,
  LogIn,
  LogOut,
  Clock,
  User,
  ChevronDown,
  ImageIcon,
  FileDown,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Upload,
  FileText,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Link2,
} from 'lucide-react';
import type {
  Intervention,
  InterventionStatus,
  InterventionPhoto,
  InterventionDocument,
  TimelineEvent,
  Technician,
  TimelineEventType,
  DocDocument,
} from '@oblifield/shared';
import {
  INTERVENTION_STATUS,
  INTERVENTION_STATUS_LABELS,
  INTERVENTION_PRIORITY_LABELS,
  INTERVENTION_TYPE_LABELS,
} from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { documentsApi } from '@/api/documents.api';
import { techniciansApi } from '@/api/technicians.api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { InterventionSteps } from '@/components/interventions/InterventionSteps';
import { InterventionMiniMap } from '@/components/interventions/InterventionMiniMap';
import { InterventionParts } from '@/components/interventions/InterventionParts';
import { SignaturePanel } from '@/components/interventions/SignaturePanel';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

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

const TIMELINE_ICONS: Record<TimelineEventType, React.ReactNode> = {
  check_in: <MapPin size={16} className="text-green-500" />,
  check_out: <MapPin size={16} className="text-red-500" />,
  pause_start: <Clock size={16} className="text-orange-500" />,
  pause_end: <Clock size={16} className="text-accent" />,
  note: <MessageSquare size={16} className="text-blue-500" />,
  photo: <Camera size={16} className="text-purple-500" />,
  status_change: <ArrowRight size={16} className="text-accent" />,
  assignment: <User size={16} className="text-yellow-500" />,
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InterventionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const admin = isAdmin();

  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [photos, setPhotos] = useState<InterventionPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Observations state
  const [techObs, setTechObs] = useState('');
  const [supObs, setSupObs] = useState('');
  const [internalComments, setInternalComments] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  // Admin custom timestamps
  const [customCheckInTime, setCustomCheckInTime] = useState('');
  const [customCheckOutTime, setCustomCheckOutTime] = useState('');

  // Reassign technician
  const [reassignOpen, setReassignOpen] = useState(false);
  const [techList, setTechList] = useState<Technician[]>([]);

  // Documents state
  const [attachedDocs, setAttachedDocs] = useState<InterventionDocument[]>([]);
  const [allDocs, setAllDocs] = useState<DocDocument[]>([]);
  const [docPickerOpen, setDocPickerOpen] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const interventionId = Number(id);

  const fetchData = useCallback(async () => {
    try {
      const [intv, tl, ph, docs] = await Promise.all([
        interventionsApi.getById(interventionId),
        interventionsApi.getTimeline(interventionId),
        interventionsApi.getPhotos(interventionId),
        documentsApi.getInterventionDocs(interventionId),
      ]);
      setIntervention(intv);
      setTimeline(tl);
      setPhotos(ph);
      setAttachedDocs(docs);
      setTechObs(intv.technicianObservations ?? '');
      setSupObs(intv.supervisorObservations ?? '');
      setInternalComments(intv.description ?? '');
    } catch {
      toast.error('Echec du chargement de l\'intervention');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [interventionId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyTechLink = async () => {
    try {
      const url = await interventionsApi.getTechLink(interventionId);
      await navigator.clipboard.writeText(url);
      toast.success('Lien copie dans le presse-papier');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Echec de la generation du lien');
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      // Supervisor: use intervention site coordinates instead of real GPS
      const gps = intervention?.latitude && intervention?.longitude
        ? { latitude: intervention.latitude, longitude: intervention.longitude }
        : undefined;
      await interventionsApi.checkIn(interventionId, gps, customCheckInTime || undefined);
      toast.success(customCheckInTime ? 'Pointage entree manuel effectue' : 'Pointage entree effectue');
      setCustomCheckInTime('');
      await fetchData();
    } catch {
      toast.error('Echec du pointage entree');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      // Supervisor: use intervention site coordinates instead of real GPS
      await interventionsApi.checkOut(interventionId, {
        latitude: intervention?.latitude ?? undefined,
        longitude: intervention?.longitude ?? undefined,
        customTimestamp: customCheckOutTime || undefined,
      });
      toast.success(customCheckOutTime ? 'Pointage sortie manuel effectue' : 'Pointage sortie effectue');
      setCustomCheckOutTime('');
      await fetchData();
    } catch {
      toast.error('Echec du pointage sortie');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (status: InterventionStatus) => {
    setStatusMenuOpen(false);
    setActionLoading(true);
    try {
      await interventionsApi.changeStatus(interventionId, status);
      toast.success(`Statut modifie : ${INTERVENTION_STATUS_LABELS[status]}`);
      await fetchData();
    } catch {
      toast.error('Echec du changement de statut');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignalIssue = async () => {
    setActionLoading(true);
    try {
      await interventionsApi.changeStatus(interventionId, 'issue');
      toast.success('Probleme signale');
      await fetchData();
    } catch {
      toast.error('Echec du signalement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await interventionsApi.changeStatus(interventionId, 'cancelled');
      toast.success('Intervention annulee');
      await fetchData();
    } catch {
      toast.error('Echec de l\'annulation');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await interventionsApi.pause(interventionId);
      toast.success('Intervention en pause');
      await fetchData();
    } catch {
      toast.error('Echec de la mise en pause');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await interventionsApi.resume(interventionId);
      toast.success('Intervention reprise');
      await fetchData();
    } catch {
      toast.error('Echec de la reprise');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    setActionLoading(true);
    try {
      await interventionsApi.close(interventionId);
      toast.success('Intervention cloturee');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Echec de la cloture');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassign = async (technicianId: number) => {
    setActionLoading(true);
    try {
      await interventionsApi.assign(interventionId, technicianId);
      toast.success('Technicien reassigne');
      setReassignOpen(false);
      await fetchData();
    } catch {
      toast.error('Echec de la reassignation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm('Supprimer cette photo ?')) return;
    try {
      await interventionsApi.deletePhoto(interventionId, photoId);
      toast.success('Photo supprimee');
      await fetchData();
    } catch {
      toast.error('Echec de la suppression');
    }
  };

  const openReassign = async () => {
    if (techList.length === 0) {
      try {
        const list = await techniciansApi.list();
        setTechList(list);
      } catch { /* ignore */ }
    }
    setReassignOpen(true);
  };

  const handleDeleteTimelineEvent = async (eventId: number) => {
    if (!confirm('Supprimer cet evenement ?')) return;
    try {
      await interventionsApi.deleteTimelineEvent(interventionId, eventId);
      toast.success('Evenement supprime');
      await fetchData();
    } catch {
      toast.error('Echec de la suppression');
    }
  };

  const handleDeleteIntervention = async () => {
    if (!confirm('Supprimer definitivement cette intervention et toutes ses donnees (photos, timeline, etc.) ?')) return;
    setActionLoading(true);
    try {
      await interventionsApi.delete(interventionId);
      toast.success('Intervention supprimee');
      navigate('/');
    } catch {
      toast.error('Echec de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveObservations = async () => {
    setSavingObs(true);
    try {
      await interventionsApi.update(interventionId, {
        technicianObservations: techObs.trim() || null,
        supervisorObservations: supObs.trim() || null,
        description: internalComments.trim() || null,
      } as Partial<Intervention>);
      toast.success('Observations enregistrees');
    } catch {
      toast.error('Echec de la sauvegarde');
    } finally {
      setSavingObs(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      for (const file of Array.from(files)) {
        await interventionsApi.uploadPhoto(interventionId, file);
      }
      toast.success(`${files.length} photo(s) ajoutee(s)`);
      const ph = await interventionsApi.getPhotos(interventionId);
      setPhotos(ph);
    } catch {
      toast.error("Echec de l'upload");
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const openDocPicker = async () => {
    try {
      const all = await documentsApi.list();
      setAllDocs(all);
      setDocPickerOpen(true);
    } catch {
      toast.error('Erreur de chargement des documents');
    }
  };

  const handleAttachDoc = async (docId: number) => {
    try {
      const docs = await documentsApi.attachToIntervention(interventionId, docId);
      setAttachedDocs(docs);
      setDocPickerOpen(false);
      toast.success('Document attache');
    } catch {
      toast.error('Echec');
    }
  };

  const handleDetachDoc = async (docId: number) => {
    try {
      await documentsApi.detachFromIntervention(interventionId, docId);
      setAttachedDocs((prev) => prev.filter((d) => d.documentId !== docId));
      toast.success('Document detache');
    } catch {
      toast.error('Echec');
    }
  };

  if (loading || !intervention) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            <span className="text-sm font-mono text-text-muted mr-2">{intervention.uid}</span>
            {intervention.title}
          </h1>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[intervention.status])}>
              {INTERVENTION_STATUS_LABELS[intervention.status]}
            </span>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', PRIORITY_COLORS[intervention.priority] ?? '')}>
              {INTERVENTION_PRIORITY_LABELS[intervention.priority]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/intervention/${intervention.id}/report`}>
            <Button variant="secondary" size="sm">
              <FileDown size={14} className="mr-1.5" />
              Rapport
            </Button>
          </Link>
          <Link to={`/intervention/${intervention.id}/report`}>
            <Button variant="primary" size="sm" className="!bg-green-600 hover:!bg-green-700">
              <CheckCircle2 size={14} className="mr-1.5" />
              Generer & Cloturer
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={handleCopyTechLink}>
            <Link2 size={14} className="mr-1.5" />
            Lien technicien
          </Button>
          <Link to={`/intervention/${intervention.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil size={14} className="mr-1.5" />
              Modifier
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1 : Fiche infos + Commentaires internes (50/50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mb-2.5">
        {/* Fiche infos */}
        <div className="rounded-lg border border-border bg-bg-secondary p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <FieldItem label="Type" value={INTERVENTION_TYPE_LABELS[intervention.type]} />
            <FieldItem label="Client" value={intervention.clientName ?? '-'} />
            <FieldItem label="Site" value={intervention.siteName ?? '-'} />
            <FieldItem label="Superviseur" value={intervention.supervisorName ?? '-'} />
            <FieldItem label="Planifie" value={formatDateTime(intervention.scheduledAt)} />
            <FieldItem label="Echeance" value={formatDateTime(intervention.dueAt)} />
            <FieldItem label="Contact" value={intervention.contactName ?? '-'} />
            <FieldItem label="Duree est." value={intervention.estimatedDurationMinutes ? `${intervention.estimatedDurationMinutes} min` : '-'} />
            {intervention.totalPauseSeconds > 0 && (
              <FieldItem label="Temps de pause" value={`${Math.floor(intervention.totalPauseSeconds / 60)} min`} />
            )}
          </div>
          <hr className="border-border" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-text-muted">Technicien assigne</span>
              {admin && intervention.status !== 'closed' && (
                <button
                  onClick={openReassign}
                  className="text-xs text-accent hover:underline"
                >
                  Reassigner
                </button>
              )}
            </div>
            {intervention.assignedTechnicianName ? (
              <p className="text-sm font-medium text-text-primary mt-1">
                {intervention.assignedTechnicianName}
                {intervention.assignedTechnicianPhone && (
                  <span className="text-text-muted font-normal"> ({intervention.assignedTechnicianPhone})</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-text-muted mt-1">Non assigne</p>
            )}
            {reassignOpen && (
              <div className="mt-2 rounded-lg border border-border bg-bg-tertiary p-2 max-h-48 overflow-y-auto">
                {techList.filter((t) => t.id !== intervention.assignedTechnicianId).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleReassign(t.id)}
                    className="w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-bg-secondary rounded transition-colors"
                  >
                    {t.firstName} {t.lastName}
                    {t.phone && <span className="text-text-muted text-xs ml-1">({t.phone})</span>}
                  </button>
                ))}
                {techList.length === 0 && <p className="text-xs text-text-muted px-3 py-2">Chargement...</p>}
              </div>
            )}
          </div>
          <hr className="border-border" />
          <div className="flex items-center justify-between">
            <FieldItem label="Adresse" value={intervention.address ?? '-'} />
            {admin && !intervention.latitude && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/geocoding/intervention/${interventionId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                    const body = await res.json();
                    if (body.success) { toast.success('Geocodage effectue'); await fetchData(); }
                    else toast.error(body.error || 'Echec du geocodage');
                  } catch { toast.error('Echec du geocodage'); }
                }}
                className="text-xs text-accent hover:underline shrink-0"
              >
                <MapPin size={12} className="inline mr-0.5" />Geocoder
              </button>
            )}
          </div>
        </div>

        {/* Commentaires internes */}
        <div className="rounded-lg border border-border border-l-[3px] border-l-amber-500 bg-bg-secondary flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Commentaires internes</span>
            <span className="ml-auto text-[11px] text-text-muted">Non visible dans le rapport</span>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={internalComments}
              onChange={(e) => setInternalComments(e.target.value)}
              rows={8}
              className="w-full bg-transparent text-sm text-text-primary leading-relaxed focus:outline-none resize-y placeholder:text-text-muted"
              placeholder="Note interne..."
            />
          </div>
          <div className="flex justify-end px-4 py-2 border-t border-border">
            <Button variant="primary" size="sm" className="!bg-green-600 hover:!bg-green-700" onClick={handleSaveObservations} loading={savingObs}>
              Enregistrer
            </Button>
          </div>
        </div>
      </div>

      {/* Row 2 : Observations technicien + superviseur (50/50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mb-2.5">
        {/* Observations technicien (lecture seule, editable admin) */}
        <div className="rounded-lg border border-border bg-bg-secondary flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Observations technicien</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted">{admin ? 'modifiable' : 'lecture seule'}</span>
          </div>
          <div className="flex-1 p-4">
            {admin ? (
              <textarea
                value={techObs}
                onChange={(e) => setTechObs(e.target.value)}
                rows={8}
                className="w-full bg-transparent text-sm text-text-primary leading-relaxed focus:outline-none resize-y placeholder:text-text-muted"
                placeholder="Observations du technicien..."
              />
            ) : (
              <p className="text-sm leading-relaxed text-text-secondary">{techObs || 'Aucune observation.'}</p>
            )}
          </div>
          {admin && (
            <div className="flex justify-end px-4 py-2 border-t border-border">
              <Button variant="primary" size="sm" className="!bg-green-600 hover:!bg-green-700" onClick={handleSaveObservations} loading={savingObs}>
                Enregistrer
              </Button>
            </div>
          )}
        </div>

        {/* Observations superviseur (modifiable) */}
        <div className="rounded-lg border border-border bg-bg-secondary flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Observations superviseur</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted">modifiable</span>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={supObs}
              onChange={(e) => setSupObs(e.target.value)}
              rows={8}
              className="w-full bg-transparent text-sm text-text-primary leading-relaxed focus:outline-none resize-y placeholder:text-text-muted"
              placeholder="Saisir vos observations..."
            />
          </div>
          <div className="flex justify-end px-4 py-2 border-t border-border">
            <Button variant="primary" size="sm" className="!bg-green-600 hover:!bg-green-700" onClick={handleSaveObservations} loading={savingObs}>
              Enregistrer
            </Button>
          </div>
        </div>
      </div>

      {/* MiniMap */}
      <InterventionMiniMap
        latitude={intervention.latitude}
        longitude={intervention.longitude}
        timeline={timeline}
      />

      {/* Row 3 : Action buttons */}
      {intervention.status === 'closed' && (
        <div className="mb-8 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-400 flex items-center gap-2">
          <CheckCircle2 size={16} />
          Intervention cloturee — aucune modification possible
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {intervention.status !== 'closed' && (
          <>
            <div className="flex items-center gap-1.5 shrink-0">
              {admin && (
                <input
                  type="datetime-local"
                  value={customCheckInTime}
                  onChange={(e) => setCustomCheckInTime(e.target.value)}
                  className="rounded-lg border border-border bg-bg-tertiary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent w-[170px]"
                  title="Heure custom (admin)"
                />
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleCheckIn}
                loading={actionLoading}
                disabled={intervention.status === 'pending_validation' || intervention.status === 'cancelled'}
                className="whitespace-nowrap"
              >
                <LogIn size={14} className="mr-1.5" />
                Pointage entree
              </Button>
            </div>
            {intervention.status === 'in_progress' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePause}
                loading={actionLoading}
                className="!border-orange-500/30 !text-orange-400 hover:!bg-orange-500/10 whitespace-nowrap"
              >
                <Clock size={14} className="mr-1.5" />
                Pause
              </Button>
            )}
            {intervention.status === 'paused' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResume}
                loading={actionLoading}
                className="!border-accent/30 !text-accent hover:!bg-accent/10 whitespace-nowrap"
              >
                <Clock size={14} className="mr-1.5" />
                Reprendre
              </Button>
            )}
            <div className="flex items-center gap-1.5 shrink-0">
              {admin && (
                <input
                  type="datetime-local"
                  value={customCheckOutTime}
                  onChange={(e) => setCustomCheckOutTime(e.target.value)}
                  className="rounded-lg border border-border bg-bg-tertiary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent w-[170px]"
                  title="Heure custom (admin)"
                />
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCheckOut}
                loading={actionLoading}
                disabled={intervention.status === 'pending_validation' || intervention.status === 'cancelled'}
                className="whitespace-nowrap"
              >
                <LogOut size={14} className="mr-1.5" />
                Pointage sortie
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="!border-red-500/30 !text-red-400 hover:!bg-red-500/10 whitespace-nowrap"
              onClick={handleSignalIssue}
              loading={actionLoading}
              disabled={intervention.status === 'pending_validation' || intervention.status === 'cancelled'}
            >
              <AlertTriangle size={14} className="mr-1.5" />
              Signaler un probleme
            </Button>
            {admin && intervention.status === 'pending_validation' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleClose}
                loading={actionLoading}
                className="!bg-green-600 hover:!bg-green-700 whitespace-nowrap"
              >
                <CheckCircle2 size={14} className="mr-1.5" />
                Valider et cloturer
              </Button>
            )}
            {admin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                loading={actionLoading}
                disabled={intervention.status === 'cancelled'}
                className="whitespace-nowrap"
              >
                <XCircle size={14} className="mr-1.5" />
                Annuler
              </Button>
            )}
          </>
        )}
        {admin && (
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              disabled={actionLoading}
              className="whitespace-nowrap"
            >
              Changer le statut
              <ChevronDown size={14} className="ml-1.5" />
            </Button>
            {statusMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStatusMenuOpen(false)} />
                <div className="fixed z-50 w-44 rounded-lg border border-border bg-bg-secondary shadow-lg" style={{ bottom: 'auto', left: 'auto' }} ref={(el) => {
                  if (!el) return;
                  const btn = el.previousElementSibling?.previousElementSibling as HTMLElement;
                  if (!btn) return;
                  const rect = btn.getBoundingClientRect();
                  el.style.top = `${rect.bottom + 4}px`;
                  el.style.left = `${rect.left}px`;
                }}>
                  {INTERVENTION_STATUS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors first:rounded-t-lg last:rounded-b-lg',
                        s === intervention.status
                          ? 'text-accent font-medium'
                          : 'text-text-primary',
                      )}
                    >
                      {INTERVENTION_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {admin && (intervention.status === 'cancelled' || intervention.status === 'closed') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteIntervention}
            loading={actionLoading}
            className="!text-red-500 hover:!bg-red-500/10 whitespace-nowrap"
          >
            <X size={14} className="mr-1.5" />
            Supprimer
          </Button>
        )}
      </div>

      {/* Steps Checklist */}
      <div className="mb-8">
        <InterventionSteps
          interventionId={interventionId}
          assignedTechnicianId={intervention.assignedTechnicianId}
        />
      </div>

      {/* Signatures */}
      <div className="mb-8">
        <SignaturePanel interventionId={interventionId} />
      </div>

      {/* Parts / Materials */}
      <div className="mb-8">
        <InterventionParts interventionId={interventionId} />
      </div>

      {/* Attached Documents */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Documents</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={openDocPicker}>
            <Plus size={14} className="mr-1" />
            Attacher un document
          </Button>
        </div>
        {attachedDocs.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-4 text-center">
            <p className="text-text-secondary text-sm">Aucun document attache.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachedDocs.map((doc) => (
              <div
                key={doc.documentId}
                className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary p-3"
              >
                <Link
                  to={`/docs/${doc.documentId}`}
                  className="flex items-center gap-2 min-w-0 hover:text-accent transition-colors"
                >
                  <FileText size={14} className="text-accent shrink-0" />
                  <span className="text-sm font-medium text-text-primary truncate">{doc.documentTitle}</span>
                  {doc.categoryName && (
                    <span className="text-xs text-text-secondary">({doc.categoryName})</span>
                  )}
                </Link>
                <button
                  onClick={() => handleDetachDoc(doc.documentId)}
                  className="p-1 rounded text-text-secondary hover:text-red-500 transition-colors shrink-0 ml-2"
                  title="Detacher"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Picker Modal */}
      {docPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Attacher un document</h2>
              <button onClick={() => setDocPickerOpen(false)} className="p-1 rounded text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            {allDocs.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-4">Aucun document disponible.</p>
            ) : (
              <div className="space-y-1">
                {allDocs
                  .filter((d) => !attachedDocs.some((ad) => ad.documentId === d.id))
                  .map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleAttachDoc(doc.id)}
                      className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-bg-tertiary transition-colors"
                    >
                      <FileText size={14} className="text-accent shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm text-text-primary">{doc.title}</span>
                        {doc.categoryName && (
                          <span className="text-xs text-text-secondary ml-2">({doc.categoryName})</span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Gallery */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Photos</h2>
          </div>
          <div>
            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => photoInputRef.current?.click()}
              loading={uploadingPhotos}
            >
              <Upload size={14} className="mr-1.5" />
              Ajouter des photos
            </Button>
          </div>
        </div>
        {photos.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary">Aucune photo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative rounded-lg border border-border bg-bg-secondary overflow-hidden cursor-pointer hover:border-accent transition-colors group"
                onClick={() => setLightboxIndex(photos.indexOf(photo))}
              >
                {admin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                    className="absolute top-1 right-1 z-10 rounded-full bg-black/60 p-1 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Supprimer"
                  >
                    <X size={14} />
                  </button>
                )}
                <img
                  src={`/uploads/photos/${photo.filename}`}
                  alt={photo.originalName}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs text-text-secondary truncate">
                    {photo.originalName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Chronologie</h2>
        </div>

        {timeline.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-6 text-center">
            <p className="text-text-secondary">Aucun evenement dans la chronologie.</p>
          </div>
        ) : (
          <div className="relative ml-4 border-l-2 border-border pl-6 space-y-4">
            {timeline.map((event) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-[33px] top-1 flex items-center justify-center w-6 h-6 rounded-full bg-bg-tertiary border-2 border-border">
                  {TIMELINE_ICONS[event.type] ?? <ArrowRight size={14} />}
                </div>
                <div className="rounded-lg border border-border bg-bg-secondary p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {event.technicianName ?? 'Systeme'}
                      </span>
                      <span className="text-xs text-text-secondary capitalize">
                        {event.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">
                        {formatDateTime(event.createdAt)}
                      </span>
                      {admin && (
                        <button
                          onClick={() => handleDeleteTimelineEvent(event.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Supprimer cet evenement"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {event.message && (
                    <p className="text-sm text-text-secondary">{event.message}</p>
                  )}
                  {event.previousStatus && event.newStatus && (
                    <p className="text-xs text-text-secondary mt-1">
                      {INTERVENTION_STATUS_LABELS[event.previousStatus]} {'\u2192'}{' '}
                      {INTERVENTION_STATUS_LABELS[event.newStatus]}
                    </p>
                  )}
                  {event.latitude != null && event.longitude != null && (
                    <p className="text-xs text-text-secondary mt-1">
                      <MapPin size={12} className="inline mr-1" />
                      {Number(event.latitude).toFixed(5)}, {Number(event.longitude).toFixed(5)}
                      {event.accuracy != null && ` (\u00b1${Math.round(Number(event.accuracy))}m)`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxIndex(null);
            if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
            if (e.key === 'ArrowRight' && lightboxIndex < photos.length - 1) setLightboxIndex(lightboxIndex + 1);
          }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors z-10"
          >
            <X size={24} />
          </button>

          {/* Previous */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors z-10"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Image */}
          <img
            src={`/uploads/photos/${photos[lightboxIndex].filename}`}
            alt={photos[lightboxIndex].originalName}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors z-10"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* Counter */}
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/60 bg-black/50 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );
}

function FieldItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] uppercase tracking-wide text-text-muted">{label}</span>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
