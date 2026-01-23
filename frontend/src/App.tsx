import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { AuthProvider } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import Layout from './components/layout/Layout';
import AnimalList from './components/animals/AnimalList';
import AnimalForm from './components/animals/AnimalForm';
import AnimalDetail from './components/animals/AnimalDetail';
import AnimalCSVImport from './components/animals/AnimalCSVImport';
import EventList from './components/events/EventList';
import EventForm from './components/events/EventForm';
import EventCSVImport from './components/events/EventCSVImport';
import ExpenseList from './components/expenses/ExpenseList';
import ExpenseForm from './components/expenses/ExpenseForm';
import BatchReceiptUpload from './components/receipts/BatchReceiptUpload';
import VendorList from './components/vendors/VendorList';
import VendorForm from './components/vendors/VendorForm';
import LocationList from './components/locations/LocationList';
import LocationDetail from './components/locations/LocationDetail';
import LocationForm from './components/locations/LocationForm';
import ProductList from './components/products/ProductList';
import ProductForm from './components/products/ProductForm';
import ProfileView from './components/profile/ProfileView';
import CareScheduleList from './components/care-schedules/CareScheduleList';
import CareScheduleForm from './components/care-schedules/CareScheduleForm';
import CareScheduleCalendar from './components/care-schedules/CareScheduleCalendar';
import LivestreamList from './components/livestreams/LivestreamList';
import LivestreamForm from './components/livestreams/LivestreamForm';
import LivestreamViewer from './components/livestreams/LivestreamViewer';
import UserManagement from './components/admin/UserManagement';
import CustomerDashboard from './components/customer/CustomerDashboard';
import { RoleGuard } from './components/auth/RoleGuard';
import { useAuth } from './contexts/AuthContext';
import { createQueryClient, persisterOptions } from './lib/queryPersister';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { useServerVersion } from './hooks/useServerVersion';

const queryClient = createQueryClient();

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  // Customer users see the customer dashboard
  if (user?.role === 'customer') {
    return <CustomerDashboard />;
  }

  // Users and admins see the animals list as the home page
  return <AnimalList />;
};

// AppContent component that runs inside QueryClientProvider
const AppContent: React.FC = () => {
  // Enable automatic token refresh
  useTokenRefresh();

  // Check server version and clear cache on server restart
  useServerVersion();

  return (
    <Router>
      <OfflineIndicator />
      <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout>
                        <HomePage />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/animals" element={
                    <ProtectedRoute>
                      <Layout>
                        <AnimalList />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/animals/new" element={
                    <ProtectedRoute>
                      <Layout>
                        <AnimalForm />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/animals/import" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <AnimalCSVImport />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/animals/:id" element={
                    <ProtectedRoute>
                      <Layout>
                        <AnimalDetail />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/animals/:id/edit" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <AnimalForm isEdit />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/events" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <EventList />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/events/new" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <EventForm />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/events/import" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <EventCSVImport />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/events/:id/edit" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <EventForm isEdit />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <ExpenseList />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses/new" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <ExpenseForm />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses/:id/edit" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <ExpenseForm isEdit />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/receipts/batch-upload" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <BatchReceiptUpload />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/vendors" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <VendorList />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/vendors/new" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <VendorForm />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/vendors/:id/edit" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <VendorForm isEdit />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/locations" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <LocationList />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/locations/new" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <LocationForm />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/locations/:id" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <LocationDetail />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/locations/:id/edit" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <LocationForm isEdit />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/products" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <ProductList />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/products/new" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <ProductForm />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/products/:id/edit" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <ProductForm isEdit />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/care-schedules" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <CareScheduleList />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/care-schedules/new" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <CareScheduleForm />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/care-schedules/calendar" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <CareScheduleCalendar />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/care-schedules/:id" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <CareScheduleList />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/care-schedules/:id/edit" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <CareScheduleForm isEdit />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/livestreams" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <LivestreamList />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/livestreams/new" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <LivestreamForm />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/livestreams/:id/view" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <LivestreamViewer />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/livestreams/:id/edit" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <LivestreamForm isEdit />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Layout>
                        <ProfileView />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/users" element={
                    <ProtectedRoute>
                      <RoleGuard requiredRole="admin">
                        <Layout>
                          <UserManagement />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Router>
  );
};

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'}>
        <AuthProvider>
          <OfflineProvider>
            <PersistQueryClientProvider client={queryClient} persistOptions={persisterOptions}>
              <AppContent />
            </PersistQueryClientProvider>
          </OfflineProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </FluentProvider>
  );
}

export default App;
