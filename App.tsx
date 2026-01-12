import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './components/ui/toast';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { CoachesList } from './components/coaches/CoachesList';
import { CouplesList } from './components/couples/CouplesList';
import { AssignmentsList } from './components/assignments/AssignmentsList';
import { HomeworkPage } from './components/homework/HomeworkPage';
import { ReviewsPage } from './components/homework/ReviewsPage';
import { FormBuilderPage } from './components/homework/FormBuilderPage';
import './styles/globals.css';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <AuthenticatedLayout>
                <Dashboard />
              </AuthenticatedLayout>
            }
          />
          <Route
            path="/coaches"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <CoachesList />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/couples"
            element={
              <ProtectedRoute allowedRoles={['admin', 'coach']}>
                <AppLayout>
                  <CouplesList />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <AuthenticatedLayout>
                <AssignmentsList />
              </AuthenticatedLayout>
            }
          />
          <Route
            path="/homework"
            element={
              <ProtectedRoute allowedRoles={['couple']}>
                <AppLayout>
                  <HomeworkPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute allowedRoles={['admin', 'coach']}>
                <AppLayout>
                  <ReviewsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <FormBuilderPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
