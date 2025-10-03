import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link as RouterLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { FluentProvider, webLightTheme, Text, Card, Button, Link } from '@fluentui/react-components';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import Layout from './components/layout/Layout';
import AnimalList from './components/animals/AnimalList';
import AnimalForm from './components/animals/AnimalForm';
import AnimalDetail from './components/animals/AnimalDetail';
import EventList from './components/events/EventList';
import EventForm from './components/events/EventForm';
import ExpenseList from './components/expenses/ExpenseList';
import ExpenseForm from './components/expenses/ExpenseForm';
import VendorList from './components/vendors/VendorList';
import VendorForm from './components/vendors/VendorForm';
import LocationList from './components/locations/LocationList';
import LocationDetail from './components/locations/LocationDetail';
import LocationForm from './components/locations/LocationForm';
import ProfileView from './components/profile/ProfileView';
import UserManagement from './components/admin/UserManagement';
import CustomerDashboard from './components/customer/CustomerDashboard';
import { RoleGuard } from './components/auth/RoleGuard';
import { useAuth } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const HomePage: React.FC = () => {
  const { user } = useAuth();

  // Customer users see the animal catalog directly
  if (user?.role === 'customer') {
    return <CustomerDashboard />;
  }

  // Users and admins see the full dashboard
  return (
    <div style={{ textAlign: 'center', padding: '32px' }}>
      <Text as="h1" size={900} weight="bold" style={{ marginBottom: '24px', display: 'block' }}>
        Welcome to Flock Tracker
      </Text>
      <Text size={400} style={{ marginBottom: '32px', display: 'block', color: '#6b7280' }}>
        Manage your farm animals, track events, and monitor locations all in one place.
      </Text>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Card style={{ padding: '24px' }}>
          <Text as="h3" size={600} weight="semibold" style={{ color: '#059669', marginBottom: '16px' }}>
            Animal Management
          </Text>
          <Text style={{ marginBottom: '16px', color: '#6b7280' }}>
            Track your sheep, chickens, and hives with detailed records including lineage and identification.
          </Text>
          <RouterLink to="/animals">
            <Button appearance="subtle" style={{ color: '#059669' }}>
              Manage Animals →
            </Button>
          </RouterLink>
        </Card>

        <Card style={{ padding: '24px' }}>
          <Text as="h3" size={600} weight="semibold" style={{ color: '#2563eb', marginBottom: '16px' }}>
            Event Tracking
          </Text>
          <Text style={{ marginBottom: '16px', color: '#6b7280' }}>
            Record important events like deworming, delicing, lambing, and health checks.
          </Text>
          <Link href="/events">
            <Button appearance="subtle" style={{ color: '#2563eb' }}>
              View Events →
            </Button>
          </Link>
        </Card>

        <Card style={{ padding: '24px' }}>
          <Text as="h3" size={600} weight="semibold" style={{ color: '#7c3aed', marginBottom: '16px' }}>
            Location Management
          </Text>
          <Text style={{ marginBottom: '16px', color: '#6b7280' }}>
            Keep track of where your animals are located with detailed address and paddock information.
          </Text>
          <Link href="/locations">
            <Button appearance="subtle" style={{ color: '#7c3aed' }}>
              Manage Locations →
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
};

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'}>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
              <Router>
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
                      <RoleGuard minRole="user">
                        <Layout>
                          <AnimalList />
                        </Layout>
                      </RoleGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/animals/new" element={
                    <ProtectedRoute>
                      <RoleGuard minRole="user">
                        <Layout>
                          <AnimalForm />
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
          </QueryClientProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </FluentProvider>
  );
}

export default App;
