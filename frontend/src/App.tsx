import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DeploymentsPage from './pages/DeploymentsPage';
import DeploymentDetailPage from './pages/DeploymentDetailPage';
import Layout from './components/Layout';
import SettingsPage from './pages/SettingsPage';

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
    element: <PrivateRoute />,
    children: [
      { path: '/', element: <DashboardPage /> },
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
