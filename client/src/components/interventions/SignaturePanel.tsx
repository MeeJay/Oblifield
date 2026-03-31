import { useState, useEffect, useRef, useCallback } from 'react';
import { PenTool, Trash2, X } from 'lucide-react';
import type { InterventionSignature } from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';

import toast from 'react-hot-toast';

interface Props {
  interventionId: number;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Signature Pad (canvas-based) ───────────────────────────────────────────

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const getPoint = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPoint.current = getPoint(e);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing.current || !lastPoint.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const point = getPoint(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPoint.current = point;
  };

  const stopDraw = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  // Initialize canvas with white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full cursor-crosshair rounded border border-gray-600 bg-white touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="flex gap-2">
        <button
          onClick={handleClear}
          className="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-300 transition hover:border-gray-400"
        >
          Effacer
        </button>
        <button
          onClick={handleSave}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-black transition hover:bg-accent/80"
        >
          Enregistrer
        </button>
        <button
          onClick={onCancel}
          className="ml-auto flex items-center gap-1 rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-300 transition hover:border-red-500 hover:text-red-400"
        >
          <X className="h-3.5 w-3.5" />
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Signature Section ──────────────────────────────────────────────────────

interface SignatureSectionProps {
  title: string;
  type: 'technician' | 'supervisor' | 'client';
  signature: InterventionSignature | undefined;
  interventionId: number;
  onRefresh: () => void;
}

function SignatureSection({
  title,
  type,
  signature,
  interventionId,
  onRefresh,
}: SignatureSectionProps) {
  const [showPad, setShowPad] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (dataUrl: string) => {
    if (!signerName.trim()) {
      toast.error('Veuillez saisir un nom');
      return;
    }
    setSaving(true);
    try {
      await interventionsApi.saveSignature(interventionId, {
        type,
        signatureData: dataUrl,
        signerName: signerName.trim(),
      });
      toast.success('Signature enregistrée');
      setShowPad(false);
      setSignerName('');
      onRefresh();
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!signature) return;
    setDeleting(true);
    try {
      await interventionsApi.deleteSignature(interventionId, signature.id);
      toast.success('Signature supprimée');
      onRefresh();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-700 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
        <PenTool className="h-4 w-4 text-accent" />
        {title}
      </h3>

      {signature ? (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <img
              src={signature.signatureData}
              alt={`Signature de ${signature.signerName}`}
              className="h-20 rounded border border-gray-600 bg-white"
            />
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium text-gray-200">{signature.signerName}</span>
              <span className="text-xs text-gray-400">
                {formatDate(signature.signedAt)}
              </span>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto flex items-center gap-1 rounded-md border border-gray-600 px-2 py-1 text-xs text-red-400 transition hover:border-red-500 hover:bg-red-900/20 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Supprimer
            </button>
          </div>
        </div>
      ) : showPad ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Nom du signataire</label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Nom complet"
              className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-500"
            />
          </div>
          <SignaturePad
            onSave={handleSave}
            onCancel={() => {
              setShowPad(false);
              setSignerName('');
            }}
          />
          {saving && (
            <p className="text-xs text-gray-400">Enregistrement en cours...</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowPad(true)}
          className="flex items-center gap-2 rounded-md border border-dashed border-gray-600 px-4 py-2.5 text-sm text-gray-400 transition hover:border-accent hover:text-accent"
        >
          <PenTool className="h-4 w-4" />
          Signer
        </button>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function SignaturePanel({ interventionId }: Props) {
  const [signatures, setSignatures] = useState<InterventionSignature[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignatures = useCallback(async () => {
    try {
      const data = await interventionsApi.getSignatures(interventionId);
      setSignatures(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [interventionId]);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  const techSignature = signatures.find((s) => s.type === 'technician');
  const supervisorSignature = signatures.find((s) => s.type === 'supervisor');
  const clientSignature = signatures.find((s) => s.type === 'client');

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">
        Chargement des signatures...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <PenTool className="h-5 w-5 text-accent" />
        Signatures
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <SignatureSection
          title="Signature technicien"
          type="technician"
          signature={techSignature}
          interventionId={interventionId}
          onRefresh={fetchSignatures}
        />
        <SignatureSection
          title="Signature client"
          type="client"
          signature={clientSignature}
          interventionId={interventionId}
          onRefresh={fetchSignatures}
        />
        <SignatureSection
          title="Signature superviseur"
          type="supervisor"
          signature={supervisorSignature}
          interventionId={interventionId}
          onRefresh={fetchSignatures}
        />
      </div>
    </div>
  );
}
