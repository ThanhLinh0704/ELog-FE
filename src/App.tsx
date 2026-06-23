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
        <Route path="/403" element={<ForbiddenPage />} />


        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}




export default App;


