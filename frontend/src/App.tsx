import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DeploymentsPage from './pages/DeploymentsPage';
import DeploymentDetailPage from './pages/DeploymentDetailPage';
import Layout from './components/Layout';

const PrivateRoute = () => {
  const token = localStorage.getItem('access_token');
  return token ? <Layout><Outlet /></Layout> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes with Persistent Navbar */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/deployments" element={<DeploymentsPage />} />
          <Route path="/deployments/:id" element={<DeploymentDetailPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
