import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { techPanelApi, type TechPanelDetails } from '@/api/techPanel.api';
import type { InterventionStep, InterventionSignature } from '@oblifield/shared';
import toast, { Toaster } from 'react-hot-toast';
import {
  MapPin, Phone, Clock, Camera, ImagePlus, CheckCircle2, AlertTriangle,
  LogIn, LogOut, FileText, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';

// ─── Signature Pad (self-contained) ─────────────────────────────────────────
function SignaturePad({ onSave, onCancel }: { onSave: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing || !lastPos.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setHasStrokes(true);
  }

  function stopDraw() {
    setDrawing(false);
    lastPos.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasStrokes(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1117] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-300">Signez dans la zone ci-dessous</span>
        <button onClick={onCancel} className="text-gray-400 hover:text-white text-sm">Annuler</button>
      </div>
      {/* Canvas zone */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
      </div>
      {/* Bottom buttons */}
      <div className="flex gap-3 px-4 py-3 border-t border-gray-700">
        <button onClick={clear} className="flex-1 rounded-lg border border-gray-600 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
          Effacer
        </button>
        <button
          disabled={!hasStrokes}
          onClick={() => onSave(canvasRef.current!.toDataURL('image/png'))}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Valider la signature
        </button>
      </div>
    </div>
  );
}

// ─── Signature Section ──────────────────────────────────────────────────────
function SignatureSection({
  title, type, uid, existing, onSaved, technicianName,
}: {
  title: string;
  type: 'technician' | 'client';
  uid: string;
  existing: InterventionSignature | null;
  onSaved: () => void;
  technicianName?: string;
}) {
  const [showPad, setShowPad] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  if (existing) {
    return (
      <div className="rounded-lg border border-gray-700/50 bg-[#1a1d2e] p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">{title}</h4>
        <img src={existing.signatureData} alt="Signature" className="h-16 bg-[#0f1117] rounded p-2 mb-1" />
        <p className="text-xs text-gray-400">{existing.signerName} — {new Date(existing.signedAt).toLocaleString('fr-FR')}</p>
      </div>
    );
  }

  const isTechnician = type === 'technician';
  const signerName = isTechnician ? (technicianName || 'Technicien') : name.trim();

  async function handleSave(dataUrl: string) {
    if (!signerName) { toast.error('Veuillez saisir le nom du client'); return; }
    setSaving(true);
    try {
      await techPanelApi.saveSignature(uid, { type, signatureData: dataUrl, signerName });
      toast.success('Signature enregistree');
      setShowPad(false);
      setShowNameInput(false);
      onSaved();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-lg border border-gray-700/50 bg-[#1a1d2e] p-4">
      <h4 className="text-sm font-medium text-gray-300 mb-3">{title}</h4>
      {showPad ? (
        <SignaturePad onCancel={() => setShowPad(false)} onSave={handleSave} />
      ) : !isTechnician && !showNameInput ? (
        <button onClick={() => setShowNameInput(true)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors w-full sm:w-auto">
          Signer
        </button>
      ) : !isTechnician && showNameInput ? (
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du client"
            autoFocus
            className="w-full rounded-lg border border-gray-600 bg-[#0f1117] px-3 py-2 text-base text-gray-100 placeholder:text-gray-500 focus:border-blue-500 outline-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowNameInput(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
              Annuler
            </button>
            <button
              disabled={!name.trim()}
              onClick={() => setShowPad(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Ouvrir la zone de signature
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowPad(true)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors w-full sm:w-auto">
          Signer
        </button>
      )}
      {saving && <p className="text-xs text-gray-400 mt-2">Enregistrement...</p>}
    </div>
  );
}

// ─── Collapsible Section (stable reference — must be outside component) ─────
function Section({ id, title, icon, children, expanded, onToggle }: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode;
  expanded: boolean; onToggle: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-[#1a1d2e] overflow-hidden">
      <button onClick={() => onToggle(id)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/30 transition-colors">
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold text-gray-200">{title}</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {expanded && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

// ─── Main TechPanel Page ────────────────────────────────────────────────────
export function TechPanelPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<TechPanelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState('');
  const obsInitializedRef = useRef(false);
  const [obsSaving, setObsSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    checkin: true, steps: true, observations: true, photos: true, signatures: true, checkout: true,
  });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchDetails = useCallback(async () => {
    if (!uid) return;
    try {
      const d = await techPanelApi.getDetails(uid);
      if (!obsInitializedRef.current) {
        setObservations(d.intervention.technicianObservations || '');
        obsInitializedRef.current = true;
      }
      setData(d);
    } catch (err: any) {
      toast.error(err.message || 'Erreur de chargement');
      navigate((window as any).__TECH_PANEL__ ? '/' : '/tech');
    } finally {
      setLoading(false);
    }
  }, [uid, navigate]);

  useEffect(() => {
    // Accept sig+ts from URL query params (direct link) or sessionStorage
    const urlSig = searchParams.get('sig');
    const urlTs = searchParams.get('ts');
    if (urlSig && urlTs) {
      sessionStorage.setItem('tech-panel-sig', urlSig);
      sessionStorage.setItem('tech-panel-ts', urlTs);
    }
    if (!sessionStorage.getItem('tech-panel-sig')) {
      navigate((window as any).__TECH_PANEL__ ? '/' : '/tech');
      return;
    }
    fetchDetails();
  }, [fetchDetails, searchParams, navigate]);

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const intervention = data?.intervention;
  const isDone = intervention?.status === 'pending_validation' || intervention?.status === 'closed' || intervention?.status === 'cancelled';
  const hasCheckedIn = data?.timeline.some((e) => e.type === 'check_in');
  const hasCheckedOut = data?.timeline.some((e) => e.type === 'check_out');
  const checkInEvent = data?.timeline.find((e) => e.type === 'check_in');
  const checkOutEvent = data?.timeline.find((e) => e.type === 'check_out');

  // ── GPS helper ──
  async function getGps(): Promise<{ latitude: number; longitude: number; accuracy: number } | undefined> {
    if (!navigator.geolocation) return undefined;
    setGpsLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
    } catch { return undefined; }
    finally { setGpsLoading(false); }
  }

  // ── Check-in ──
  async function handleCheckIn() {
    if (!uid) return;
    const gps = await getGps();
    try {
      await techPanelApi.checkIn(uid, gps);
      toast.success('Check-in effectue');
      fetchDetails();
    } catch (err: any) { toast.error(err.message); }
  }

  // ── Check-out ──
  async function handleCheckOut(status: 'pending_validation' | 'issue') {
    if (!uid) return;
    const gps = await getGps();
    try {
      await techPanelApi.checkOut(uid, gps, status);
      toast.success(status === 'pending_validation' ? 'Intervention terminee' : 'Probleme signale');
      fetchDetails();
    } catch (err: any) { toast.error(err.message); }
  }

  // ── Observations ──
  async function saveObservations() {
    if (!uid) return;
    setObsSaving(true);
    try {
      await techPanelApi.saveObservations(uid, observations);
      toast.success('Observations enregistrees', { id: 'obs-save' });
    } catch (err: any) { toast.error(err.message); }
    finally { setObsSaving(false); }
  }

  // ── Photo upload ──
  async function handlePhotoUpload(files: FileList | null) {
    if (!files || !uid) return;
    setPhotoUploading(true);
    let count = 0;
    for (const file of Array.from(files)) {
      try {
        await techPanelApi.uploadPhoto(uid, file);
        count++;
      } catch { /* skip */ }
    }
    if (count > 0) toast.success(`${count} photo(s) ajoutee(s)`);
    setPhotoUploading(false);
    fetchDetails();
  }

  // ── Step toggle ──
  async function handleStepToggle(step: InterventionStep) {
    if (!uid) return;
    try {
      if (step.technicianValidatedAt) {
        await techPanelApi.unvalidateStep(uid, step.id);
      } else {
        await techPanelApi.validateStep(uid, step.id);
      }
      fetchDetails();
    } catch (err: any) { toast.error(err.message); }
  }

  // ── Status badge ──
  function statusBadge(s: string) {
    const colors: Record<string, string> = {
      pending: 'bg-gray-600', assigned: 'bg-blue-600', in_progress: 'bg-yellow-600',
      paused: 'bg-orange-600', pending_validation: 'bg-purple-600', closed: 'bg-green-600',
      issue: 'bg-red-600', cancelled: 'bg-gray-500',
    };
    const labels: Record<string, string> = {
      pending: 'En attente', assigned: 'Assign\u00e9e', in_progress: 'En cours',
      paused: 'En pause', pending_validation: 'En validation', closed: 'Cl\u00f4tur\u00e9e',
      issue: 'Probl\u00e8me', cancelled: 'Annul\u00e9e',
    };
    return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium text-white ${colors[s] || 'bg-gray-600'}`}>{labels[s] || s}</span>;
  }

  // ── Loading / error ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!data || !intervention) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <p className="text-gray-400">Intervention introuvable</p>
      </div>
    );
  }

  const validatedSteps = data.steps.filter((s) => s.technicianValidatedAt).length;
  const totalSteps = data.steps.length;
  const allStepsValidated = totalSteps === 0 || validatedSteps === totalSteps;
  const techSig = data.signatures.find((s) => s.type === 'technician') || null;
  const clientSig = data.signatures.find((s) => s.type === 'client') || null;

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Toaster position="top-center" toastOptions={{ className: '!bg-[#1a1d2e] !text-gray-100 !border !border-gray-700', duration: 3000 }} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-2">
          <img src="/api/tech-panel/logo" alt="" className="h-20 max-w-[280px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          {statusBadge(intervention.status)}
        </div>

        {data.supportPhone && (
          <a
            href={`tel:${data.supportPhone}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors mb-4"
          >
            <Phone size={16} /> Appeler Support
          </a>
        )}

        {/* ── Resume ── */}
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1d2e] p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-lg font-bold text-gray-100">{intervention.title}</h1>
            <span className="text-xs font-mono text-gray-500 shrink-0">{intervention.uid}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {intervention.clientName && (
              <div><span className="text-gray-500">Client</span><p className="text-gray-200">{intervention.clientName}</p></div>
            )}
            {intervention.siteName && (
              <div><span className="text-gray-500">Site</span><p className="text-gray-200">{intervention.siteName}</p></div>
            )}
            {intervention.address && (
              <div className="sm:col-span-2">
                <span className="text-gray-500">Adresse</span>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(intervention.address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                  <MapPin size={14} /> {intervention.address}
                </a>
              </div>
            )}
            {intervention.contactName && (
              <div>
                <span className="text-gray-500">Contact</span>
                <p className="text-gray-200">{intervention.contactName}</p>
              </div>
            )}
            {intervention.contactPhone && (
              <div>
                <span className="text-gray-500">Telephone</span>
                <a href={`tel:${intervention.contactPhone}`} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                  <Phone size={14} /> {intervention.contactPhone}
                </a>
              </div>
            )}
            {intervention.scheduledAt && (
              <div>
                <span className="text-gray-500">Planifie le</span>
                <p className="flex items-center gap-1.5 text-gray-200">
                  <Clock size={14} className="text-gray-400" />
                  {new Date(intervention.scheduledAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            {intervention.assignedTechnicianName && (
              <div><span className="text-gray-500">Technicien</span><p className="text-gray-200">{intervention.assignedTechnicianName}</p></div>
            )}
          </div>
        </div>

        {/* ── Ordre de mission (notes internes, read-only) ── */}
        {intervention.description && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
              <FileText size={15} /> Ordre de mission
            </h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{intervention.description}</p>
          </div>
        )}

        {/* ── Documents ── */}
        {data.documents.length > 0 && (
          <div className="rounded-xl border border-gray-700/50 bg-[#1a1d2e] p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <FileText size={15} /> Documents ({data.documents.length})
            </h3>
            <div className="space-y-2">
              {data.documents.map((doc) => (
                <a
                  key={doc.documentId}
                  href={`/api/tech-panel/${uid}/documents/${doc.documentId}?sig=${sessionStorage.getItem('tech-panel-sig') || ''}&ts=${sessionStorage.getItem('tech-panel-ts') || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#0f1117] px-3 py-2.5 text-sm text-blue-400 hover:text-blue-300 hover:border-blue-500/50 transition-colors"
                >
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">{doc.documentTitle}</span>
                  {doc.categoryName && <span className="text-xs text-gray-500 shrink-0">({doc.categoryName})</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Check-In ── */}
        <Section id="checkin" title="Check-In" icon={<LogIn size={16} className="text-green-400" />} expanded={expandedSections.checkin ?? true} onToggle={toggleSection}>
          {hasCheckedIn ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={18} />
              <span className="text-sm">
                Check-in effectue le {checkInEvent ? new Date(checkInEvent.createdAt).toLocaleString('fr-FR') : ''}
              </span>
            </div>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={isDone || gpsLoading}
              className="w-full sm:w-auto rounded-lg bg-green-600 px-6 py-3 text-base font-medium text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {gpsLoading ? 'Localisation GPS...' : 'Check-In'}
            </button>
          )}
        </Section>

        {/* ── Steps ── */}
        {totalSteps > 0 && (
          <Section id="steps" title={`Etapes (${validatedSteps}/${totalSteps})`} icon={<CheckCircle2 size={16} className="text-blue-400" />} expanded={expandedSections.steps ?? true} onToggle={toggleSection}>
            {/* Progress bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${totalSteps > 0 ? (validatedSteps / totalSteps) * 100 : 0}%` }} />
            </div>
            <div className="space-y-2">
              {data.steps.map((step) => (
                <label key={step.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={!!step.technicianValidatedAt}
                    onChange={() => handleStepToggle(step)}
                    disabled={isDone}
                    className="mt-0.5 h-5 w-5 rounded border-gray-500 bg-[#0f1117] text-blue-500 focus:ring-blue-500 shrink-0"
                  />
                  <div>
                    <span className={`text-sm ${step.technicianValidatedAt ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
                      {step.label}
                    </span>
                    {step.description && <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          </Section>
        )}

        {/* ── Observations ── */}
        <Section id="observations" title="Observations" icon={<FileText size={16} className="text-yellow-400" />} expanded={expandedSections.observations ?? true} onToggle={toggleSection}>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            disabled={isDone}
            rows={8}
            placeholder="Decrivez vos observations sur le terrain..."
            className="w-full rounded-lg border border-gray-600 bg-[#0f1117] px-4 py-3 text-base text-gray-100 placeholder:text-gray-500 focus:border-blue-500 outline-none resize-y"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => saveObservations()}
              disabled={isDone || obsSaving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {obsSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </Section>

        {/* ── Photos ── */}
        <Section id="photos" title={`Photos (${data.photos.length})`} icon={<Camera size={16} className="text-purple-400" />} expanded={expandedSections.photos ?? true} onToggle={toggleSection}>
          {/* Hidden inputs */}
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} />

          {/* Photo grid */}
          {data.photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
              {data.photos.map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-700/50 overflow-hidden bg-[#0f1117]">
                  <img src={techPanelApi.getPhotoUrl(uid!, p.filename)} alt={p.originalName} className="w-full h-24 object-cover" />
                  <p className="text-[10px] text-gray-500 p-1 truncate">{p.originalName}</p>
                </div>
              ))}
            </div>
          )}

          {!isDone && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={photoUploading}
                className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40 transition-colors w-full sm:w-auto"
              >
                <Camera size={16} /> Prendre une photo
              </button>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-600 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-40 transition-colors w-full sm:w-auto"
              >
                <ImagePlus size={16} /> Galerie
              </button>
              {photoUploading && <Loader2 size={20} className="text-purple-400 animate-spin self-center" />}
            </div>
          )}
        </Section>

        {/* ── Signatures ── */}
        <Section id="signatures" title="Signatures" icon={<FileText size={16} className="text-orange-400" />} expanded={expandedSections.signatures ?? true} onToggle={toggleSection}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SignatureSection title="Signature technicien" type="technician" uid={uid!} existing={techSig} onSaved={fetchDetails} technicianName={intervention.assignedTechnicianName || undefined} />
            <SignatureSection title="Signature client" type="client" uid={uid!} existing={clientSig} onSaved={fetchDetails} />
          </div>
        </Section>

        {/* ── Check-Out ── */}
        <Section id="checkout" title="Check-Out" icon={<LogOut size={16} className="text-red-400" />} expanded={expandedSections.checkout ?? true} onToggle={toggleSection}>
          {hasCheckedOut ? (
            <div className="flex items-center gap-2 text-blue-400">
              <CheckCircle2 size={18} />
              <span className="text-sm">
                Check-out effectue le {checkOutEvent ? new Date(checkOutEvent.createdAt).toLocaleString('fr-FR') : ''}
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleCheckOut('pending_validation')}
                disabled={isDone || gpsLoading || !allStepsValidated}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors w-full sm:w-auto"
              >
                <CheckCircle2 size={18} /> Terminer l'intervention
              </button>
              {!allStepsValidated && (
                <p className="text-xs text-orange-400">Toutes les etapes doivent etre validees avant de pouvoir terminer.</p>
              )}
              <button
                onClick={() => handleCheckOut('issue')}
                disabled={isDone || gpsLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-base font-medium text-white hover:bg-orange-700 disabled:opacity-40 transition-colors w-full sm:w-auto"
              >
                <AlertTriangle size={18} /> Signaler un probleme
              </button>
            </div>
          )}
        </Section>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 pb-4">
          Powered by <a href="https://field.obli.tools" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">Oblifield</a>
        </p>
      </div>
    </div>
  );
}
