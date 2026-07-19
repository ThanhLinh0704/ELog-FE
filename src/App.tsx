import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/login/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import ProtectedPermissionRoute from './components/auth/ProtectedPermissionRoute';
import { PERMISSIONS } from './constants/permissions';
import UsersPage from './pages/UsersPage';
import ProductListPage from './pages/admin/products/ProductListPage';
import ProductFormPage from './pages/admin/products/ProductFormPage';
import ProductDetailPage from './pages/admin/products/ProductDetailPage';

import RouteListPage from './pages/admin/routes/RouteListPage';
import RouteCreatePage from './pages/admin/routes/RouteCreatePage';
import RouteDetailPage from './pages/admin/routes/RouteDetailPage';
import RouteEditPage from './pages/admin/routes/RouteEditPage';
import ForbiddenPage from './pages/ForbiddenPage';

import StoresPage from './pages/StoresPage';
import VehiclesPage from './pages/VehiclesPage';
import LifoManifestPage from './pages/LifoManifestPage';
import TripDraftsPage from './pages/TripDraftsPage';
import TripDraftReviewPage from './pages/TripDraftReviewPage';
import RoleManagementPage from './pages/RoleManagementPage';

import OrderImportPage from './pages/dispatcher/import/OrderImportPage';
import ImportBatchDetailPage from './pages/dispatcher/import/ImportBatchDetailPage';
import TripDraftListPage from './pages/dispatcher/trip-drafts/TripDraftListPage';
import TripDraftDetailPage from './pages/dispatcher/trip-drafts/TripDraftDetailPage';
import CapacityValidationPage from './pages/dispatcher/trip-drafts/CapacityValidationPage';
import VehicleAssignmentPage from './pages/dispatcher/trip-drafts/VehicleAssignmentPage';
import DispatchPage from './pages/dispatcher/trips/DispatchPage';


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
            <ProtectedPermissionRoute permission={PERMISSIONS.USER_READ}>
              <UsersPage />
            </ProtectedPermissionRoute>
          }
        />

        <Route
          path="/stores"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.STORE_READ}>
              <StoresPage />
            </ProtectedPermissionRoute>
          }
        />

        <Route
          path="/vehicles"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.VEHICLE_READ}>
              <VehiclesPage />
            </ProtectedPermissionRoute>
          }
        />

        <Route
          path="/trip-drafts"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.TRIP_READ}>
              <TripDraftsPage />
            </ProtectedPermissionRoute>
          }
        />

        <Route
          path="/trip-drafts/:draftId/review"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.TRIP_READ}>
              <TripDraftReviewPage />
            </ProtectedPermissionRoute>
          }
        />

        <Route
          path="/trip-drafts/:tripDraftId/loading-manifest"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.TRIP_READ}>
              <LifoManifestPage />
            </ProtectedPermissionRoute>
          }
        />

        <Route
          path="/trips/:tripId/loading-manifest"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.TRIP_READ}>
              <LifoManifestPage />
            </ProtectedPermissionRoute>
          }
        />

        <Route
          path="/admin/products"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.PRODUCT_READ}>
              <ProductListPage />
            </ProtectedPermissionRoute>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.PRODUCT_WRITE}>
              <ProductFormPage />
            </ProtectedPermissionRoute>
          }
        />
        <Route
          path="/admin/products/:productId"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.PRODUCT_READ}>
              <ProductDetailPage />
            </ProtectedPermissionRoute>
          }
        />
        <Route
          path="/admin/products/:productId/edit"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.PRODUCT_WRITE}>
              <ProductFormPage />
            </ProtectedPermissionRoute>
          }
        />

        {/* Route Management Module */}
        <Route
          path="/admin/routes"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.ROUTE_READ}>
              <RouteListPage />
            </ProtectedPermissionRoute>
          }
        />
        <Route
          path="/admin/routes/new"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.ROUTE_WRITE}>
              <RouteCreatePage />
            </ProtectedPermissionRoute>
          }
        />
        <Route
          path="/admin/routes/:routeId"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.ROUTE_READ}>
              <RouteDetailPage />
            </ProtectedPermissionRoute>
          }
        />
        <Route
          path="/admin/routes/:routeId/edit"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.ROUTE_WRITE}>
              <RouteEditPage />
            </ProtectedPermissionRoute>
          }
        />

        {/* Excel Order Import Module */}
        <Route
          path="/dispatcher/import"
          element={
            <ProtectedPermissionRoute anyOf={[PERMISSIONS.ORDER_IMPORT, PERMISSIONS.TRIP_READ]}>
              <OrderImportPage />
            </ProtectedPermissionRoute>
          }
        />
        <Route
          path="/dispatcher/import/history/:batchId"
          element={
            <ProtectedPermissionRoute anyOf={[PERMISSIONS.ORDER_IMPORT, PERMISSIONS.TRIP_READ]}>
              <ImportBatchDetailPage />
            </ProtectedPermissionRoute>
          }
        />

        {/* Route Consolidation (US-10) */}
        <Route
          path="/dispatcher/trip-drafts"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.TRIP_READ}>
              <TripDraftListPage />
            </ProtectedPermissionRoute>
          }
        />
        <Route
          path="/dispatcher/trip-drafts/:id"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.TRIP_READ}>
              <TripDraftDetailPage />
            </ProtectedPermissionRoute>
          }
        />
        <Route
          path="/dispatcher/trip-drafts/:id/capacity"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.TRIP_READ}>
              <CapacityValidationPage />
            </ProtectedPermissionRoute>
          }
        />

        {/* US-15 Vehicle Assignment */}
        <Route
          path="/dispatcher/trip-drafts/:id/assign"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.TRIP_COORDINATE}>
              <VehicleAssignmentPage />
            </ProtectedPermissionRoute>
          }
        />

        {/* US-16 Dispatch Execution */}
        <Route
          path="/dispatcher/trips/:tripId/dispatch"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.TRIP_COORDINATE}>
              <DispatchPage />
            </ProtectedPermissionRoute>
          }
        />

        <Route
          path="/roles"
          element={
            <ProtectedPermissionRoute permission={PERMISSIONS.ROLE_READ}>
              <RoleManagementPage />
            </ProtectedPermissionRoute>
          }
        />

        <Route path="/403" element={<ForbiddenPage />} />


        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}




export default App;


