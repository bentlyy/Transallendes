import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from './AppLayout'
import { USER_ROLES } from '@/utils/constants'

// Lazy imports
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import NotFoundPage from '@/pages/NotFoundPage'

import AdminMapPage from '@/pages/AdminMapPage'
import AdminDashboardPage from '@/pages/AdminDashboardPage'
import TruckListPage from '@/pages/TruckListPage'
import TruckDetailPage from '@/pages/TruckDetailPage'
import DriverListPage from '@/pages/DriverListPage'
import DriverDetailPage from '@/pages/DriverDetailPage'
import TripListPage from '@/pages/TripListPage'
import TripDetailPage from '@/pages/TripDetailPage'
import ClientListPage from '@/pages/ClientListPage'
import ClientDetailPage from '@/pages/ClientDetailPage'
import GeofenceListPage from '@/pages/GeofenceListPage'
import AlertListPage from '@/pages/AlertListPage'
import ReportListPage from '@/pages/ReportListPage'
import MaintenancePage from '@/pages/MaintenancePage'
import AdminSettingsPage from '@/pages/AdminSettingsPage'

import ClientMapPage from '@/pages/ClientMapPage'
import ClientDashboardPage from '@/pages/ClientDashboardPage'
import ClientTripListPage from '@/pages/ClientTripListPage'
import ClientTripDetailPage from '@/pages/ClientTripDetailPage'
import ClientTruckListPage from '@/pages/ClientTruckListPage'
import ClientAlertListPage from '@/pages/ClientAlertListPage'
import ClientDocumentsPage from '@/pages/ClientDocumentsPage'
import ClientReportsPage from '@/pages/ClientReportsPage'
import ClientSettingsPage from '@/pages/ClientSettingsPage'

import TenantListPage from '@/pages/TenantListPage'
import TenantDetailPage from '@/pages/TenantDetailPage'
import GlobalUserListPage from '@/pages/GlobalUserListPage'
import SuperAdminSettingsPage from '@/pages/SuperAdminSettingsPage'

export default function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="map" element={<AdminMapPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="trucks" element={<TruckListPage />} />
          <Route path="trucks/:id" element={<TruckDetailPage />} />
          <Route path="drivers" element={<DriverListPage />} />
          <Route path="drivers/:id" element={<DriverDetailPage />} />
          <Route path="trips" element={<TripListPage />} />
          <Route path="trips/:id" element={<TripDetailPage />} />
          <Route path="clients" element={<ClientListPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="geofences" element={<GeofenceListPage />} />
          <Route path="alerts" element={<AlertListPage />} />
          <Route path="reports" element={<ReportListPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Client routes */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="map" element={<ClientMapPage />} />
          <Route path="dashboard" element={<ClientDashboardPage />} />
          <Route path="trips" element={<ClientTripListPage />} />
          <Route path="trips/:id" element={<ClientTripDetailPage />} />
          <Route path="trucks" element={<ClientTruckListPage />} />
          <Route path="alerts" element={<ClientAlertListPage />} />
          <Route path="documents" element={<ClientDocumentsPage />} />
          <Route path="reports" element={<ClientReportsPage />} />
          <Route path="settings" element={<ClientSettingsPage />} />
        </Route>

        {/* Super Admin routes */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="tenants" replace />} />
          <Route path="tenants" element={<TenantListPage />} />
          <Route path="tenants/:id" element={<TenantDetailPage />} />
          <Route path="users" element={<GlobalUserListPage />} />
          <Route path="settings" element={<SuperAdminSettingsPage />} />
        </Route>

        {/* 404 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  )
}
