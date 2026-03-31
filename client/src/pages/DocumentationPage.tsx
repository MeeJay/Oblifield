import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FolderOpen,
  FolderPlus,
  FileText,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react';
import type { DocCategoryTreeNode, DocDocument } from '@oblifield/shared';
import { docCategoriesApi } from '@/api/docCategories.api';
import { documentsApi } from '@/api/documents.api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

export function DocumentationPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const admin = isAdmin();

  const [tree, setTree] = useState<DocCategoryTreeNode[]>([]);
  const [documents, setDocuments] = useState<DocDocument[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catParentId, setCatParentId] = useState<string>('');
  const [savingCat, setSavingCat] = useState(false);

  const fetchTree = async () => {
    try {
      const data = await docCategoriesApi.tree();
      setTree(data);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocs = async (catId?: number | null, searchQuery?: string) => {
    try {
      const filters: any = {};
      if (catId) filters.categoryId = catId;
      if (searchQuery) filters.search = searchQuery;
      const data = await documentsApi.list(filters);
      setDocuments(data);
    } catch {
      toast.error('Erreur de chargement des documents');
    }
  };

  useEffect(() => {
    fetchTree();
    fetchDocs();
  }, []);

  const handleSelectCategory = (id: number | null) => {
    setSelectedCatId(id);
    setSearch('');
    fetchDocs(id);
  };

  const handleSearch = () => {
    if (search.trim()) {
      setSelectedCatId(null);
      fetchDocs(null, search.trim());
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Category CRUD
  const openAddCategory = (parentId?: number) => {
    setEditingCatId(null);
    setCatName('');
    setCatDescription('');
    setCatParentId(parentId?.toString() ?? '');
    setCatModalOpen(true);
  };

  const openEditCategory = async (cat: DocCategoryTreeNode) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatDescription(cat.description ?? '');
    setCatParentId(cat.parentId?.toString() ?? '');
    setCatModalOpen(true);
  };

  const handleDeleteCategory = async (cat: DocCategoryTreeNode) => {
    if (!confirm(`Supprimer "${cat.name}" et tout son contenu ?`)) return;
    try {
      await docCategoriesApi.delete(cat.id);
      toast.success('Categorie supprimee');
      await fetchTree();
      if (selectedCatId === cat.id) {
        setSelectedCatId(null);
        fetchDocs();
      }
    } catch {
      toast.error('Echec de la suppression');
    }
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) { toast.error('Nom requis'); return; }
    setSavingCat(true);
    try {
      const payload = {
        name: catName.trim(),
        description: catDescription.trim() || null,
        parentId: catParentId ? Number(catParentId) : null,
      };
      if (editingCatId) {
        await docCategoriesApi.update(editingCatId, payload);
        toast.success('Categorie modifiee');
      } else {
        await docCategoriesApi.create(payload);
        toast.success('Categorie creee');
      }
      setCatModalOpen(false);
      await fetchTree();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Echec');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteDoc = async (doc: DocDocument) => {
    if (!confirm(`Supprimer "${doc.title}" ?`)) return;
    try {
      await documentsApi.delete(doc.id);
      toast.success('Document supprime');
      fetchDocs(selectedCatId);
    } catch {
      toast.error('Echec');
    }
  };

  // Flatten categories for parent selector
  const flatCats: { id: number; name: string; depth: number }[] = [];
  const flattenTree = (nodes: DocCategoryTreeNode[], depth: number) => {
    for (const node of nodes) {
      flatCats.push({ id: node.id, name: node.name, depth });
      flattenTree(node.children, depth + 1);
    }
  };
  flattenTree(tree, 0);

  const selectClass =
    'w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left panel: Category tree */}
      <div className="w-72 shrink-0 border-r border-border bg-bg-secondary overflow-y-auto">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BookOpen size={16} className="text-accent" />
              <span className="text-sm font-semibold text-text-primary">Documentation</span>
            </div>
            {admin && (
              <button
                onClick={() => openAddCategory()}
                className="p-1 rounded text-text-secondary hover:text-accent transition-colors"
                title="Nouvelle categorie"
              >
                <FolderPlus size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => handleSelectCategory(null)}
            className={cn(
              'w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors',
              selectedCatId === null && !search
                ? 'bg-accent/10 text-accent'
                : 'text-text-secondary hover:bg-bg-hover',
            )}
          >
            Tous les documents
          </button>
        </div>

        <div className="p-2">
          {tree.length === 0 ? (
            <p className="text-xs text-text-secondary px-2 py-4 text-center">
              Aucune categorie.
            </p>
          ) : (
            tree.map((node) => (
              <CategoryNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedCatId}
                expandedIds={expandedIds}
                onSelect={handleSelectCategory}
                onToggle={toggleExpand}
                onAdd={admin ? openAddCategory : undefined}
                onEdit={admin ? openEditCategory : undefined}
                onDelete={admin ? handleDeleteCategory : undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel: Documents */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">
            {selectedCatId
              ? flatCats.find((c) => c.id === selectedCatId)?.name ?? 'Documents'
              : search
                ? `Recherche : "${search}"`
                : 'Tous les documents'}
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rechercher..."
                className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent w-48"
              />
              <button onClick={handleSearch} className="p-1.5 rounded text-text-secondary hover:text-accent">
                <Search size={14} />
              </button>
            </div>
            {admin && selectedCatId && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/docs/new?categoryId=${selectedCatId}`)}
              >
                <Plus size={14} className="mr-1" />
                Nouveau document
              </Button>
            )}
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-secondary p-8 text-center">
            <FileText size={32} className="mx-auto mb-3 text-text-secondary" />
            <p className="text-text-secondary">Aucun document.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/docs/${doc.id}`)}
                className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary p-4 hover:bg-bg-tertiary transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-accent shrink-0" />
                    <span className="text-sm font-medium text-text-primary truncate">{doc.title}</span>
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5 ml-6">
                    {doc.categoryName && <span>{doc.categoryName} &bull; </span>}
                    Modifie le {new Date(doc.updatedAt).toLocaleDateString()}
                    {doc.updatedByName && ` par ${doc.updatedByName}`}
                  </div>
                </div>
                {admin && (
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/docs/${doc.id}/edit`); }}
                      className="p-1.5 rounded text-text-secondary hover:text-accent transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc); }}
                      className="p-1.5 rounded text-text-secondary hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-bg-primary p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingCatId ? 'Modifier la categorie' : 'Nouvelle categorie'}
            </h2>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <Input label="Nom *" value={catName} onChange={(e) => setCatName(e.target.value)} required />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-text-secondary">Description</label>
                <textarea
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  rows={2}
                  className={selectClass + ' resize-y'}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-text-secondary">Categorie parente</label>
                <select value={catParentId} onChange={(e) => setCatParentId(e.target.value)} className={selectClass}>
                  <option value="">-- Racine --</option>
                  {flatCats
                    .filter((c) => c.id !== editingCatId && c.depth < 2)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {'  '.repeat(c.depth)}{c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" loading={savingCat}>
                  {editingCatId ? 'Enregistrer' : 'Creer'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCatModalOpen(false)}>
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

// Recursive tree node component
function CategoryNode({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
}: {
  node: DocCategoryTreeNode;
  depth: number;
  selectedId: number | null;
  expandedIds: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onAdd?: (parentId: number) => void;
  onEdit?: (cat: DocCategoryTreeNode) => void;
  onDelete?: (cat: DocCategoryTreeNode) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer',
          isSelected ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          className="shrink-0 w-4"
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-3" />
          )}
        </button>
        <FolderOpen size={14} className="shrink-0" />
        <span className="flex-1 truncate" onClick={() => onSelect(node.id)}>
          {node.name}
        </span>
        <span className="text-[10px] text-text-muted">{node.documentCount}</span>
        <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
          {onAdd && depth < 2 && (
            <button onClick={(e) => { e.stopPropagation(); onAdd(node.id); }} className="p-0.5 rounded hover:text-accent">
              <FolderPlus size={10} />
            </button>
          )}
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="p-0.5 rounded hover:text-accent">
              <Pencil size={10} />
            </button>
          )}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} className="p-0.5 rounded hover:text-red-500">
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <CategoryNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggle={onToggle}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}
