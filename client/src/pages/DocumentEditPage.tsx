import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Save, X, ArrowLeft } from 'lucide-react';
import type { DocCategory, DocDocument } from '@oblifield/shared';
import { documentsApi } from '@/api/documents.api';
import { docCategoriesApi } from '@/api/docCategories.api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { TipTapEditor } from '@/components/docs/TipTapEditor';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export function DocumentEditPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const admin = isAdmin();

  const isNew = !id;
  const isEditMode = isNew || window.location.pathname.endsWith('/edit');

  const [doc, setDoc] = useState<DocDocument | null>(null);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await docCategoriesApi.list();
        setCategories(cats);

        if (id) {
          const d = await documentsApi.getById(Number(id));
          setDoc(d);
          setTitle(d.title);
          setContent(d.content);
          setCategoryId(d.categoryId.toString());
        } else {
          const catFromQuery = searchParams.get('categoryId');
          if (catFromQuery) setCategoryId(catFromQuery);
        }
      } catch {
        toast.error('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Titre requis'); return; }
    if (!categoryId) { toast.error('Categorie requise'); return; }

    setSaving(true);
    try {
      if (id) {
        await documentsApi.update(Number(id), {
          title: title.trim(),
          content,
          categoryId: Number(categoryId),
        });
        toast.success('Document enregistre');
        navigate(`/docs/${id}`);
      } else {
        const created = await documentsApi.create({
          title: title.trim(),
          content,
          categoryId: Number(categoryId),
        });
        toast.success('Document cree');
        navigate(`/docs/${created.id}`);
      }
    } catch {
      toast.error('Erreur de sauvegarde');
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

  // Read-only view
  if (!isEditMode && doc) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/docs')}
            className="p-1.5 rounded text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-text-primary">{doc.title}</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {doc.categoryName} &bull; Modifie le {new Date(doc.updatedAt).toLocaleDateString()}
              {doc.updatedByName && ` par ${doc.updatedByName}`}
            </p>
          </div>
          {admin && (
            <Button variant="secondary" size="sm" onClick={() => navigate(`/docs/${doc.id}/edit`)}>
              Modifier
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-border bg-bg-secondary p-6">
          <TipTapEditor content={doc.content} onChange={() => {}} editable={false} />
        </div>
      </div>
    );
  }

  // Edit / Create form
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(id ? `/docs/${id}` : '/docs')}
          className="p-1.5 rounded text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-text-primary">
          {isNew ? 'Nouveau document' : 'Modifier le document'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Titre *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">Categorie *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={selectClass}
              required
            >
              <option value="">-- Choisir --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Contenu</label>
          <TipTapEditor content={content} onChange={setContent} />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button type="submit" variant="primary" loading={saving}>
            <Save size={16} className="mr-1.5" />
            {isNew ? 'Creer' : 'Enregistrer'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(id ? `/docs/${id}` : '/docs')}
          >
            <X size={16} className="mr-1.5" />
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
