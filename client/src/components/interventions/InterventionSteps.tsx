import { useEffect, useState, useCallback } from 'react';
import { ListChecks, CheckCircle2, Circle, Shield, Wrench, RefreshCw } from 'lucide-react';
import type { InterventionStep, StepTemplate } from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { stepTemplatesApi } from '@/api/stepTemplates.api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface Props {
  interventionId: number;
  assignedTechnicianId: number | null;
  stepTemplateId: number | null;
}

function formatTs(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InterventionSteps({ interventionId, assignedTechnicianId, stepTemplateId }: Props) {
  const { isAdmin } = useAuthStore();
  const admin = isAdmin();

  const [steps, setSteps] = useState<InterventionStep[]>([]);
  const [templates, setTemplates] = useState<StepTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const fetchSteps = useCallback(async () => {
    try {
      const data = await interventionsApi.getSteps(interventionId);
      setSteps(data);
    } catch {
      // silently fail
    }
  }, [interventionId]);

  useEffect(() => {
    const load = async () => {
      try {
        const [stepsData, tplData] = await Promise.all([
          interventionsApi.getSteps(interventionId),
          admin ? stepTemplatesApi.list() : Promise.resolve([]),
        ]);
        setSteps(stepsData);
        setTemplates(tplData);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [interventionId, admin]);

  const applyTemplate = async () => {
    if (!selectedTemplateId) return;
    if (steps.length > 0 && !confirm('Les etapes existantes seront remplacees. Continuer ?')) return;
    setApplying(true);
    try {
      const data = await interventionsApi.instantiateSteps(interventionId, Number(selectedTemplateId));
      setSteps(data);
      toast.success('Etapes appliquees');
      setSelectedTemplateId('');
    } catch {
      toast.error('Echec de l\'application du template');
    } finally {
      setApplying(false);
    }
  };

  const toggleTechnician = async (step: InterventionStep) => {
    if (!assignedTechnicianId) {
      toast.error('Aucun technicien assigne');
      return;
    }
    try {
      if (step.technicianValidatedAt) {
        await interventionsApi.unvalidateStepTechnician(interventionId, step.id);
      } else {
        await interventionsApi.validateStepTechnician(interventionId, step.id, assignedTechnicianId);
      }
      await fetchSteps();
    } catch {
      toast.error('Echec de la validation');
    }
  };

  const toggleSupervisor = async (step: InterventionStep) => {
    try {
      if (step.supervisorValidatedAt) {
        await interventionsApi.unvalidateStepSupervisor(interventionId, step.id);
      } else {
        await interventionsApi.validateStepSupervisor(interventionId, step.id);
      }
      await fetchSteps();
    } catch {
      toast.error('Echec de la validation');
    }
  };

  const techCount = steps.filter((s) => s.technicianValidatedAt).length;
  const supCount = steps.filter((s) => s.supervisorValidatedAt).length;
  const total = steps.length;

  const selectClass =
    'rounded-md border border-border bg-bg-tertiary px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent';

  return (
    <div className="rounded-lg border border-border bg-bg-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Etapes</h2>
        </div>

        {admin && (
          <div className="flex items-center gap-2">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className={selectClass}
            >
              <option value="">Appliquer un template...</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.items.length} etapes)
                </option>
              ))}
            </select>
            {selectedTemplateId && (
              <button
                onClick={applyTemplate}
                disabled={applying}
                className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={applying ? 'animate-spin' : ''} />
                Appliquer
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-4 text-text-secondary text-sm">Chargement...</div>
      ) : steps.length === 0 ? (
        <div className="text-center py-6 text-text-secondary text-sm">
          Aucune etape definie.
          {admin && ' Selectionnez un template pour ajouter des etapes.'}
        </div>
      ) : (
        <>
          {/* Progress bars */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Wrench size={12} className="text-accent" />
                <span className="text-xs text-text-secondary">
                  Technicien : {techCount}/{total}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${total > 0 ? (techCount / total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Shield size={12} className="text-blue-500" />
                <span className="text-xs text-text-secondary">
                  Superviseur : {supCount}/{total}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${total > 0 ? (supCount / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Steps list */}
          <div className="space-y-1">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-3 rounded-md border border-border bg-bg-primary p-3"
              >
                {/* Step number + label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-secondary w-5 shrink-0">
                      {step.sortOrder + 1}.
                    </span>
                    <span className={cn(
                      'text-sm font-medium',
                      step.technicianValidatedAt && step.supervisorValidatedAt
                        ? 'text-text-secondary line-through'
                        : 'text-text-primary',
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {step.description && (
                    <p className="text-xs text-text-secondary mt-0.5 ml-7">{step.description}</p>
                  )}
                </div>

                {/* Technician validation */}
                <div className="shrink-0 text-center">
                  <button
                    onClick={() => toggleTechnician(step)}
                    className={cn(
                      'p-1 rounded transition-colors',
                      step.technicianValidatedAt
                        ? 'text-accent hover:text-accent/70'
                        : 'text-gray-500 hover:text-accent',
                    )}
                    title={
                      step.technicianValidatedAt
                        ? `Valide par ${step.technicianValidatedByName} le ${formatTs(step.technicianValidatedAt)}`
                        : 'Validation technicien'
                    }
                  >
                    {step.technicianValidatedAt ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                  <div className="text-[10px] text-text-secondary">
                    <Wrench size={10} className="inline" />
                  </div>
                  {step.technicianValidatedAt && (
                    <div className="text-[9px] text-text-secondary mt-0.5">
                      {formatTs(step.technicianValidatedAt)}
                    </div>
                  )}
                </div>

                {/* Supervisor validation */}
                <div className="shrink-0 text-center">
                  <button
                    onClick={() => toggleSupervisor(step)}
                    disabled={!admin}
                    className={cn(
                      'p-1 rounded transition-colors',
                      step.supervisorValidatedAt
                        ? 'text-blue-500 hover:text-blue-400'
                        : admin
                          ? 'text-gray-500 hover:text-blue-500'
                          : 'text-gray-600 cursor-not-allowed',
                    )}
                    title={
                      step.supervisorValidatedAt
                        ? `Valide par ${step.supervisorValidatedByName} le ${formatTs(step.supervisorValidatedAt)}`
                        : 'Validation superviseur'
                    }
                  >
                    {step.supervisorValidatedAt ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                  <div className="text-[10px] text-text-secondary">
                    <Shield size={10} className="inline" />
                  </div>
                  {step.supervisorValidatedAt && (
                    <div className="text-[9px] text-text-secondary mt-0.5">
                      {formatTs(step.supervisorValidatedAt)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
