import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/login/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import UsersPage from './pages/UsersPage';
import ProductListPage from './pages/admin/products/ProductListPage';
import ProductFormPage from './pages/admin/products/ProductFormPage';
import ProductDetailPage from './pages/admin/products/ProductDetailPage';

import RouteListPage from './pages/admin/routes/RouteListPage';
import RouteCreatePage from './pages/admin/routes/RouteCreatePage';
import RouteDetailPage from './pages/admin/routes/RouteDetailPage';
import RouteEditPage from './pages/admin/routes/RouteEditPage';
import ForbiddenPage from './pages/ForbiddenPage';
import RouteManagementGuard from './guards/RouteManagementGuard';

import StoresPage from './pages/StoresPage';
import VehiclesPage from './pages/VehiclesPage';
import LifoManifestPage from './pages/LifoManifestPage';
import TripDraftsPage from './pages/TripDraftsPage';
import TripDraftReviewPage from './pages/TripDraftReviewPage';

import OrderImportPage from './pages/dispatcher/import/OrderImportPage';
import ImportBatchDetailPage from './pages/dispatcher/import/ImportBatchDetailPage';
import ImportModuleGuard from './guards/ImportModuleGuard';
import TripDraftListPage from './pages/dispatcher/trip-drafts/TripDraftListPage';
import TripDraftDetailPage from './pages/dispatcher/trip-drafts/TripDraftDetailPage';
import CapacityValidationPage from './pages/dispatcher/trip-drafts/CapacityValidationPage';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stores"
          element={
            <ProtectedRoute>
              <StoresPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vehicles"
          element={
            <ProtectedRoute>
              <VehiclesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/trip-drafts"
          element={
            <ProtectedRoute>
              <TripDraftsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/trip-drafts/:draftId/review"
          element={
            <ProtectedRoute>
              <TripDraftReviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/trip-drafts/:tripDraftId/loading-manifest"
          element={
            <ProtectedRoute>
              <LifoManifestPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/trips/:tripId/loading-manifest"
          element={
            <ProtectedRoute>
              <LifoManifestPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/products"
          element={
            <ProtectedRoute>
              <ProductListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <ProtectedRoute>
              <ProductFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/:productId"
          element={
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/:productId/edit"
          element={
            <ProtectedRoute>
              <ProductFormPage />
            </ProtectedRoute>
          }
        />

        {/* Route Management Module */}
        <Route
          path="/admin/routes"
          element={
            <RouteManagementGuard>
              <RouteListPage />
            </RouteManagementGuard>
          }
        />
        <Route
          path="/admin/routes/new"
          element={
            <RouteManagementGuard>
              <RouteCreatePage />
            </RouteManagementGuard>
          }
        />
        <Route
          path="/admin/routes/:routeId"
          element={
            <RouteManagementGuard>
              <RouteDetailPage />
            </RouteManagementGuard>
          }
        />
        <Route
          path="/admin/routes/:routeId/edit"
          element={
            <RouteManagementGuard>
              <RouteEditPage />
            </RouteManagementGuard>
          }
        />

        {/* Excel Order Import Module */}
        <Route
          path="/dispatcher/import"
          element={
            <ImportModuleGuard>
              <OrderImportPage />
            </ImportModuleGuard>
          }
        />
        <Route
          path="/dispatcher/import/history/:batchId"
          element={
            <ImportModuleGuard>
              <ImportBatchDetailPage />
            </ImportModuleGuard>
          }
        />

        {/* Route Consolidation (US-10) */}
        <Route
          path="/dispatcher/trip-drafts"
          element={
            <ProtectedRoute>
              <TripDraftListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatcher/trip-drafts/:id"
          element={
            <ProtectedRoute>
              <TripDraftDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatcher/trip-drafts/:id/capacity"
          element={
            <ProtectedRoute>
              <CapacityValidationPage />
            </ProtectedRoute>
          }
        />


        <Route path="/403" element={<ForbiddenPage />} />


        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}




export default App;


