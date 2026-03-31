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
} from 'lucide-react';
import type { ClientTreeNode, Site } from '@oblifield/shared';
import { clientsApi } from '@/api/clients.api';
import { sitesApi } from '@/api/sites.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ClientFormData {
  name: string;
  description: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  parentId: number | null;
}

const emptyClientForm: ClientFormData = {
  name: '',
  description: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  parentId: null,
};

interface SiteFormData {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  region: string;
  country: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  clientId: number | null;
}

const emptySiteForm: SiteFormData = {
  name: '',
  address: '',
  city: '',
  postalCode: '',
  region: '',
  country: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  clientId: null,
};

export function ClientManagePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tree, setTree] = useState<ClientTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Client modal state
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState<ClientFormData>(emptyClientForm);
  const [savingClient, setSavingClient] = useState(false);

  // Site modal state
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormData>(emptySiteForm);
  const [savingSite, setSavingSite] = useState(false);

  // Sites panel state
  const [selectedClientSites, setSelectedClientSites] = useState<Site[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [sitesLoading, setSitesLoading] = useState(false);

  const fetchData = async () => {
    try {
      const treeData = await clientsApi.tree();
      setTree(treeData);
    } catch {
      toast.error(t('common.error', 'Echec du chargement des donnees'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadSitesForClient = async (clientId: number) => {
    setSitesLoading(true);
    try {
      const sites = await sitesApi.list({ clientId });
      setSelectedClientSites(sites);
      setSelectedClientId(clientId);
    } catch {
      toast.error(t('common.error', 'Echec du chargement des sites'));
    } finally {
      setSitesLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Client CRUD
  const openAddClient = (parentId: number | null = null) => {
    setEditingClientId(null);
    setClientForm({ ...emptyClientForm, parentId });
    setClientModalOpen(true);
  };

  const openEditClient = (client: ClientTreeNode) => {
    setEditingClientId(client.id);
    setClientForm({
      name: client.name,
      description: client.description ?? '',
      contactName: client.contactName ?? '',
      contactPhone: client.contactPhone ?? '',
      contactEmail: client.contactEmail ?? '',
      parentId: client.parentId,
    });
    setClientModalOpen(true);
  };

  const handleClientSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) {
      toast.error(t('common.required', 'Le nom est requis'));
      return;
    }
    setSavingClient(true);
    try {
      const payload = {
        name: clientForm.name.trim(),
        description: clientForm.description.trim() || null,
        contactName: clientForm.contactName.trim() || null,
        contactPhone: clientForm.contactPhone.trim() || null,
        contactEmail: clientForm.contactEmail.trim() || null,
        parentId: clientForm.parentId,
      };
      if (editingClientId) {
        await clientsApi.update(editingClientId, payload);
        toast.success(t('common.saved', 'Client mis a jour'));
      } else {
        await clientsApi.create(payload);
        toast.success(t('common.saved', 'Client cree'));
      }
      setClientModalOpen(false);
      await fetchData();
    } catch {
      toast.error(t('common.error', 'Echec de l\'enregistrement'));
    } finally {
      setSavingClient(false);
    }
  };

  const handleDeleteClient = async (id: number, name: string) => {
    if (!confirm(`${t('common.confirm', 'Etes-vous sur ?')} "${name}"`)) return;
    try {
      await clientsApi.delete(id);
      toast.success(t('common.deleted', 'Supprime'));
      if (selectedClientId === id) {
        setSelectedClientId(null);
        setSelectedClientSites([]);
      }
      await fetchData();
    } catch {
      toast.error(t('common.error', 'Echec de la suppression'));
    }
  };

  // Site CRUD
  const openAddSite = (clientId: number) => {
    setEditingSiteId(null);
    setSiteForm({ ...emptySiteForm, clientId });
    setSiteModalOpen(true);
  };

  const openEditSite = (site: Site) => {
    setEditingSiteId(site.id);
    setSiteForm({
      name: site.name,
      address: site.address ?? '',
      city: site.city ?? '',
      postalCode: site.postalCode ?? '',
      region: site.region ?? '',
      country: site.country ?? '',
      contactName: site.contactName ?? '',
      contactPhone: site.contactPhone ?? '',
      contactEmail: site.contactEmail ?? '',
      clientId: site.clientId,
    });
    setSiteModalOpen(true);
  };

  const handleSiteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!siteForm.name.trim() || !siteForm.clientId) {
      toast.error(t('common.required', 'Le nom et le client sont requis'));
      return;
    }
    setSavingSite(true);
    try {
      const payload = {
        clientId: siteForm.clientId,
        name: siteForm.name.trim(),
        address: siteForm.address.trim() || null,
        city: siteForm.city.trim() || null,
        postalCode: siteForm.postalCode.trim() || null,
        region: siteForm.region.trim() || null,
        country: siteForm.country.trim() || null,
        contactName: siteForm.contactName.trim() || null,
        contactPhone: siteForm.contactPhone.trim() || null,
        contactEmail: siteForm.contactEmail.trim() || null,
      };
      if (editingSiteId) {
        await sitesApi.update(editingSiteId, payload);
        toast.success(t('common.saved', 'Site mis a jour'));
      } else {
        await sitesApi.create(payload);
        toast.success(t('common.saved', 'Site cree'));
      }
      setSiteModalOpen(false);
      if (siteForm.clientId) {
        await loadSitesForClient(siteForm.clientId);
      }
      await fetchData();
    } catch {
      toast.error(t('common.error', 'Echec de l\'enregistrement'));
    } finally {
      setSavingSite(false);
    }
  };

  const handleDeleteSite = async (site: Site) => {
    if (!confirm(`${t('common.confirm', 'Etes-vous sur ?')} "${site.name}"`)) return;
    try {
      await sitesApi.delete(site.id);
      toast.success(t('common.deleted', 'Supprime'));
      if (selectedClientId) {
        await loadSitesForClient(selectedClientId);
      }
      await fetchData();
    } catch {
      toast.error(t('common.error', 'Echec de la suppression'));
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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{t('nav.clients', 'Clients')}</h1>
        <Button variant="primary" size="sm" onClick={() => openAddClient()}>
          <Plus size={16} className="mr-1.5" />
          {t('common.add', 'Ajouter')}
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Tree */}
        <div className="flex-1 min-w-0">
          {tree.length === 0 ? (
            <div className="rounded-lg border border-border bg-bg-secondary p-8 text-center">
              <Building2 size={32} className="mx-auto mb-3 text-text-secondary" />
              <p className="text-text-secondary">
                {t('client.empty', 'Aucun client. Ajoutez votre premier client.')}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {tree.map((node) => (
                <ClientTreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  selectedClientId={selectedClientId}
                  onToggle={toggleExpand}
                  onNavigate={(id) => navigate(`/client/${id}`)}
                  onEdit={openEditClient}
                  onDelete={(n) => handleDeleteClient(n.id, n.name)}
                  onAddChild={(parentId) => openAddClient(parentId)}
                  onAddSite={(clientId) => openAddSite(clientId)}
                  onShowSites={(clientId) => loadSitesForClient(clientId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sites panel */}
        {selectedClientId && (
          <div className="w-80 shrink-0">
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <MapPin size={14} />
                  {t('site.sites', 'Sites')}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => openAddSite(selectedClientId)}>
                  <Plus size={14} />
                </Button>
              </div>
              {sitesLoading ? (
                <LoadingSpinner size="sm" />
              ) : selectedClientSites.length === 0 ? (
                <p className="text-xs text-text-secondary">{t('site.empty', 'Aucun site')}</p>
              ) : (
                <div className="space-y-2">
                  {selectedClientSites.map((site) => (
                    <div
                      key={site.id}
                      className="rounded border border-border bg-bg-primary p-2 text-xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-text-primary">{site.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditSite(site)}
                            className="p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteSite(site)}
                            className="p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-red-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {(site.city || site.country) && (
                        <p className="text-text-secondary mt-0.5">
                          {[site.city, site.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {site.address && (
                        <p className="text-text-muted mt-0.5">{site.address}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Client Modal */}
      {clientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingClientId ? t('common.edit', 'Modifier') : t('common.add', 'Ajouter')} {t('nav.clients', 'Client')}
            </h2>
            <form onSubmit={handleClientSubmit} className="space-y-4">
              <Input
                label={`${t('client.name', 'Nom')} *`}
                value={clientForm.name}
                onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-text-secondary">
                  {t('intervention.description', 'Description')/* same in French */}
                </label>
                <textarea
                  value={clientForm.description}
                  onChange={(e) => setClientForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Contact section */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-1.5">
                  <Phone size={14} />
                  {t('client.contact', 'Contact')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label={t('client.contactName', 'Nom')}
                    value={clientForm.contactName}
                    onChange={(e) => setClientForm((f) => ({ ...f, contactName: e.target.value }))}
                  />
                  <Input
                    label={t('technician.phone', 'Telephone')}
                    value={clientForm.contactPhone}
                    onChange={(e) => setClientForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  />
                  <Input
                    label="Email"
                    value={clientForm.contactEmail}
                    onChange={(e) => setClientForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" loading={savingClient}>
                  {editingClientId ? t('common.save', 'Enregistrer') : t('common.add', 'Creer')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setClientModalOpen(false)}>
                  {t('common.cancel', 'Annuler')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Site Modal */}
      {siteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingSiteId ? t('common.edit', 'Modifier') : t('common.add', 'Ajouter')} {t('site.site', 'Site')}
            </h2>
            <form onSubmit={handleSiteSubmit} className="space-y-4">
              <Input
                label={`${t('client.name', 'Nom')} *`}
                value={siteForm.name}
                onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
                required
              />

              {/* Address section */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-1.5">
                  <MapPin size={14} />
                  {t('client.address', 'Adresse')}
                </h3>
                <Input
                  label={t('client.address', 'Adresse')}
                  value={siteForm.address}
                  onChange={(e) => setSiteForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Rue de l'Exemple"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <Input
                    label={t('client.city', 'Ville')}
                    value={siteForm.city}
                    onChange={(e) => setSiteForm((f) => ({ ...f, city: e.target.value }))}
                  />
                  <Input
                    label={t('client.postalCode', 'Code postal')}
                    value={siteForm.postalCode}
                    onChange={(e) => setSiteForm((f) => ({ ...f, postalCode: e.target.value }))}
                  />
                  <Input
                    label={t('client.region', 'Region')/* same in French */}
                    value={siteForm.region}
                    onChange={(e) => setSiteForm((f) => ({ ...f, region: e.target.value }))}
                  />
                  <Input
                    label={t('client.country', 'Pays')}
                    value={siteForm.country}
                    onChange={(e) => setSiteForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="FR"
                  />
                </div>
              </div>

              {/* Contact section */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-1.5">
                  <Phone size={14} />
                  {t('client.contact', 'Contact')/* same in French */}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label={t('client.contactName', 'Nom')}
                    value={siteForm.contactName}
                    onChange={(e) => setSiteForm((f) => ({ ...f, contactName: e.target.value }))}
                  />
                  <Input
                    label={t('technician.phone', 'Telephone')}
                    value={siteForm.contactPhone}
                    onChange={(e) => setSiteForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  />
                  <Input
                    label="Email"
                    value={siteForm.contactEmail}
                    onChange={(e) => setSiteForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" loading={savingSite}>
                  {editingSiteId ? t('common.save', 'Enregistrer') : t('common.add', 'Creer')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSiteModalOpen(false)}>
                  {t('common.cancel', 'Annuler')}
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
  selectedClientId,
  onToggle,
  onNavigate,
  onEdit,
  onDelete,
  onAddChild,
  onAddSite,
  onShowSites,
}: {
  node: ClientTreeNode;
  depth: number;
  expanded: Set<number>;
  selectedClientId: number | null;
  onToggle: (id: number) => void;
  onNavigate: (id: number) => void;
  onEdit: (node: ClientTreeNode) => void;
  onDelete: (node: ClientTreeNode) => void;
  onAddChild: (parentId: number) => void;
  onAddSite: (clientId: number) => void;
  onShowSites: (clientId: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedClientId === node.id;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-bg-secondary p-3 hover:bg-bg-tertiary transition-colors group',
          isSelected && 'ring-1 ring-accent',
        )}
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
        </button>

        {/* Site count badge */}
        <button
          onClick={() => onShowSites(node.id)}
          className="text-xs text-text-secondary whitespace-nowrap hover:text-accent flex items-center gap-1"
          title="Afficher les sites"
        >
          <MapPin size={10} />
          {node.siteCount} site{node.siteCount !== 1 ? 's' : ''}
        </button>

        {/* Intervention count */}
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {node.interventionCount} intervention{node.interventionCount !== 1 ? 's' : ''}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddSite(node.id)}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent"
            title="Ajouter un site"
          >
            <MapPin size={14} />
          </button>
          <button
            onClick={() => onAddChild(node.id)}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent"
            title="Ajouter un sous-client"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onEdit(node)}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent"
            title="Modifier"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(node)}
            className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-red-500"
            title="Supprimer"
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
            selectedClientId={selectedClientId}
            onToggle={onToggle}
            onNavigate={onNavigate}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onAddSite={onAddSite}
            onShowSites={onShowSites}
          />
        ))}
    </>
  );
}
