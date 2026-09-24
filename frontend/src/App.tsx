import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MicrosoftCallbackPage from './pages/MicrosoftCallbackPage';
import DashboardPage from './pages/DashboardPage';
import DeploymentsPage from './pages/DeploymentsPage';
import DeploymentDetailPage from './pages/DeploymentDetailPage';
import Layout from './components/Layout';
import SettingsPage from './pages/SettingsPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';

const PrivateRoute = () => {
  const token = localStorage.getItem('access_token');
  return token ? <Layout><Outlet /></Layout> : <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/auth/microsoft/callback',
    element: <MicrosoftCallbackPage />
  },
  {
    element: <PrivateRoute />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/companies', element: <CompaniesPage /> },
      { path: '/companies/:id', element: <CompanyDetailPage /> },
      { path: '/deployments', element: <DeploymentsPage /> },
      { path: '/deployments/:id', element: <DeploymentDetailPage /> },
      { path: '/settings/user', element: <SettingsPage type="user" /> },
      { path: '/settings/admin', element: <SettingsPage type="admin" /> },
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
