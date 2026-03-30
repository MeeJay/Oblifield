import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Building2,
  MapPin,
  Phone,
  Filter,
} from 'lucide-react';
import type { ClientTreeNode, Client } from '@oblifield/shared';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ClientFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  region: string;
  country: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  parentId: number | null;
}

const emptyForm: ClientFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  postalCode: '',
  region: '',
  country: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  parentId: null,
};

export function ClientManagePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tree, setTree] = useState<ClientTreeNode[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [treeData, clientList, countryList] = await Promise.all([
        clientsApi.tree(),
        clientsApi.list(selectedCountry ? { country: selectedCountry } : undefined),
        clientsApi.getCountries(),
      ]);
      setTree(treeData);
      setAllClients(clientList);
      setCountries(countryList);
    } catch {
      toast.error(t('common.error', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCountry]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAdd = (parentId: number | null = null) => {
    setEditingId(null);
    setForm({ ...emptyForm, parentId });
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      description: client.description ?? '',
      address: client.address ?? '',
      city: client.city ?? '',
      postalCode: client.postalCode ?? '',
      region: client.region ?? '',
      country: client.country ?? '',
      contactName: client.contactName ?? '',
      contactPhone: client.contactPhone ?? '',
      contactEmail: client.contactEmail ?? '',
      parentId: client.parentId,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('common.required', 'Name is required'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        postalCode: form.postalCode.trim() || null,
        region: form.region.trim() || null,
        country: form.country.trim() || null,
        contactName: form.contactName.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        parentId: form.parentId,
      };
      if (editingId) {
        await clientsApi.update(editingId, payload);
        toast.success(t('common.saved', 'Client updated'));
      } else {
        await clientsApi.create(payload);
        toast.success(t('common.saved', 'Client created'));
      }
      setModalOpen(false);
      await fetchData();
    } catch {
      toast.error(t('common.error', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`${t('common.confirm', 'Are you sure?')} "${name}"`)) return;
    try {
      await clientsApi.delete(id);
      toast.success(t('common.deleted', 'Deleted'));
      await fetchData();
    } catch {
      toast.error(t('common.error', 'Failed to delete'));
    }
  };

  // Filter tree by country (client-side for tree view)
  const filterTree = (nodes: ClientTreeNode[]): ClientTreeNode[] => {
    if (!selectedCountry) return nodes;
    return nodes
      .map((node) => {
        const filteredChildren = filterTree(node.children);
        const matchesSelf = node.country === selectedCountry;
        if (matchesSelf || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      })
      .filter(Boolean) as ClientTreeNode[];
  };

  const filteredTree = filterTree(tree);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{t('nav.clients', 'Clients')}</h1>
        <Button variant="primary" size="sm" onClick={() => openAdd()}>
          <Plus size={16} className="mr-1.5" />
          {t('common.add', 'Add')}
        </Button>
      </div>

      {/* Country filter */}
      {countries.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <Filter size={16} className="text-text-muted" />
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">{t('client.allCountries', 'All countries')}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {selectedCountry && (
            <span className="text-xs text-text-secondary">
              {allClients.length} {t('common.results', 'results')}
            </span>
          )}
        </div>
      )}

      {/* Tree */}
      {filteredTree.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-secondary p-8 text-center">
          <Building2 size={32} className="mx-auto mb-3 text-text-secondary" />
          <p className="text-text-secondary">
            {selectedCountry
              ? t('common.noResults', 'No results')
              : t('client.empty', 'No clients yet. Add your first client.')}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredTree.map((node) => (
            <ClientTreeRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggleExpand}
              onNavigate={(id) => navigate(`/client/${id}`)}
              onEdit={(n) => {
                const c = allClients.find((cl) => cl.id === n.id);
                if (c) openEdit(c);
              }}
              onDelete={(n) => handleDelete(n.id, n.name)}
              onAddChild={(parentId) => openAdd(parentId)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingId ? t('common.edit', 'Edit') : t('common.add', 'Add')} {t('nav.clients', 'Client')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={`${t('client.name', 'Name')} *`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-text-secondary">
                  {t('intervention.description', 'Description')}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Address section */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-1.5">
                  <MapPin size={14} />
                  {t('client.address', 'Address')}
                </h3>
                <Input
                  label={t('client.address', 'Address')}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Rue de l'Exemple"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <Input
                    label={t('client.city', 'City')}
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                  <Input
                    label={t('client.postalCode', 'Postal Code')}
                    value={form.postalCode}
                    onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  />
                  <Input
                    label={t('client.region', 'Region')}
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  />
                  <Input
                    label={t('client.country', 'Country')}
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="FR"
                  />
                </div>
              </div>

              {/* Contact section */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-1.5">
                  <Phone size={14} />
                  {t('client.contact', 'Contact')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label={t('client.contactName', 'Name')}
                    value={form.contactName}
                    onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  />
                  <Input
                    label={t('technician.phone', 'Phone')}
                    value={form.contactPhone}
                    onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  />
                  <Input
                    label="Email"
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" loading={saving}>
                  {editingId ? t('common.save', 'Save') : t('common.add', 'Create')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientTreeRow({
  node,
  depth,
  expanded,
  onToggle,
  onNavigate,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: ClientTreeNode;
  depth: number;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  onNavigate: (id: number) => void;
  onEdit: (node: ClientTreeNode) => void;
  onDelete: (node: ClientTreeNode) => void;
  onAddChild: (parentId: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);

  const locationParts = [node.city, node.country].filter(Boolean);
  const locationStr = locationParts.join(', ');

  return (
    <>
      <div
        className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary p-3 hover:bg-bg-tertiary transition-colors group"
        style={{ marginLeft: depth * 24 }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => onToggle(node.id)}
          className={cn(
            'w-5 h-5 flex items-center justify-center text-text-secondary',
            !hasChildren && 'invisible',
          )}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Name - clickable */}
        <button onClick={() => onNavigate(node.id)} className="flex-1 text-left min-w-0">
          <span className="text-sm font-medium text-text-primary">{node.name}</span>
          {locationStr && (
            <span className="ml-2 text-xs text-text-secondary">
              <MapPin size={10} className="inline mr-0.5" />
              {locationStr}
            </span>
          )}
          {node.country && (
            <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted uppercase">
              {node.country}
            </span>
          )}
        </button>

        {/* Intervention count */}
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {node.interventionCount} intervention{node.interventionCount !== 1 ? 's' : ''}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddChild(node.id)}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent"
            title="Add site"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onEdit(node)}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(node)}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <ClientTreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onNavigate={onNavigate}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
    </>
  );
}
