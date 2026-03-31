import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { EnrollmentPage } from '@/pages/EnrollmentPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { InterventionDetailPage } from '@/pages/InterventionDetailPage';
import { InterventionEditPage } from '@/pages/InterventionEditPage';
import { InterventionListPage } from '@/pages/InterventionListPage';
import { ClientManagePage } from '@/pages/ClientManagePage';
import { ClientDetailPage } from '@/pages/ClientDetailPage';
import { TechnicianManagePage } from '@/pages/TechnicianManagePage';
import { TechnicianDetailPage } from '@/pages/TechnicianDetailPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ReportFormPage } from '@/pages/ReportFormPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ImportExportPage } from '@/pages/ImportExportPage';
import { StepTemplateManagePage } from '@/pages/StepTemplateManagePage';
import { RecurringSchedulesPage } from '@/pages/RecurringSchedulesPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { MapPage } from '@/pages/MapPage';
import { DocumentationPage } from '@/pages/DocumentationPage';
import { DocumentEditPage } from '@/pages/DocumentEditPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import '@/i18n';

export default function App() {
  const { checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          {/* Enrollment — full-screen, outside AppLayout */}
          <Route path="/enroll" element={<EnrollmentPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/interventions" element={<InterventionListPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/docs" element={<DocumentationPage />} />
            <Route path="/docs/new" element={<DocumentEditPage />} />
            <Route path="/docs/:id" element={<DocumentEditPage />} />
            <Route path="/docs/:id/edit" element={<DocumentEditPage />} />
            <Route path="/intervention/new" element={<InterventionEditPage />} />
            <Route path="/intervention/:id" element={<InterventionDetailPage />} />
            <Route path="/intervention/:id/edit" element={<InterventionEditPage />} />
            <Route path="/intervention/:id/report" element={<ReportFormPage />} />
            <Route path="/client/:id" element={<ClientDetailPage />} />

            {/* Admin-only routes */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="/clients" element={<ClientManagePage />} />
              <Route path="/technicians" element={<TechnicianManagePage />} />
              <Route path="/technicians/:id" element={<TechnicianDetailPage />} />
              <Route path="/step-templates" element={<StepTemplateManagePage />} />
              <Route path="/recurring" element={<RecurringSchedulesPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/import-export" element={<ImportExportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-bg-secondary !text-text-primary !border !border-border',
          duration: 4000,
        }}
      />
    </BrowserRouter>
  );
}
