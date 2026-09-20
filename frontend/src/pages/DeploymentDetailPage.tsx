import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Key, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Calendar,
  Globe,
  FileText,
  Package,
  User,
  ShieldCheck,
  MoreVertical,
  Pencil,
  Layers,
  ExternalLink,
  Clock,
  Wrench,
  Users,
  Server,
  History,
  KeyRound,
  FolderOpen
} from 'lucide-react';
import { 
  getDeployment, 
  getCredentials, 
  revealCredential, 
  deleteCredential,
  updateDeployment, 
  deleteDeployment, 
  getDeploymentFieldSettings, 
  type DeploymentData, 
  type CredentialData 
} from '../api';
import NewCredentialModal from '../components/NewCredentialModal';
import EditCredentialModal from '../components/EditCredentialModal';
import EditDeploymentModal from '../components/EditDeploymentModal';
import DeploymentActivityModal from '../components/DeploymentActivityModal';
import CredentialAccessLogsModal from '../components/CredentialAccessLogsModal';

export const DeploymentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deployment, setDeployment] = useState<DeploymentData | null>(null);
  const [credentials, setCredentials] = useState<CredentialData[]>([]);
  const [revealedCreds, setRevealedCreds] = useState<Record<string, any>>({});
  const [isRevealing, setIsRevealing] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [isEditCredModalOpen, setIsEditCredModalOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<CredentialData | null>(null);
  const [editingPayload, setEditingPayload] = useState<Record<string, any> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isCredLogsModalOpen, setIsCredLogsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([
    'Planning', 'Pre-POC', 'In Progress', 'Staging', 'Active', 'Completed'
  ]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  const fetchDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const depData = await getDeployment(id);
      setDeployment(depData);

      try {
        const credData = await getCredentials(id);
        setCredentials(credData || []);
      } catch (credErr) {
        console.warn('Could not load credentials for deployment:', credErr);
        setCredentials([]);
      }
    } catch (err) {
      console.error('Failed to fetch deployment details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    getDeploymentFieldSettings().then(settings => {
      const sf = settings.fields.find(f => f.key === 'pre_poc_status');
      if (sf?.options?.length) setStatusOptions(sf.options);
    }).catch(() => {});
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !deployment) return;
    try {
      setStatusUpdating(true);
      const updated = await updateDeployment(id, { pre_poc_status: newStatus });
      setDeployment(prev => prev ? { ...prev, ...updated } : updated);
    } catch (err) {
      alert('Failed to update deployment status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteDeployment = async () => {
    if (!id || !deployment) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${deployment.customer_name}"?`)) {
      return;
    }

    try {
      await deleteDeployment(id);
      navigate('/deployments');
    } catch (err) {
      alert('Failed to delete deployment');
    }
  };

  const handleToggleReveal = async (credId: string) => {
    if (revealedCreds[credId]) {
      // Hide
      setRevealedCreds(prev => {
        const copy = { ...prev };
        delete copy[credId];
        return copy;
      });
      return;
    }

    try {
      setIsRevealing(credId);
      const data = await revealCredential(credId);
      setRevealedCreds(prev => ({
        ...prev,
        [credId]: data.credential,
      }));
    } catch (err) {
      alert('Failed to decrypt credential. Unauthorized or audit log failure.');
    } finally {
      setIsRevealing(null);
    }
  };

  const handleStartEditCredential = async (cred: CredentialData) => {
    if (!cred.id) return;
    try {
      setIsRevealing(cred.id);
      // Mandatory decryption: calling reveal endpoint triggers the audit log for credential decryption
      const data = await revealCredential(cred.id);
      const payload = data.credential;
      setRevealedCreds(prev => ({
        ...prev,
        [cred.id!]: payload,
      }));
      setEditingCred(cred);
      setEditingPayload(payload);
      setIsEditCredModalOpen(true);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to decrypt credential. Unauthorized or audit log failure.');
    } finally {
      setIsRevealing(null);
    }
  };

  const handleDeleteCredential = async (credId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this credential? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteCredential(credId);
      if (id) {
        const creds = await getCredentials(id);
        setCredentials(creds || []);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete credential');
    }
  };

  const handleCopy = (text: string, keyIdentifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyIdentifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getCredIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'web_ui_login':
      case 'web_portal':
        return <Globe className="w-4 h-4 text-blue-500" />;
      case 'backend_login':
      case 'ssh':
      case 'database':
        return <Server className="w-4 h-4 text-purple-500" />;
      default:
        return <Key className="w-4 h-4 text-emerald-500" />;
    }
  };

  const formatCredType = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'web_ui_login':
        return 'Web UI Login';
      case 'backend_login':
        return 'Backend Login';
      case 'ssh':
        return 'SSH';
      case 'database':
        return 'Database';
      case 'web_portal':
        return 'Web Portal';
      default:
        return type || 'Credential';
    }
  };

  const formatPayloadKey = (key: string) => {
    switch (key.toLowerCase()) {
      case 'url':
        return 'IP Address and Port';
      case 'host':
        return 'IP Address';
      case 'port':
        return 'Port';
      case 'username':
        return 'Username';
      case 'password':
        return 'Password';
      default:
        return key.replace(/_/g, ' ');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        Loading deployment details...
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-700 font-semibold mb-4">Deployment not found</p>
        <Link to="/deployments" className="text-blue-600 hover:underline text-sm">
          ← Back to Deployments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Back Link */}
      <div>
        <Link
          to="/deployments"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Deployments</span>
        </Link>
      </div>

      {/* 2-Column Side-by-Side Layout: Left 1/3 (Info), Right 2/3 (Credentials) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
        {/* Left Column (1/3): Deployment Info Card */}
        <div className="sm:col-span-1 space-y-6 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Card Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate" title={deployment.customer_name}>
                  {deployment.customer_name}
                </h1>
                <p className="text-xs text-slate-500">
                  Deployment Specifications
                </p>
              </div>

              {/* 3-dots Action Menu */}
              <div className="relative inline-block text-left shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(prev => prev === 'deployment' ? null : 'deployment');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
                  title="Deployment options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {openMenuId === 'deployment' && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 mt-1 w-48 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setIsEditModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Deployment</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setIsActivityModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                    >
                      <History className="w-3.5 h-3.5 text-blue-500" />
                      <span>View Activity Log</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        setIsCredLogsModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Credential Access Logs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        handleDeleteDeployment();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete Deployment</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Info Fields Stacked Vertically */}
            <div className="p-5 space-y-4 text-sm divide-y divide-slate-100">
              {/* Field 1: Deployed Product */}
              <div className="space-y-1 pt-1 first:pt-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deployed Product</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {deployment.deployed_product || 'FieldOps Core Gateway'}
                </div>
              </div>

              {/* Field 2: Deployment Type */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deployment Type</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {deployment.deployment_type}
                </div>
              </div>

              {/* Field 3: Status */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Status</span>
                </div>
                <div className="space-y-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                    deployment.pre_poc_status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    deployment.pre_poc_status === 'Active' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    deployment.pre_poc_status === 'In Progress' || deployment.pre_poc_status === 'Staging' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}>
                    {deployment.pre_poc_status || 'Planning'}
                  </span>

                  {(deployment.status_updated_at || deployment.status_updated_by_name) && (
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1 pt-0.5">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        Set {formatDateTime(deployment.status_updated_at)}
                        {deployment.status_updated_by_name ? ` by ${deployment.status_updated_by_name}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Field 4: Account Owner */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account Owner</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {deployment.account_owner || <span className="text-slate-400 font-normal italic">Unassigned</span>}
                </div>
              </div>

              {/* Field 5: Lead Engineer */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lead Engineer</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {deployment.lead_engineer || <span className="text-slate-400 font-normal italic">Unassigned</span>}
                </div>
              </div>

              {/* Field 6: Assisting Engineer(s) */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assisting Engineer(s)</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {deployment.assisting_engineers || <span className="text-slate-400 font-normal italic">None</span>}
                </div>
              </div>

              {/* Field 7: Datacenter / Location */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Datacenter / Location</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {deployment.location}
                </div>
              </div>

              {/* Field 8: Internal Group */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Internal Group</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {deployment.internal_group_name || <span className="text-slate-400 font-normal italic">None</span>}
                </div>
              </div>

              {/* Field 9: Deployment Date */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deployment Date</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatDate(deployment.deployment_date || deployment.created_at)}
                </div>
              </div>

              {/* Field 10: Company Profile */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Company Profile</span>
                </div>
                <div>
                  {deployment.company_id ? (
                    <Link
                      to={`/companies/${deployment.company_id}`}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center space-x-1"
                    >
                      <span>View Profile</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-slate-900">{deployment.customer_name}</span>
                  )}
                </div>
              </div>

              {/* Field 11: Deployment Folder */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deployment Folder</span>
                </div>
                <div>
                  {deployment.deployment_folder ? (
                    <a
                      href={deployment.deployment_folder.startsWith('http://') || deployment.deployment_folder.startsWith('https://') 
                        ? deployment.deployment_folder 
                        : `https://${deployment.deployment_folder}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50/70 border border-blue-200/80 px-2.5 py-1.5 rounded-lg transition-colors group"
                      title={deployment.deployment_folder}
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-blue-600 shrink-0 group-hover:scale-105 transition-transform" />
                      <span className="truncate max-w-[180px]">Open OneDrive Folder</span>
                      <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400 font-normal italic">No folder linked</span>
                  )}
                </div>
              </div>

              {/* Notes & Instructions */}
              {deployment.notes && (
                <div className="pt-3 space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Notes & Technical Specs</span>
                  </div>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {deployment.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (2/3): Status Timeline & Credentials Vault */}
        <div className="sm:col-span-2 space-y-6 min-w-0">
          {/* Status & Progress Timeline Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                    Deployment Progress & Status
                  </h2>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Current Phase: <strong className="text-slate-800 font-semibold">{deployment.pre_poc_status || 'Planning'}</strong></span>
                  {(deployment.status_updated_at || deployment.status_updated_by_name) && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          Set {formatDateTime(deployment.status_updated_at)}
                          {deployment.status_updated_by_name ? ` by ${deployment.status_updated_by_name}` : ''}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Selector Dropdown */}
              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <label className="text-xs font-medium text-slate-500 hidden sm:inline">Change Phase:</label>
                <select
                  value={deployment.pre_poc_status || 'Planning'}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs text-slate-800 disabled:opacity-50"
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stepper Timeline Body */}
            <div className="p-5 sm:p-6 bg-slate-50/50">
              {(() => {
                const currentStatus = deployment.pre_poc_status || 'Planning';
                const currentStepIndex = Math.max(0, statusOptions.indexOf(currentStatus));
                const totalSteps = statusOptions.length;
                const progressPercent = totalSteps > 1 
                  ? Math.round((currentStepIndex / (totalSteps - 1)) * 100)
                  : 100;

                return (
                  <div className="space-y-4">
                    {/* Stepper nodes */}
                    <div className="overflow-x-auto pb-2 -mb-2">
                      <div className="min-w-[500px] flex items-center justify-between relative px-4 pt-1 pb-2">
                        {/* Background track */}
                        <div className="absolute left-8 right-8 top-5 h-1 bg-slate-200 -z-0" />
                        {/* Active Progress fill */}
                        <div 
                          className="absolute left-8 top-5 h-1 bg-blue-600 transition-all duration-300 -z-0"
                          style={{ 
                            width: totalSteps > 1 
                              ? `calc(${(currentStepIndex / (totalSteps - 1)) * 100}% - ${(currentStepIndex / (totalSteps - 1)) * 16}px)` 
                              : '100%' 
                          }}
                        />

                        {statusOptions.map((status, index) => {
                          const isPast = index < currentStepIndex;
                          const isCurrent = index === currentStepIndex;

                          return (
                            <button 
                              key={status} 
                              type="button"
                              onClick={() => handleStatusChange(status)}
                              disabled={statusUpdating}
                              title={`Set status to ${status}`}
                              className="flex flex-col items-center relative z-10 group cursor-pointer text-left focus:outline-none disabled:cursor-not-allowed"
                            >
                              {/* Circle node */}
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                                  isPast
                                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-50 group-hover:bg-emerald-700'
                                    : isCurrent
                                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 ring-offset-1 scale-110 shadow-md'
                                    : 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600'
                                }`}
                              >
                                {isPast ? (
                                  <Check className="w-4 h-4 stroke-[2.5]" />
                                ) : (
                                  <span>{index + 1}</span>
                                )}
                              </div>

                              {/* Label */}
                              <div className="mt-2 text-center">
                                <span 
                                  className={`text-xs block font-semibold transition-colors ${
                                    isCurrent 
                                      ? 'text-blue-700 font-bold' 
                                      : isPast 
                                      ? 'text-slate-800' 
                                      : 'text-slate-400 group-hover:text-slate-600'
                                  }`}
                                >
                                  {status}
                                </span>
                                <span className="text-[10px] text-slate-400 hidden sm:block">
                                  {isCurrent ? 'Current' : isPast ? 'Done' : `Step ${index + 1}`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress summary bar */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 px-1">
                      <span>Progress: <strong className="text-slate-700 font-semibold">{progressPercent}%</strong> ({currentStepIndex + 1} of {totalSteps} phases)</span>
                      <span className="text-slate-400 italic">Click any phase above to update status</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Encrypted Credentials Vault */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                  <Key className="w-5 h-5 text-emerald-600" />
                  <span>Encrypted Credentials Vault</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Secure Web UI and Backend access credentials stored with AES-256-GCM encryption.
                </p>
              </div>
              <button
                onClick={() => setIsCredModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Credential</span>
              </button>
            </div>

            {/* Credentials List */}
            <div className="divide-y divide-slate-100">
              {credentials.length === 0 ? (
                <div className="p-12 text-center">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No credentials stored yet</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Securely store Web UI logins and backend access credentials for this deployment.
                  </p>
                  <button
                    onClick={() => setIsCredModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Store First Credential</span>
                  </button>
                </div>
              ) : (
                credentials.map(cred => {
                  const isRevealed = Boolean(revealedCreds[cred.id || '']);
                  const payloadData = revealedCreds[cred.id || ''];

                  return (
                    <div key={cred.id} className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                            {getCredIcon(cred.credential_type)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{cred.label}</p>
                            <span className="text-xs text-slate-500 font-medium">
                              {formatCredType(cred.credential_type)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => cred.id && handleToggleReveal(cred.id)}
                            disabled={isRevealing === cred.id}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                              isRevealed
                                ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {isRevealed ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Hide Secret</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isRevealing === cred.id ? 'Decrypting...' : 'Reveal Secret'}</span>
                              </>
                            )}
                          </button>

                          {/* 3-dots Action Menu for Credential (Edit & Delete) */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(prev => prev === `cred-${cred.id}` ? null : `cred-${cred.id}`);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
                              title="Credential options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === `cred-${cred.id}` && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-44 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleStartEditCredential(cred);
                                  }}
                                  disabled={isRevealing === cred.id}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{isRevealing === cred.id ? 'Decrypting...' : 'Edit Credential'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    if (cred.id) handleDeleteCredential(cred.id);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Delete Credential</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Masked vs Revealed Content */}
                      {!isRevealed ? (
                        <div className="bg-slate-100/70 border border-slate-200 px-3.5 py-2.5 rounded-lg text-xs font-mono text-slate-500 tracking-widest flex items-center justify-between">
                          <span>••••••••••••••••••••••••••••••••</span>
                          <span className="text-xs text-slate-400 font-sans tracking-normal font-medium">Encrypted</span>
                        </div>
                      ) : (
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono border border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
                            <span className="font-sans font-semibold text-emerald-400 flex items-center space-x-1.5">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Decrypted Credentials (Audited)</span>
                            </span>
                            <button
                              onClick={() => handleCopy(JSON.stringify(payloadData, null, 2), `full-${cred.id}`)}
                              className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedKey === `full-${cred.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy All</span>
                                </>
                              )}
                            </button>
                          </div>

                          {typeof payloadData === 'object' && payloadData !== null ? (
                            <div className="space-y-2 pt-1 font-sans">
                              {Object.entries(payloadData).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between py-1.5 px-2.5 rounded bg-slate-800/70 hover:bg-slate-800">
                                  <div className="flex items-center space-x-2 truncate mr-2">
                                    <span className="text-slate-400 capitalize text-xs">{formatPayloadKey(key)}:</span>
                                    <span className="text-slate-100 font-semibold font-mono text-xs truncate">{String(val)}</span>
                                  </div>
                                  <button
                                    onClick={() => handleCopy(String(val), `${cred.id}-${key}`)}
                                    title={`Copy ${key}`}
                                    className="text-slate-400 hover:text-white p-1 shrink-0 cursor-pointer"
                                  >
                                    {copiedKey === `${cred.id}-${key}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="py-1 text-slate-200">{String(payloadData)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Credential Modal */}
      {id && (
        <NewCredentialModal
          isOpen={isCredModalOpen}
          deploymentId={id}
          onClose={() => setIsCredModalOpen(false)}
          onSuccess={() => {
            fetchDetails();
          }}
        />
      )}

      {/* Edit Credential Modal */}
      {editingCred && (
        <EditCredentialModal
          isOpen={isEditCredModalOpen}
          credential={editingCred}
          decryptedPayload={editingPayload}
          onClose={() => {
            setIsEditCredModalOpen(false);
            setEditingCred(null);
            setEditingPayload(null);
          }}
          onSuccess={(updatedCred, newPayload) => {
            setCredentials(prev => prev.map(c => c.id === updatedCred.id ? { ...c, ...updatedCred } : c));
            if (updatedCred.id) {
              setRevealedCreds(prev => ({
                ...prev,
                [updatedCred.id!]: newPayload,
              }));
            }
          }}
        />
      )}

      {/* Edit Deployment Modal */}
      {deployment && (
        <EditDeploymentModal
          isOpen={isEditModalOpen}
          deployment={deployment}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => {
            setDeployment(prev => prev ? { ...prev, ...updated } : updated);
          }}
        />
      )}

      {/* Deployment Activity Log Modal */}
      {id && deployment && (
        <DeploymentActivityModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          deploymentId={id}
          customerName={deployment.customer_name}
        />
      )}

      {/* Credential Access Logs Modal */}
      {id && deployment && (
        <CredentialAccessLogsModal
          isOpen={isCredLogsModalOpen}
          onClose={() => setIsCredLogsModalOpen(false)}
          deploymentId={id}
          customerName={deployment.customer_name}
        />
      )}
    </div>
  );
};

export default DeploymentDetailPage;
