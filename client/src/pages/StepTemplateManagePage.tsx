import { useEffect, useState, type FormEvent } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ListChecks,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import type { StepTemplate } from '@oblifield/shared';
import { stepTemplatesApi } from '@/api/stepTemplates.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';

interface ItemDraft {
  label: string;
  description: string;
}

export function StepTemplateManagePage() {
  const [templates, setTemplates] = useState<StepTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([{ label: '', description: '' }]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const data = await stepTemplatesApi.list();
      setTemplates(data);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setItems([{ label: '', description: '' }]);
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (tpl: StepTemplate) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setDescription(tpl.description ?? '');
    setItems(
      tpl.items.length > 0
        ? tpl.items.map((i) => ({ label: i.label, description: i.description ?? '' }))
        : [{ label: '', description: '' }],
    );
    setModalOpen(true);
  };

  const handleDelete = async (tpl: StepTemplate) => {
    if (!confirm(`Supprimer le template "${tpl.name}" ?`)) return;
    try {
      await stepTemplatesApi.delete(tpl.id);
      toast.success('Template supprime');
      await fetchData();
    } catch {
      toast.error('Echec de la suppression');
    }
  };

  const addItem = () => setItems((prev) => [...prev, { label: '', description: '' }]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    setItems((prev) => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  const updateItem = (index: number, field: keyof ItemDraft, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.label.trim());
    if (!name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    if (validItems.length === 0) {
      toast.error('Au moins une etape est requise');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        items: validItems.map((it) => ({
          label: it.label.trim(),
          description: it.description.trim() || null,
        })),
      };

      if (editingId) {
        await stepTemplatesApi.update(editingId, payload);
        toast.success('Template modifie');
      } else {
        await stepTemplatesApi.create(payload);
        toast.success('Template cree');
      }
      setModalOpen(false);
      resetForm();
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Templates d'etapes</h1>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={16} className="mr-1.5" />
          Nouveau template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-secondary p-8 text-center">
          <ListChecks size={32} className="mx-auto mb-3 text-text-secondary" />
          <p className="text-text-secondary">Aucun template. Creez-en un pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-lg border border-border bg-bg-secondary p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">{tpl.name}</h3>
                  {tpl.description && (
                    <p className="text-xs text-text-secondary mt-0.5">{tpl.description}</p>
                  )}
                  <p className="text-xs text-text-secondary mt-1">
                    {tpl.items.length} etape{tpl.items.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tpl.items.map((item, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-bg-tertiary px-2.5 py-0.5 text-xs text-text-secondary"
                      >
                        {i + 1}. {item.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <button
                    onClick={() => openEdit(tpl)}
                    className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors"
                    title="Modifier"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl)}
                    className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingId ? 'Modifier le template' : 'Nouveau template'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Nom *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-text-secondary">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={selectClass + ' resize-y'}
                  placeholder="Description optionnelle..."
                />
              </div>

              {/* Steps list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-text-secondary">Etapes</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    <Plus size={12} />
                    Ajouter une etape
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-bg-secondary p-3">
                      <span className="text-xs text-text-secondary font-medium pt-2 w-5 shrink-0">
                        {i + 1}.
                      </span>
                      <div className="flex-1 space-y-2">
                        <input
                          value={item.label}
                          onChange={(e) => updateItem(i, 'label', e.target.value)}
                          placeholder="Libelle de l'etape *"
                          className="w-full rounded-md border border-border bg-bg-tertiary px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(i, 'description', e.target.value)}
                          placeholder="Description (optionnelle)"
                          className="w-full rounded-md border border-border bg-bg-tertiary px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveItem(i, -1)}
                          disabled={i === 0}
                          className="p-1 rounded text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(i, 1)}
                          disabled={i === items.length - 1}
                          className="p-1 rounded text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          disabled={items.length <= 1}
                          className="p-1 rounded text-text-secondary hover:text-red-500 disabled:opacity-30 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" loading={saving}>
                  {editingId ? 'Enregistrer' : 'Creer'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setModalOpen(false); resetForm(); }}
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
