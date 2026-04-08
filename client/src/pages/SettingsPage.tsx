import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Shield, Server, Plus, Pencil, Trash2, Wifi, Eye, EyeOff, ArrowLeftRight, Info, Cpu, HardDrive, Database, Clock, Upload, X, Image } from 'lucide-react';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useAuthStore } from '@/store/authStore';
import { smtpServerApi, type CreateSmtpServerRequest } from '@/api/smtpServer.api';
import { appConfigApi } from '@/api/appConfig.api';
import { emailTemplateApi } from '@/api/emailTemplate.api';
import { systemApi, type SystemInfo } from '@/api/system.api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import type { SmtpServer, AppConfig, ObligateConfig, EmailTemplate } from '@oblifield/shared';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="font-mono text-xs text-text-primary">{value}</span>
    </div>
  );
}

type SmtpFormMode = 'create' | 'edit' | null;

interface SmtpForm {
  name: string;
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  authType: 'basic' | 'oauth365';
  oauthClientId: string;
  oauthClientSecret: string;
  oauthTenantId: string;
  oauthRefreshToken: string;
}

const emptySmtpForm = (): SmtpForm => ({
  name: '',
  host: '',
  port: '587',
  secure: false,
  username: '',
  password: '',
  fromAddress: '',
  authType: 'basic',
  oauthClientId: '',
  oauthClientSecret: '',
  oauthTenantId: '',
  oauthRefreshToken: '',

});

const SLUG_LABELS: Record<string, string> = {
  intervention_assigned: 'Assignation',
  intervention_checkin: 'Confirmation pointage',
  intervention_closed: 'Cl\u00f4ture',
};

const LANG_LABELS: Record<string, string> = {
  fr: 'Fran\u00e7ais',
  en: 'English',
};

export function SettingsPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuthStore();
  const admin = isAdmin();

  // ── SMTP Servers ──
  const [servers, setServers] = useState<SmtpServer[]>([]);
  const [smtpMode, setSmtpMode] = useState<SmtpFormMode>(null);
  const [editingServer, setEditingServer] = useState<SmtpServer | null>(null);
  const [smtpForm, setSmtpForm] = useState<SmtpForm>(emptySmtpForm());
  const [showPassword, setShowPassword] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  // ── Email Templates ──
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplSaving, setTplSaving] = useState(false);
  const [tplPreview, setTplPreview] = useState<string | null>(null);
  const [emailSmtpServerId, setEmailSmtpServerId] = useState('');

  // ── App Config (2FA + company name) ──
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [techPanelUrl, setTechPanelUrl] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [companySaving, setCompanySaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── PDF Report Colors ──
  const PDF_COLOR_FIELDS = [
    { key: 'pdf_color_primary', label: 'Couleur principale (titres, logo texte)', defaultVal: '#2D3561' },
    { key: 'pdf_color_accent_line', label: 'Ligne d\'accent (filets rouges)', defaultVal: '#C62828' },
    { key: 'pdf_color_section_bg', label: 'Fond des sections', defaultVal: '#3B4578' },
    { key: 'pdf_color_section_text', label: 'Texte des sections', defaultVal: '#FFFFFF' },
    { key: 'pdf_color_label', label: 'Labels (champs)', defaultVal: '#555555' },
    { key: 'pdf_color_value', label: 'Valeurs (donnees)', defaultVal: '#1A1A1A' },
    { key: 'pdf_color_footer', label: 'Pied de page', defaultVal: '#AAAAAA' },
    { key: 'pdf_color_border', label: 'Bordures / separateurs', defaultVal: '#CCCCCC' },
  ] as const;
  const [pdfColors, setPdfColors] = useState<Record<string, string>>({});
  const [pdfColorsSaving, setPdfColorsSaving] = useState(false);

  // ── Obligate SSO Integration ──
  const [obligateCfg,     setObligateCfg]     = useState<ObligateConfig | null>(null);
  const [obligateUrl,     setObligateUrl]     = useState('');
  const [obligateApiKey,  setObligateApiKey]  = useState('');
  const [showObligateKey, setShowObligateKey] = useState(false);

  // ── System info (About section) ──
  const [systemInfo, setSystemInfo]           = useState<SystemInfo | null>(null);
  const [systemInfoLoading, setSystemInfoLoading] = useState(false);

  useEffect(() => {
    if (!admin) return;
    setSystemInfoLoading(true);
    systemApi.getInfo().then(setSystemInfo).catch(() => {}).finally(() => setSystemInfoLoading(false));
    smtpServerApi.list().then(setServers).catch(() => {});
    emailTemplateApi.list().then(setEmailTemplates).catch(() => {});
    appConfigApi.getConfig().then((cfg) => {
      setAppConfig(cfg);
      setCompanyName(cfg.company_name || '');
      setTechPanelUrl(cfg.tech_panel_url || '');
      setSupportPhone(cfg.support_phone || '');
      setEmailSmtpServerId(cfg.email_notification_smtp_server_id ? String(cfg.email_notification_smtp_server_id) : '');
      if (cfg.company_logo_path) {
        const logoFilename = cfg.company_logo_path.split('/').pop();
        if (logoFilename) setLogoUrl(`/uploads/logos/${logoFilename}`);
      }
      // Load PDF colors
      const colors: Record<string, string> = {};
      for (const f of PDF_COLOR_FIELDS) {
        const val = (cfg as unknown as Record<string, unknown>)[f.key];
        colors[f.key] = typeof val === 'string' && val ? val : f.defaultVal;
      }
      setPdfColors(colors);
    }).catch(() => {});
    appConfigApi.getObligateConfig().then((cfg) => {
      setObligateCfg(cfg);
      setObligateUrl(cfg.url ?? '');
    }).catch(() => {});
  }, [admin]);

  async function saveObligateConfig() {
    try {
      const trimmedUrl = obligateUrl.trim().replace(/\/$/, '');
      if (trimmedUrl && trimmedUrl === window.location.origin.replace(/\/$/, '')) {
        toast.error(t('settings.obligate.selfUrlError'));
        return;
      }
      const patch: { url?: string | null; apiKey?: string | null; enabled?: boolean } = { url: trimmedUrl || null };
      if (obligateApiKey.trim()) patch.apiKey = obligateApiKey.trim();
      const updated = await appConfigApi.patchObligateConfig(patch);
      setObligateCfg(updated);
      setObligateApiKey('');
      toast.success(t('settings.obligate.saved'));
    } catch {
      toast.error(t('settings.obligate.failedSave'));
    }
  }

  function openCreate() {
    setEditingServer(null);
    setSmtpForm(emptySmtpForm());
    setShowPassword(false);
    setSmtpMode('create');
  }

  function openEdit(server: SmtpServer) {
    setEditingServer(server);
    setSmtpForm({
      name: server.name,
      host: server.host,
      port: String(server.port),
      secure: server.secure,
      username: server.username,
      password: '',
      fromAddress: server.fromAddress,
      authType: server.authType || 'basic',
      oauthClientId: server.oauthClientId || '',
      oauthClientSecret: '',
      oauthTenantId: server.oauthTenantId || '',
      oauthRefreshToken: '',
    });
    setShowPassword(false);
    setSmtpMode('edit');
  }

  function closeSmtpModal() {
    setSmtpMode(null);
    setEditingServer(null);
  }

  async function handleSmtpSubmit(e: FormEvent) {
    e.preventDefault();
    setSmtpSaving(true);
    try {
      const data: CreateSmtpServerRequest = {
        name: smtpForm.name,
        host: smtpForm.authType === 'oauth365' ? 'smtp.office365.com' : smtpForm.host,
        port: smtpForm.authType === 'oauth365' ? 587 : parseInt(smtpForm.port, 10),
        secure: smtpForm.authType === 'oauth365' ? false : smtpForm.secure,
        username: smtpForm.username,
        password: smtpForm.password,
        fromAddress: smtpForm.fromAddress,
        authType: smtpForm.authType,
        oauthClientId: smtpForm.oauthClientId || undefined,
        oauthClientSecret: smtpForm.oauthClientSecret || undefined,
        oauthTenantId: smtpForm.oauthTenantId || undefined,
        oauthRefreshToken: smtpForm.oauthRefreshToken || undefined,
      };
      if (smtpMode === 'create') {
        const created = await smtpServerApi.create(data);
        setServers((prev) => [...prev, created]);
        toast.success(t('settings.smtp.created'));
      } else if (editingServer) {
        const payload = smtpForm.password ? data : { ...data, password: undefined };
        const updated = await smtpServerApi.update(editingServer.id, payload);
        setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success(t('settings.smtp.updated'));
      }
      closeSmtpModal();
    } catch {
      toast.error(t('settings.smtp.failedSave'));
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleDelete(server: SmtpServer) {
    if (!confirm(t('settings.confirmDeleteSmtp', { name: server.name }))) return;
    try {
      await smtpServerApi.delete(server.id);
      setServers((prev) => prev.filter((s) => s.id !== server.id));
      toast.success(t('settings.smtp.deleted'));
    } catch {
      toast.error(t('settings.smtp.failedDelete'));
    }
  }

  async function handleTest(server: SmtpServer) {
    setTestingId(server.id);
    try {
      await smtpServerApi.test(server.id);
      toast.success(t('settings.smtp.testOk', { name: server.name }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('settings.smtp.testFailed');
      toast.error(msg);
    } finally {
      setTestingId(null);
    }
  }

  async function setConfigKey(key: keyof AppConfig, value: boolean | number | null) {
    if (!appConfig) return;
    setConfigSaving(true);
    try {
      await appConfigApi.setConfig(key, value);
      setAppConfig((prev) => prev ? { ...prev, [key]: value } : prev);
    } catch {
      toast.error(t('settings.failedUpdate'));
    } finally {
      setConfigSaving(false);
    }
  }

  function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
  }

  return (
    <div className="p-6 min-w-0 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">{t('settings.title')}</h1>
        <p className="text-sm text-text-muted">
          {t('settings.globalDesc')}
        </p>
      </div>

      {/* ── Company Name ── */}
      {admin && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <HardDrive size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">{t('settings.company', 'Entreprise')}</h2>
          </div>
          <div className="rounded-lg border border-border bg-bg-secondary p-5">
            <p className="text-sm text-text-muted mb-3">
              {t('settings.companyDesc', 'Nom de l\'entreprise affiche sur les rapports PDF et les notifications.')}
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label={t('settings.companyName', 'Nom de l\'entreprise')}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Oblifield"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                loading={companySaving}
                onClick={async () => {
                  setCompanySaving(true);
                  try {
                    await appConfigApi.setConfig('company_name', companyName.trim() || 'Oblifield');
                    toast.success(t('common.saved', 'Enregistre'));
                  } catch {
                    toast.error(t('common.error', 'Erreur'));
                  } finally {
                    setCompanySaving(false);
                  }
                }}
              >
                {t('common.save', 'Enregistrer')}
              </Button>
            </div>

            {/* TechPanel URL */}
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-sm text-text-muted mb-3">
                URL du portail technicien (ex: https://techpanel.binaryhearts.me). Permet de generer les liens directs pour les techniciens.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="URL TechPanel"
                    value={techPanelUrl}
                    onChange={(e) => setTechPanelUrl(e.target.value)}
                    placeholder="https://techpanel.example.com"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={companySaving}
                  onClick={async () => {
                    setCompanySaving(true);
                    try {
                      await appConfigApi.setConfig('tech_panel_url', techPanelUrl.trim().replace(/\/+$/, ''));
                      toast.success('Enregistre');
                    } catch {
                      toast.error('Erreur');
                    } finally {
                      setCompanySaving(false);
                    }
                  }}
                >
                  Enregistrer
                </Button>
              </div>
            </div>

            {/* Support phone */}
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-sm text-text-muted mb-3">
                Numero de telephone du support affiche dans le portail technicien.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="Telephone support"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="+33 1 23 45 67 89"
                    type="tel"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={companySaving}
                  onClick={async () => {
                    setCompanySaving(true);
                    try {
                      await appConfigApi.setConfig('support_phone', supportPhone.trim());
                      toast.success('Enregistre');
                    } catch {
                      toast.error('Erreur');
                    } finally {
                      setCompanySaving(false);
                    }
                  }}
                >
                  Enregistrer
                </Button>
              </div>
            </div>

            {/* Logo upload */}
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <Image size={14} className="text-text-secondary" />
                <label className="text-sm font-medium text-text-secondary">Logo des rapports PDF</label>
              </div>
              <p className="text-xs text-text-muted mb-3">
                Image affichee en haut a gauche des rapports PDF (PNG, JPG ou SVG, max 2 Mo).
              </p>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="relative">
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-12 max-w-[200px] object-contain rounded border border-border bg-white p-1"
                    />
                    <button
                      onClick={async () => {
                        try {
                          await appConfigApi.setConfig('company_logo_path', '');
                          setLogoUrl(null);
                          toast.success('Logo supprime');
                        } catch { toast.error('Erreur'); }
                      }}
                      className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setLogoUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append('logo', file);
                        const res = await fetch('/api/admin/config/logo', {
                          method: 'POST',
                          body: formData,
                          credentials: 'include',
                        });
                        const json = await res.json();
                        if (json.success && json.data?.path) {
                          setLogoUrl(json.data.path);
                          toast.success('Logo mis a jour');
                        } else {
                          toast.error(json.error || 'Erreur');
                        }
                      } catch { toast.error('Echec de l\'upload'); }
                      finally {
                        setLogoUploading(false);
                        if (logoInputRef.current) logoInputRef.current.value = '';
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload size={14} className="mr-1.5" />
                    {logoUrl ? 'Changer le logo' : 'Uploader un logo'}
                  </Button>
                </div>
              </div>
            </div>

            {/* PDF Report Colors */}
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <Pencil size={14} className="text-text-secondary" />
                <label className="text-sm font-medium text-text-secondary">Couleurs des rapports PDF</label>
              </div>
              <p className="text-xs text-text-muted mb-4">
                Personnalisez les couleurs utilisees dans les rapports PDF generes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PDF_COLOR_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={pdfColors[f.key] || f.defaultVal}
                      onChange={(e) => setPdfColors((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-text-primary block truncate">{f.label}</span>
                      <span className="text-[10px] text-text-muted font-mono">{pdfColors[f.key] || f.defaultVal}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  loading={pdfColorsSaving}
                  onClick={async () => {
                    setPdfColorsSaving(true);
                    try {
                      for (const f of PDF_COLOR_FIELDS) {
                        const val = pdfColors[f.key] || f.defaultVal;
                        await appConfigApi.setConfig(f.key, val);
                      }
                      toast.success('Couleurs enregistrees');
                    } catch {
                      toast.error('Erreur');
                    } finally {
                      setPdfColorsSaving(false);
                    }
                  }}
                >
                  Enregistrer les couleurs
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const defaults: Record<string, string> = {};
                    for (const f of PDF_COLOR_FIELDS) defaults[f.key] = f.defaultVal;
                    setPdfColors(defaults);
                  }}
                >
                  Reinitialiser
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── About ── */}
      {admin && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Info size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">A propos</h2>
          </div>
          <div className="rounded-lg border border-border bg-bg-secondary p-5">
            {systemInfoLoading ? (
              <p className="text-sm text-text-muted animate-pulse">Chargement des informations systeme...</p>
            ) : systemInfo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                {/* Versions */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-3">
                    <Server size={12} /> Versions
                  </p>
                  <AboutRow label="Serveur"  value={`v${systemInfo.appVersion}`} />
                  <AboutRow label="Client"   value={`v${__APP_VERSION__}`} />
                  <AboutRow label="Node.js"  value={systemInfo.nodeVersion} />
                </div>
                {/* Instance */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-3">
                    <Clock size={12} /> Instance
                  </p>
                  <AboutRow label="Disponibilite" value={formatUptime(systemInfo.uptimeSeconds)} />
                  <AboutRow label="Environnement" value={systemInfo.environment.isDocker ? 'Docker' : 'Natif'} />
                  <AboutRow label="Plateforme"    value={systemInfo.environment.platform} />
                  <AboutRow label="Coeurs CPU"   value={String(systemInfo.cpu.cores)} />
                </div>
                {/* Memory */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-3">
                    <HardDrive size={12} /> Memoire
                  </p>
                  <AboutRow label="Processus (RSS)" value={`${systemInfo.memory.processRssMb} Mo`} />
                  <AboutRow label="Tas utilise"     value={`${systemInfo.memory.processHeapMb} Mo`} />
                  <AboutRow label="Systeme libre"   value={`${systemInfo.memory.systemFreeMb} / ${systemInfo.memory.systemTotalMb} Mo`} />
                </div>
                {/* CPU load */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-3">
                    <Cpu size={12} /> CPU load avg
                  </p>
                  <AboutRow label="1 min"  value={String(systemInfo.cpu.loadAvg1)} />
                  <AboutRow label="5 min"  value={String(systemInfo.cpu.loadAvg5)} />
                  <AboutRow label="15 min" value={String(systemInfo.cpu.loadAvg15)} />
                </div>
                {/* Database */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-3">
                    <Database size={12} /> Base de donnees
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">PostgreSQL</span>
                    <span className={cn(
                      'flex items-center gap-1.5 text-xs font-medium',
                      systemInfo.environment.dbStatus === 'ok' ? 'text-status-up' : 'text-status-down',
                    )}>
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        systemInfo.environment.dbStatus === 'ok' ? 'bg-status-up' : 'bg-status-down',
                      )} />
                      {systemInfo.environment.dbStatus === 'ok' ? 'Connecte' : 'Erreur'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Impossible de charger les informations systeme.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Default Intervention Settings ── */}
      <SettingsPanel scope="global" scopeId={null} title={t('settings.defaultInterventionSettings', 'Parametres d\'intervention par defaut')} />

      {admin && (
        <>
          {/* ── Intervention Emails ── */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Emails d'intervention</h2>
            <div className="rounded-lg border border-border bg-bg-secondary p-5 space-y-4">
              {/* SMTP server selector for emails */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Serveur SMTP pour les emails</label>
                <div className="flex items-center gap-2">
                  <select
                    value={emailSmtpServerId}
                    onChange={(e) => setEmailSmtpServerId(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="">-- Non configure --</option>
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.authType === 'oauth365' ? 'OAuth 365' : s.host})</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={async () => {
                    try {
                      await appConfigApi.setConfig('email_notification_smtp_server_id', emailSmtpServerId || '');
                      toast.success('Enregistre');
                    } catch { toast.error('Erreur'); }
                  }}>Enregistrer</Button>
                </div>
              </div>

              {/* Templates table */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Templates</label>
                <p className="text-xs text-text-muted mb-3">
                  Variables disponibles : {'{{technicianName}}'}, {'{{interventionTitle}}'}, {'{{interventionUid}}'}, {'{{clientName}}'}, {'{{siteName}}'}, {'{{scheduledAt}}'}, {'{{techPanelLink}}'}, {'{{companyName}}'}
                </p>
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {emailTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary">
                      <div className="flex items-center gap-3">
                        <span className={cn('inline-block w-2 h-2 rounded-full', tpl.enabled ? 'bg-green-500' : 'bg-gray-500')} />
                        <span className="text-sm font-medium text-text-primary">{SLUG_LABELS[tpl.slug] || tpl.slug}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-bg-secondary text-text-muted">{LANG_LABELS[tpl.language] || tpl.language}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingTemplate(tpl);
                          setTplSubject(tpl.subject);
                          setTplBody(tpl.bodyHtml);
                          setTplPreview(null);
                        }}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          try {
                            await emailTemplateApi.update(tpl.id, { enabled: !tpl.enabled });
                            setEmailTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, enabled: !t.enabled } : t));
                            toast.success(tpl.enabled ? 'Desactive' : 'Active');
                          } catch { toast.error('Erreur'); }
                        }}>
                          {tpl.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {emailTemplates.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-text-muted">Aucun template. Executez la migration pour generer les templates par defaut.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Template edit modal */}
            {editingTemplate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditingTemplate(null)}>
                <div className="w-full max-w-2xl rounded-xl border border-border bg-bg-secondary shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <h3 className="font-semibold text-text-primary">
                      {SLUG_LABELS[editingTemplate.slug] || editingTemplate.slug} — {LANG_LABELS[editingTemplate.language] || editingTemplate.language}
                    </h3>
                    <button onClick={() => setEditingTemplate(null)} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Sujet</label>
                      <input
                        value={tplSubject}
                        onChange={(e) => setTplSubject(e.target.value)}
                        className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Corps HTML</label>
                      <textarea
                        value={tplBody}
                        onChange={(e) => setTplBody(e.target.value)}
                        rows={12}
                        className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary font-mono"
                      />
                    </div>
                    {tplPreview && (
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Apercu</label>
                        <div className="rounded-lg border border-border bg-white p-4" dangerouslySetInnerHTML={{ __html: tplPreview }} />
                      </div>
                    )}
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        try {
                          const { html } = await emailTemplateApi.preview(editingTemplate.id);
                          setTplPreview(html);
                        } catch { toast.error('Erreur de preview'); }
                      }}>Apercu</Button>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        const email = prompt('Adresse email de test :');
                        if (!email) return;
                        try {
                          await emailTemplateApi.testSend(editingTemplate.id, email);
                          toast.success('Email de test envoye');
                        } catch (err: any) { toast.error(err?.response?.data?.error || 'Echec de l\'envoi'); }
                      }}>Envoyer un test</Button>
                      <Button size="sm" variant="primary" loading={tplSaving} className="!bg-green-600 hover:!bg-green-700" onClick={async () => {
                        setTplSaving(true);
                        try {
                          const updated = await emailTemplateApi.update(editingTemplate.id, { subject: tplSubject, bodyHtml: tplBody });
                          setEmailTemplates((prev) => prev.map((t) => t.id === updated.id ? updated : t));
                          setEditingTemplate(null);
                          toast.success('Template enregistre');
                        } catch { toast.error('Erreur'); }
                        finally { setTplSaving(false); }
                      }}>Enregistrer</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── SMTP Servers ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">{t('settings.smtp.title')}</h2>
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} className="mr-1" /> {t('settings.smtp.addServer')}
              </Button>
            </div>
            {servers.length === 0 ? (
              <div className="rounded-lg border border-border bg-bg-secondary p-5 text-sm text-text-muted flex items-center gap-3">
                <Server size={16} className="shrink-0" />
                {t('settings.smtp.noServers')}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-2.5 font-medium text-text-secondary">{t('settings.smtp.colName')}</th>
                      <th className="px-4 py-2.5 font-medium text-text-secondary">{t('settings.smtp.colHost')}</th>
                      <th className="px-4 py-2.5 font-medium text-text-secondary">{t('settings.smtp.colFrom')}</th>
                      <th className="px-4 py-2.5 font-medium text-text-secondary text-right">{t('settings.smtp.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servers.map((server) => (
                      <tr key={server.id} className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">{server.name}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {server.host}:{server.port}
                          {server.secure && <span className="ml-1.5 text-xs bg-green-500/10 text-green-400 rounded px-1">{t('settings.smtp.tlsBadge')}</span>}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{server.fromAddress}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTest(server)}
                              disabled={testingId === server.id}
                              className="p-1.5 rounded text-text-muted hover:text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-50"
                              title={t('settings.smtp.testConnection')}
                            >
                              <Wifi size={14} />
                            </button>
                            <button
                              onClick={() => openEdit(server)}
                              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                              title={t('common.edit')}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(server)}
                              className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Obligate SSO Gateway ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftRight size={16} className="text-text-muted" />
              <h2 className="text-lg font-semibold text-text-primary">{t('settings.obligate.title')}</h2>
            </div>
            <div className="rounded-lg border border-border bg-bg-secondary p-5 space-y-4">
              <p className="text-sm text-text-muted">
{t('settings.obligate.description', 'Connectez cette application a votre passerelle SSO Obligate pour une authentification centralisee et une navigation inter-applications. Enregistrez d\'abord cette application dans Obligate, puis collez la cle API ici.')}
              </p>
              <div className="bg-status-pending-bg border border-status-pending/30 rounded-md p-3 text-sm text-status-pending">
{t('settings.obligate.warning', 'Lorsque active, l\'authentification locale est desactivee. Les utilisateurs doivent se connecter via la passerelle Obligate. Si la passerelle devient inaccessible, l\'authentification locale est automatiquement restauree.')}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-text-secondary">{t('settings.obligate.urlLabel')}</label>
                  {obligateCfg?.url && (
                    <a href={obligateCfg.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Ouvrir ↗</a>
                  )}
                </div>
                <input
                  type="url"
                  placeholder={t('settings.obligate.urlPlaceholder')}
                  value={obligateUrl}
                  onChange={(e) => setObligateUrl(e.target.value)}
                  onBlur={() => void saveObligateConfig()}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('settings.obligate.apiKeyLabel')}
                  {obligateCfg?.apiKeySet && (
                    <span className="ml-2 text-[10px] font-semibold rounded px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20">SET</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showObligateKey ? 'text' : 'password'}
                      placeholder={obligateCfg?.apiKeySet ? '••••••••••••••••••••••••••••••••••••' : t('settings.obligate.apiKeyPlaceholder')}
                      value={obligateApiKey}
                      onChange={(e) => setObligateApiKey(e.target.value)}
                      onBlur={() => { if (obligateApiKey.trim()) void saveObligateConfig(); }}
                      className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 pr-8 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowObligateKey((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showObligateKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-text-muted">
                  Generez cette cle dans{' '}
                  <span className="text-text-secondary font-medium">Obligate → Applications connectees → Ajouter une application</span>.
                </p>
              </div>

              {obligateCfg?.url && obligateCfg.apiKeySet && (
                <div className="pt-4 border-t border-border mt-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{t('settings.obligate.enableSso')}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {t('settings.obligate.enableSsoDesc')}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={appConfig?.obligate_enabled ?? false}
                      disabled={configSaving || !appConfig}
                      onClick={() => setConfigKey('obligate_enabled', !appConfig?.obligate_enabled)}
                      className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none', (appConfig?.obligate_enabled ?? false) ? 'bg-primary' : 'bg-bg-hover')}
                    >
                      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', (appConfig?.obligate_enabled ?? false) ? 'translate-x-6' : 'translate-x-1')} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Security / 2FA ── */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">{t('settings.security.title')}</h2>
            <div className="rounded-lg border border-border bg-bg-secondary divide-y divide-border">
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="flex items-start gap-3">
                  <Shield size={16} className="text-text-muted mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t('settings.security.allow2fa')}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t('settings.security.allow2faDesc')}</p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={appConfig?.allow_2fa ?? false}
                  disabled={configSaving || !appConfig}
                  onClick={() => setConfigKey('allow_2fa', !appConfig?.allow_2fa)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50',
                    appConfig?.allow_2fa ? 'bg-primary' : 'bg-bg-tertiary',
                  )}
                >
                  <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', appConfig?.allow_2fa ? 'translate-x-4' : 'translate-x-0')} />
                </button>
              </div>

              <div className={cn('flex items-start justify-between gap-4 p-4', !appConfig?.allow_2fa && 'opacity-50 pointer-events-none')}>
                <div className="flex items-start gap-3">
                  <Shield size={16} className="text-text-muted mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t('settings.security.force2fa')}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {t('settings.security.force2faDesc').split('\n')[0]}
                      {' '}
                      Contourner via <code className="text-xs font-mono">DISABLE_2FA_FORCE=true</code> dans .env.
                    </p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={appConfig?.force_2fa ?? false}
                  disabled={configSaving || !appConfig || !appConfig.allow_2fa}
                  onClick={() => setConfigKey('force_2fa', !appConfig?.force_2fa)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50',
                    appConfig?.force_2fa ? 'bg-primary' : 'bg-bg-tertiary',
                  )}
                >
                  <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', appConfig?.force_2fa ? 'translate-x-4' : 'translate-x-0')} />
                </button>
              </div>

              <div className={cn('flex items-start gap-4 p-4', !appConfig?.allow_2fa && 'opacity-50 pointer-events-none')}>
                <Server size={16} className="text-text-muted mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{t('settings.security.otpSmtp')}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t('settings.security.otpSmtpDesc')}</p>
                  <select
                    className="mt-2 w-full max-w-xs rounded-md border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    value={appConfig?.otp_smtp_server_id ?? ''}
                    disabled={configSaving || !appConfig || !appConfig.allow_2fa}
                    onChange={(e) => setConfigKey('otp_smtp_server_id', e.target.value ? parseInt(e.target.value, 10) : null)}
                  >
                    <option value="">{t('settings.security.noneOption')}</option>
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {smtpMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-secondary rounded-xl shadow-2xl border border-border w-full max-w-md">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-text-primary">
                {smtpMode === 'create' ? t('settings.smtp.addTitle') : t('settings.smtp.editTitle')}
              </h3>
            </div>
            <form onSubmit={handleSmtpSubmit} className="p-5 space-y-3">
              <Input
                label={t('settings.smtp.nameLabel')}
                value={smtpForm.name}
                onChange={(e) => setSmtpForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('settings.smtp.namePlaceholder')}
                required
              />
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Type d'authentification</label>
                <select
                  value={smtpForm.authType}
                  onChange={(e) => setSmtpForm((f) => ({ ...f, authType: e.target.value as 'basic' | 'oauth365' }))}
                  className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
                >
                  <option value="basic">SMTP classique</option>
                  <option value="oauth365">OAuth Microsoft 365</option>
                </select>
              </div>
              {smtpForm.authType === 'basic' ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Input
                        label={t('settings.smtp.hostLabel')}
                        value={smtpForm.host}
                        onChange={(e) => setSmtpForm((f) => ({ ...f, host: e.target.value }))}
                        placeholder={t('settings.smtp.hostPlaceholder')}
                        required
                      />
                    </div>
                    <Input
                      label={t('settings.smtp.portLabel')}
                      type="number"
                      value={smtpForm.port}
                      onChange={(e) => setSmtpForm((f) => ({ ...f, port: e.target.value }))}
                      placeholder={t('settings.smtp.portPlaceholder')}
                      required
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
                    <Checkbox
                      checked={smtpForm.secure}
                      onCheckedChange={(v) => setSmtpForm((f) => ({ ...f, secure: v }))}
                    />
                    {t('settings.smtp.tlsLabel')}
                  </label>
                  <Input
                    label={t('settings.smtp.usernameLabel')}
                    value={smtpForm.username}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, username: e.target.value }))}
                    required
                  />
                  <div className="relative">
                    <Input
                      label={smtpMode === 'edit' ? t('settings.smtp.passwordEditLabel') : t('settings.smtp.passwordLabel')}
                      type={showPassword ? 'text' : 'password'}
                      value={smtpForm.password}
                      onChange={(e) => setSmtpForm((f) => ({ ...f, password: e.target.value }))}
                      required={smtpMode === 'create'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 bottom-2 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label="Email (utilisateur Office 365)"
                    value={smtpForm.username}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="user@company.com"
                    required
                  />
                  <Input
                    label="Azure AD Tenant ID"
                    value={smtpForm.oauthTenantId}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, oauthTenantId: e.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    required
                  />
                  <Input
                    label="Client ID (Application)"
                    value={smtpForm.oauthClientId}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, oauthClientId: e.target.value }))}
                    required
                  />
                  <Input
                    label="Client Secret"
                    type="password"
                    value={smtpForm.oauthClientSecret}
                    onChange={(e) => setSmtpForm((f) => ({ ...f, oauthClientSecret: e.target.value }))}
                    required={smtpMode === 'create'}
                  />
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Refresh Token</label>
                    <textarea
                      value={smtpForm.oauthRefreshToken}
                      onChange={(e) => setSmtpForm((f) => ({ ...f, oauthRefreshToken: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary font-mono"
                      required={smtpMode === 'create'}
                    />
                  </div>
                </>
              )}
              <Input
                label={t('settings.smtp.fromLabel')}
                type="email"
                value={smtpForm.fromAddress}
                onChange={(e) => setSmtpForm((f) => ({ ...f, fromAddress: e.target.value }))}
                placeholder={t('settings.smtp.fromPlaceholder')}
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={closeSmtpModal}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={smtpSaving}>
                  {smtpSaving ? t('common.saving') : smtpMode === 'create' ? t('common.create') : t('common.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
