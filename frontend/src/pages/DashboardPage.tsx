import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Server, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Plus, 
  ArrowRight, 
  ShieldCheck, 
  Database, 
  HardDrive,
  Activity,
  MapPin
} from 'lucide-react';
import { getDeployments, type DeploymentData } from '../api';
import NewDeploymentModal from '../components/NewDeploymentModal';

export const DashboardPage = () => {
  const [deployments, setDeployments] = useState<DeploymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const data = await getDeployments();
      setDeployments(data || []);
    } catch (err) {
      console.error('Failed to load dashboard deployments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalDeployments = deployments.length;
  const activeDeployments = deployments.filter(d => 
    d.pre_poc_status === 'Active' || d.pre_poc_status === 'In Progress'
  ).length;
  const pocDeployments = deployments.filter(d => d.deployment_type === 'POC').length;
  const planningDeployments = deployments.filter(d => 
    d.pre_poc_status === 'Planning' || d.pre_poc_status === 'Pre-POC'
  ).length;

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planning':
      case 'pre-poc':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'completed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            System Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status of production clusters, client POCs, and encrypted credentials.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Deployment</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Deployments</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {isLoading ? '...' : totalDeployments}
          </p>
          <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
            <span>Recorded in database</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-emerald-600 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Deployments</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600">
            {isLoading ? '...' : activeDeployments}
          </p>
          <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
            <span>Operational & online</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-blue-600 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Client POCs</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {isLoading ? '...' : pocDeployments}
          </p>
          <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
            <span>Proof-of-concept tests</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-amber-600 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Planning / Pre-POC</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600">
            {isLoading ? '...' : planningDeployments}
          </p>
          <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
            <span>Preparing infrastructure</span>
          </div>
        </div>
      </div>

      {/* Main Sections: Recent Deployments + Infrastructure Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Deployments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-slate-600" />
              <h2 className="font-semibold text-slate-900 text-base">Recent Deployments</h2>
            </div>
            <Link
              to="/deployments"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading deployments...</div>
            ) : deployments.length === 0 ? (
              <div className="p-12 text-center">
                <Server className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium text-sm">No deployments created yet</p>
                <p className="text-slate-400 text-xs mt-1 mb-4">Create your first deployment to start tracking credentials and hardware.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Deployment</span>
                </button>
              </div>
            ) : (
              deployments.slice(0, 5).map(dep => (
                <div key={dep.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Link 
                        to={`/deployments/${dep.id}`}
                        className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        {dep.customer_name}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatusBadge(dep.pre_poc_status)}`}>
                        {dep.pre_poc_status || 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{dep.location}</span>
                      </span>
                      <span>•</span>
                      <span>{dep.deployment_type}</span>
                    </div>
                  </div>
                  <Link
                    to={`/deployments/${dep.id}`}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-md transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Platform Health & Architecture */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900 text-base">Services Health</h2>
            </div>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">PostgreSQL (16)</span>
                </div>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Redis Cache & Broker</span>
                </div>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">MinIO Storage</span>
                </div>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">AES-256 Encryption</span>
                </div>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                  Secured
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-2 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Zero-Trust Credential Vault</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              All credentials stored for client deployments are encrypted using unique nonces with an authenticated AES-256-GCM cipher. Every reveal action generates an immutable audit record.
            </p>
            <Link
              to="/deployments"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              <span>Manage Vault Deployments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* New Deployment Modal */}
      <NewDeploymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={newDep => {
          setDeployments(prev => [newDep, ...prev]);
        }}
      />
    </div>
  );
};

export default DashboardPage;
