import { useCallback, useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  Bell,
  Users,
  Building,
  Plus,
  UserCircle,
  LogOut,
  Wrench,
  BarChart3,
  PackageOpen,
  ChevronDown,
  PanelLeft,
  PanelLeftClose,
  CalendarDays,
  Clipboard,
  ListChecks,
  BookOpen,
  Search,
  FileText,
  MapPin,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SearchResult } from '@oblifield/shared';
import { searchApi } from '@/api/search.api';
import { cn } from '@/utils/cn';
import { anonymizeUsername } from '@/utils/anonymize';
import { useAuthStore } from '@/store/authStore';
import { useClientStore } from '@/store/clientStore';
import { useUiStore } from '@/store/uiStore';
import { ClientTree } from '@/components/clients/ClientTree';

// ── localStorage helpers ─────────────────────────────────────────────────────

function usePersisted<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [value, set];
}

// ── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

const SEARCH_TYPE_ICONS: Record<string, React.ReactNode> = {
  intervention: <Clipboard size={12} />,
  client: <Building size={12} />,
  site: <MapPin size={12} />,
  technician: <Wrench size={12} />,
  document: <FileText size={12} />,
};

const SEARCH_TYPE_LABELS: Record<string, string> = {
  intervention: 'Intervention',
  client: 'Client',
  site: 'Site',
  technician: 'Technicien',
  document: 'Document',
};

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, canCreate } = useAuthStore();

  const topNavItems: NavItem[] = [
    { label: t('nav.dashboard', 'Dashboard'), path: '/', icon: <LayoutDashboard size={18} /> },
    { label: t('nav.interventions', 'Interventions'), path: '/interventions', icon: <Clipboard size={18} /> },
    { label: t('nav.schedule', 'Schedule'), path: '/schedule', icon: <CalendarDays size={18} /> },
    { label: t('nav.documentation', 'Documentation'), path: '/docs', icon: <BookOpen size={18} /> },
    { label: t('nav.map', 'Carte'), path: '/map', icon: <MapPin size={18} /> },
  ];

  const adminNavItems: NavItem[] = [
    { label: t('nav.clients', 'Clients'),           path: '/clients',              icon: <Building size={18} />,    adminOnly: true },
    { label: t('nav.technicians', 'Technicians'),   path: '/technicians',          icon: <Wrench size={18} />,      adminOnly: true },
    { label: t('nav.stepTemplates', 'Step Templates'), path: '/step-templates',       icon: <ListChecks size={18} />,  adminOnly: true },
    { label: t('nav.recurring', 'Recurring'),        path: '/recurring',            icon: <CalendarDays size={18} />,adminOnly: true },
    { label: t('nav.reports', 'Reports'),            path: '/reports',              icon: <BarChart3 size={18} />,   adminOnly: true },
    { label: t('nav.auditLog', 'Audit Log'),         path: '/audit-log',            icon: <Search size={18} />,      adminOnly: true },
    { label: t('nav.notifications', 'Notifications'), path: '/notifications',      icon: <Bell size={18} />,        adminOnly: true },
    { label: t('nav.users', 'Users'),                path: '/admin/users',          icon: <Users size={18} />,       adminOnly: true },
    { label: t('nav.importExport', 'Import/Export'), path: '/admin/import-export',  icon: <PackageOpen size={18} />, adminOnly: true },
    { label: t('nav.settings', 'Settings'),          path: '/settings',             icon: <Settings size={18} />,    adminOnly: true },
  ];

  const { sidebarFloating, toggleSidebarFloating } = useUiStore();
  const { tree, collapsedClientIds, fetchTree, toggleClientExpanded } = useClientStore();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [adminMenuOpen, setAdminMenuOpen] = usePersisted<boolean>('sidebar:admin-open', true);

  const admin = isAdmin();

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (search.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchApi.search(search.trim());
        setSearchResults(results);
        setSearchOpen(true);
      } catch { /* ignore */ }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  // Close search on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close search on navigation
  useEffect(() => {
    setSearchOpen(false);
    setSearch('');
  }, [location.pathname]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-bg-secondary">
      {/* Logo + float/pin toggle */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Oblifield" className="h-10 w-auto max-w-[200px] object-contain" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSidebarFloating}
            title={sidebarFloating ? t('nav.pinSidebar', 'Pin sidebar') : t('nav.floatSidebar', 'Float sidebar')}
            className={cn(
              'p-1.5 rounded transition-colors',
              sidebarFloating
                ? 'text-accent hover:text-accent hover:bg-accent/10'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover',
            )}
          >
            {sidebarFloating ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>
      </div>

      {/* New Intervention button */}
      {canCreate() && (
        <div className="px-3 pt-3">
          <Link
            to="/intervention/new"
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-hover"
          >
            <Plus size={14} />
            {t('intervention.new', 'New Intervention')}
          </Link>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-3 relative" ref={searchContainerRef}>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder={t('common.search', 'Search...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
            className="w-full rounded-md border border-border bg-bg-tertiary pl-8 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        {searchOpen && searchResults.length > 0 && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-bg-primary shadow-lg">
            {searchResults.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => { navigate(r.url); setSearchOpen(false); setSearch(''); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg-tertiary transition-colors"
              >
                <span className="text-text-secondary">{SEARCH_TYPE_ICONS[r.type]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text-primary truncate">{r.title}</div>
                  <div className="text-[10px] text-text-muted">
                    {SEARCH_TYPE_LABELS[r.type]}
                    {r.subtitle && ` · ${r.subtitle}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {searchOpen && search.trim().length >= 2 && searchResults.length === 0 && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-md border border-border bg-bg-primary shadow-lg p-3 text-center">
            <p className="text-xs text-text-secondary">Aucun resultat</p>
          </div>
        )}
      </div>

      {/* Client tree */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="px-2 py-1 flex items-center gap-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">
          <Building size={12} />
          {t('nav.clients', 'Clients')}
        </div>
        <ClientTree
          tree={tree}
          collapsedIds={collapsedClientIds}
          onToggle={toggleClientExpanded}
        />
      </div>

      {/* Navigation */}
      <nav className="border-t border-border p-2 pb-0">
        {topNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-bg-active text-text-primary'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Admin section collapsible divider */}
      {admin && (
        <>
          <button
            onClick={() => setAdminMenuOpen(v => !v)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-text-muted hover:text-text-secondary transition-colors"
          >
            <div className="flex-1 h-px bg-border" />
            <ChevronDown size={12} className={cn('transition-transform duration-200', !adminMenuOpen && '-rotate-90')} />
            <div className="flex-1 h-px bg-border" />
          </button>

          {adminMenuOpen && (
            <nav className="p-2 pt-0">
              {adminNavItems
                .filter((item) => !item.adminOnly || isAdmin())
                .map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-bg-active text-text-primary'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
            </nav>
          )}
        </>
      )}

      {/* User section */}
      <div className="border-t border-border p-2">
        <Link
          to="/profile"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            location.pathname === '/profile'
              ? 'bg-bg-active text-text-primary'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
          )}
        >
          <UserCircle size={18} />
          <span className="truncate flex-1">{anonymizeUsername(user?.displayName || (user?.username?.startsWith('og_') ? user.username.slice(3) : user?.username))}</span>
        </Link>
        <button
          onClick={() => {
            useAuthStore.getState().logout();
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <LogOut size={18} />
          {t('nav.signOut', 'Sign Out')}
        </button>
      </div>
    </aside>
  );
}
