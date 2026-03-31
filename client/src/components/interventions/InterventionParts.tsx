import { useEffect, useState, type FormEvent } from 'react';
import { Package, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { InterventionPart } from '@oblifield/shared';
import { interventionsApi } from '@/api/interventions.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import toast from 'react-hot-toast';

interface Props {
  interventionId: number;
}

export function InterventionParts({ interventionId }: Props) {
  const [parts, setParts] = useState<InterventionPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchParts = async () => {
    try {
      const data = await interventionsApi.getParts(interventionId);
      setParts(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParts(); }, [interventionId]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setReference('');
    setQuantity('1');
    setUnit('');
    setUnitPrice('');
    setNotes('');
  };

  const openAdd = () => { resetForm(); setFormOpen(true); };

  const openEdit = (p: InterventionPart) => {
    setEditingId(p.id);
    setName(p.name);
    setReference(p.reference ?? '');
    setQuantity(p.quantity.toString());
    setUnit(p.unit ?? '');
    setUnitPrice(p.unitPrice?.toString() ?? '');
    setNotes(p.notes ?? '');
    setFormOpen(true);
  };

  const handleDelete = async (p: InterventionPart) => {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    try {
      await interventionsApi.deletePart(interventionId, p.id);
      await fetchParts();
    } catch { toast.error('Echec'); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Nom requis'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        reference: reference.trim() || undefined,
        quantity: quantity ? Number(quantity) : 1,
        unit: unit.trim() || undefined,
        unitPrice: unitPrice ? Number(unitPrice) : undefined,
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await interventionsApi.updatePart(interventionId, editingId, payload);
      } else {
        await interventionsApi.addPart(interventionId, payload);
      }
      setFormOpen(false);
      resetForm();
      await fetchParts();
    } catch { toast.error('Echec'); }
    finally { setSaving(false); }
  };

  const totalCost = parts.reduce((sum, p) => sum + (p.quantity * (p.unitPrice ?? 0)), 0);

  return (
    <div className="rounded-lg border border-border bg-bg-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Pieces et materiaux</h2>
          {parts.length > 0 && (
            <span className="text-xs text-text-secondary">({parts.length})</span>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          <Plus size={12} />
          Ajouter
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-text-secondary text-center py-4">Chargement...</p>
      ) : parts.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-4">Aucune piece ajoutee.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-secondary border-b border-border">
                  <th className="text-left py-1.5 pr-2">Designation</th>
                  <th className="text-left py-1.5 pr-2">Ref.</th>
                  <th className="text-right py-1.5 pr-2">Qte</th>
                  <th className="text-left py-1.5 pr-2">Unite</th>
                  <th className="text-right py-1.5 pr-2">P.U.</th>
                  <th className="text-right py-1.5 pr-2">Total</th>
                  <th className="py-1.5 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-1.5 pr-2 text-text-primary">{p.name}</td>
                    <td className="py-1.5 pr-2 text-text-secondary">{p.reference ?? '-'}</td>
                    <td className="py-1.5 pr-2 text-right text-text-primary">{p.quantity}</td>
                    <td className="py-1.5 pr-2 text-text-secondary">{p.unit ?? '-'}</td>
                    <td className="py-1.5 pr-2 text-right text-text-secondary">
                      {p.unitPrice != null ? `${p.unitPrice.toFixed(2)} €` : '-'}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-text-primary">
                      {p.unitPrice != null ? `${(p.quantity * p.unitPrice).toFixed(2)} €` : '-'}
                    </td>
                    <td className="py-1.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => openEdit(p)} className="p-1 rounded text-text-secondary hover:text-accent">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(p)} className="p-1 rounded text-text-secondary hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalCost > 0 && (
            <div className="mt-2 text-right text-sm font-medium text-text-primary">
              Total : {totalCost.toFixed(2)} €
            </div>
          )}
        </>
      )}

      {/* Add/Edit form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">
                {editingId ? 'Modifier la piece' : 'Ajouter une piece'}
              </h3>
              <button onClick={() => { setFormOpen(false); resetForm(); }} className="p-1 text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input label="Designation *" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="Quantite" type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                <Input label="Unite" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="piece, m, kg..." />
                <Input label="Prix unit." type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
              </div>
              <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  {editingId ? 'Enregistrer' : 'Ajouter'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setFormOpen(false); resetForm(); }}>
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
