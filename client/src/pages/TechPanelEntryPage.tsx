import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { techPanelApi } from '@/api/techPanel.api';
import toast, { Toaster } from 'react-hot-toast';

export function TechPanelEntryPage() {
  const navigate = useNavigate();
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tech-panel/logo')
      .then((r) => { if (r.ok) setLogoUrl('/api/tech-panel/logo'); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid.trim()) return;

    setLoading(true);
    try {
      const result = await techPanelApi.lookup(uid.trim());
      sessionStorage.setItem('tech-panel-sig', result.sig);
      sessionStorage.setItem('tech-panel-ts', String(result.ts));
      const prefix = (window as any).__TECH_PANEL__ ? '' : '/tech';
      navigate(`${prefix}/${uid.trim().toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Intervention introuvable');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#0f1117] flex flex-col items-center justify-center p-4 sm:p-6">
      <Toaster
        position="top-center"
        toastOptions={{
          className: '!bg-[#1a1d2e] !text-gray-100 !border !border-gray-700',
          duration: 4000,
        }}
      />

      <div className="w-full max-w-sm sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6 sm:mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-28 sm:h-40 max-w-[280px] sm:max-w-[400px] object-contain" />
          ) : (
            <h1 className="text-xl sm:text-2xl font-bold text-white">TechPanel</h1>
          )}
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-700/50 bg-[#1a1d2e] p-5 sm:p-6 shadow-2xl">
          <h2 className="text-base sm:text-lg font-semibold text-gray-100 mb-1">Portail Technicien</h2>
          <p className="text-xs sm:text-sm text-gray-400 mb-5 sm:mb-6">
            Saisissez l'identifiant de votre intervention.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                ID Intervention
              </label>
              <input
                type="text"
                value={uid}
                onChange={(e) => setUid(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="EX: K7WN4HBR"
                maxLength={8}
                autoFocus
                className="w-full rounded-lg border border-gray-600 bg-[#0f1117] px-4 py-3 text-lg font-mono text-gray-100 tracking-widest text-center placeholder:text-gray-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || uid.length < 8}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Recherche...' : 'Acceder a l\'intervention'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Powered by <a href="https://field.obli.tools" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">Oblifield</a>
        </p>
      </div>
    </div>
  );
}
