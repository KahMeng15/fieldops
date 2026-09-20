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
  Lock,
  Terminal,
  Database,
  Globe,
  FileText,
  Package,
  User,
  ShieldCheck
} from 'lucide-react';
import { 
  getDeployment, 
  getCredentials, 
  revealCredential, 
  updateDeployment,
  deleteDeployment,
  getDeploymentFieldSettings,
  type DeploymentData, 
  type CredentialData 
} from '../api';
import NewCredentialModal from '../components/NewCredentialModal';

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
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([
    'Planning', 'Pre-POC', 'In Progress', 'Staging', 'Active', 'Completed'
  ]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    } catch {
      return 'N/A';
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
      setDeployment(prev => prev ? { ...prev, pre_poc_status: updated.pre_poc_status } : null);
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

  const handleCopy = (text: string, keyIdentifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyIdentifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getCredIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ssh': return <Terminal className="w-4 h-4 text-blue-500" />;
      case 'database': return <Database className="w-4 h-4 text-emerald-500" />;
      case 'web_portal': return <Globe className="w-4 h-4 text-amber-500" />;
      default: return <Lock className="w-4 h-4 text-purple-500" />;
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

      {/* Main Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {deployment.customer_name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {deployment.deployment_type}
            </span>
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg">
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">
                {deployment.deployed_product || 'FieldOps Core Gateway'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{deployment.location}</span>
            </span>
            {deployment.account_owner && (
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Owner: <strong className="text-slate-800 font-semibold">{deployment.account_owner}</strong></span>
              </span>
            )}
            {deployment.internal_group_name && (
              <span className="flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{deployment.internal_group_name}</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Deployed: {formatDate(deployment.deployment_date || deployment.created_at)}
              </span>
            </span>
            {deployment.company_id && (
              <Link 
                to={`/companies/${deployment.company_id}`}
                className="text-blue-600 hover:underline flex items-center space-x-1 font-medium"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>View Company Profile</span>
              </Link>
            )}
          </div>
        </div>

        {/* Status Dropdown & Delete */}
        <div className="flex items-center space-x-3 self-start md:self-auto">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={deployment.pre_poc_status || 'Planning'}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={statusUpdating}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDeleteDeployment}
            title="Delete this deployment"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notes / Description */}
      {deployment.notes && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Deployment Notes & Instructions</span>
          </h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {deployment.notes}
          </p>
        </div>
      )}

      {/* Credentials Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
              <Key className="w-5 h-5 text-emerald-600" />
              <span>Encrypted Credentials Vault</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure keys, passwords, and tokens stored with AES-256-GCM encryption.
            </p>
          </div>
          <button
            onClick={() => setIsCredModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all self-start sm:self-auto"
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
                Securely attach SSH keys, database credentials, or API tokens to this deployment.
              </p>
              <button
                onClick={() => setIsCredModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
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
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        {getCredIcon(cred.credential_type)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{cred.label}</p>
                        <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">
                          {cred.credential_type}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => cred.id && handleToggleReveal(cred.id)}
                      disabled={isRevealing === cred.id}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
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
                  </div>

                  {/* Masked vs Revealed Content */}
                  {!isRevealed ? (
                    <div className="bg-slate-100/70 border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-slate-500 tracking-widest flex items-center justify-between">
                      <span>••••••••••••••••••••••••••••••••</span>
                      <span className="text-xs text-slate-400 font-sans tracking-normal">Encrypted</span>
                    </div>
                  ) : (
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono border border-slate-800 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
                        <span className="font-sans font-semibold text-emerald-400 flex items-center space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Decrypted Payload (Audited)</span>
                        </span>
                        <button
                          onClick={() => handleCopy(JSON.stringify(payloadData, null, 2), `full-${cred.id}`)}
                          className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors"
                        >
                          {copiedKey === `full-${cred.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      </div>

                      {typeof payloadData === 'object' && payloadData !== null ? (
                        <div className="space-y-1.5 pt-1">
                          {Object.entries(payloadData).map(([key, val]) => (
                            <div key={key} className="flex items-center justify-between py-1 px-2 rounded bg-slate-800/60 hover:bg-slate-800">
                              <div>
                                <span className="text-blue-400">{key}: </span>
                                <span className="text-slate-200">{String(val)}</span>
                              </div>
                              <button
                                onClick={() => handleCopy(String(val), `${cred.id}-${key}`)}
                                title={`Copy ${key}`}
                                className="text-slate-400 hover:text-white p-1"
                              >
                                {copiedKey === `${cred.id}-${key}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
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
    </div>
  );
};

export default DeploymentDetailPage;
