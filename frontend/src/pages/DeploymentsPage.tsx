import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  ExternalLink, 
  MapPin, 
  Layers, 
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getDeployments, deleteDeployment, getDeploymentFieldSettings, type DeploymentData } from '../api';
import NewDeploymentModal from '../components/NewDeploymentModal';

export const DeploymentsPage = () => {
  const [deployments, setDeployments] = useState<DeploymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [typeOptions, setTypeOptions] = useState<string[]>(['Deployment', 'POC']);
  const [statusOptions, setStatusOptions] = useState<string[]>(['Planning', 'Pre-POC', 'In Progress', 'Staging', 'Active', 'Completed']);

  const fetchDeploymentsList = async () => {
    try {
      setIsLoading(true);
      const data = await getDeployments();
      setDeployments(data || []);
    } catch (err) {
      console.error('Failed to fetch deployments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeploymentsList();
    getDeploymentFieldSettings().then(settings => {
      const tf = settings.fields.find(f => f.key === 'deployment_type');
      if (tf?.options?.length) setTypeOptions(tf.options);
      const sf = settings.fields.find(f => f.key === 'pre_poc_status');
      if (sf?.options?.length) setStatusOptions(sf.options);
    }).catch(() => {});
  }, []);

  const handleDelete = async (id: string, customerName: string) => {
    if (!window.confirm(`Are you sure you want to delete the deployment for "${customerName}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteDeployment(id);
      setDeployments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert('Failed to delete deployment. You may not have sufficient permissions.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDeployments = useMemo(() => {
    return deployments.filter(d => {
      const matchesSearch = 
        d.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.internal_group_name && d.internal_group_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'all' || d.deployment_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || 
        (d.pre_poc_status && d.pre_poc_status.toLowerCase() === statusFilter.toLowerCase());

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [deployments, searchQuery, typeFilter, statusFilter]);

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planning':
      case 'pre-poc':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'staging':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Deployments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customer infrastructure, hardware tracking, and access credentials.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Deployment</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, location, or group..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {typeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            {statusOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Deployments Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading deployments from database...
          </div>
        ) : filteredDeployments.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium text-base">No deployments match your query</p>
            <p className="text-slate-400 text-xs mt-1 mb-5">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try resetting your search filters.'
                : 'Get started by creating your very first deployment.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Deployment</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Customer / Group</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredDeployments.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <Link 
                            to={`/deployments/${d.id}`}
                            className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors block"
                          >
                            {d.customer_name}
                          </Link>
                          {d.internal_group_name && (
                            <span className="text-xs text-slate-400 font-mono">
                              {d.internal_group_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{d.location}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md bg-slate-100 font-medium text-slate-700 border border-slate-200">
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span>{d.deployment_type}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusBadge(d.pre_poc_status)}`}>
                        {d.pre_poc_status || 'Pending'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <Link
                        to={`/deployments/${d.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </Link>

                      <button
                        onClick={() => d.id && handleDelete(d.id, d.customer_name)}
                        disabled={deletingId === d.id}
                        title="Delete Deployment"
                        className="inline-flex items-center px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

export default DeploymentsPage;
