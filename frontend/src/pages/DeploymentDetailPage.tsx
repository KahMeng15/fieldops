import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useBlocker } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Key, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Copy, 
  Check, 
  X,
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
  FolderOpen,
  MessageSquare,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { 
  getDeployment, 
  getCredentials, 
  revealCredential, 
  deleteCredential,
  updateDeployment, 
  deleteDeployment, 
  getDeploymentFieldSettings, 
  getPhaseRemarks,
  createPhaseRemark,
  type DeploymentData, 
  type CredentialData,
  type PhaseRemarkItem 
} from '../api';
import NewCredentialModal from '../components/NewCredentialModal';
import EditCredentialModal from '../components/EditCredentialModal';
import EditDeploymentModal from '../components/EditDeploymentModal';
import DeploymentActivityModal from '../components/DeploymentActivityModal';
import CredentialAccessLogsModal from '../components/CredentialAccessLogsModal';
import PhaseRemarksHistoryModal from '../components/PhaseRemarksHistoryModal';
import CredentialVersionsModal from '../components/CredentialVersionsModal';

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
  const [selectedVersionCred, setSelectedVersionCred] = useState<CredentialData | null>(null);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isCredLogsModalOpen, setIsCredLogsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([
    'Cancelled', 'Planning', 'Pre-POC', 'In Progress', 'On Hold', 'Completed'
  ]);
  const [selectedPhase, setSelectedPhase] = useState<string>('Planning');
  const [phaseRemarks, setPhaseRemarks] = useState<PhaseRemarkItem[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [isEditingRemark, setIsEditingRemark] = useState(false);
  const [remarkEditText, setRemarkEditText] = useState('');
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [isPhaseRemarksHistoryModalOpen, setIsPhaseRemarksHistoryModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'NAVIGATION' }
    | { type: 'CHANGE_STATUS'; status: string }
    | { type: 'CANCEL_EDIT' }
    | { type: 'VIEW_HISTORY' }
    | null
  >(null);

  const [fieldSettings, setFieldSettings] = useState<any[]>([]);
  const [inlineEditingField, setInlineEditingField] = useState<string | null>(null);
  const [inlineEditingValue, setInlineEditingValue] = useState<string>('');
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const currentActiveRemark = phaseRemarks.find(r => !r.is_archived) || null;
  const originalRemarkText = currentActiveRemark?.remark || '';
  const hasUnsavedChanges = isEditingRemark && remarkEditText !== originalRemarkText;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setPendingAction({ type: 'NAVIGATION' });
    }
  }, [blocker.state]);

  // Warn on tab close / browser refresh / closing window
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (deployment?.pre_poc_status) {
      setSelectedPhase(deployment.pre_poc_status);
    }
  }, [deployment?.pre_poc_status]);

  useEffect(() => {
    setIsEditingRemark(false);
    setRemarkEditText('');
  }, [selectedPhase]);

  const fetchPhaseRemarks = async (phaseName: string) => {
    if (!id) return;
    try {
      setLoadingRemarks(true);
      const data = await getPhaseRemarks(id, phaseName);
      setPhaseRemarks(data || []);
    } catch (err) {
      console.error('Failed to fetch phase remarks', err);
    } finally {
      setLoadingRemarks(false);
    }
  };

  useEffect(() => {
    if (id && selectedPhase) {
      fetchPhaseRemarks(selectedPhase);
    }
  }, [id, selectedPhase]);

  const handleSaveNotepadRemark = async () => {
    if (!id || !remarkEditText.trim()) return;
    try {
      setIsSubmittingRemark(true);
      await createPhaseRemark(id, {
        phase: selectedPhase,
        remark: remarkEditText.trim()
      });
      await fetchPhaseRemarks(selectedPhase);
      setIsEditingRemark(false);
      setRemarkEditText('');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to save remark');
    } finally {
      setIsSubmittingRemark(false);
    }
  };

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
    getDeploymentFieldSettings().then((settings: any) => {
      if (settings?.fields) {
        setFieldSettings(settings.fields);
        const sf = settings.fields.find((f: any) => f.key === 'pre_poc_status');
        if (sf?.options?.length) setStatusOptions(sf.options);
      }
    }).catch(() => {});
  }, [id]);

  const getFieldOptions = (key: string, fallback: string[]) => {
    const f = fieldSettings.find((field: any) => field.key === key);
    return (f?.options && f.options.length > 0) ? f.options : fallback;
  };

  const handleStartInlineEdit = (fieldKey: string, initialValue: any) => {
    setInlineEditingField(fieldKey);
    let val = '';
    if (fieldKey === 'deployment_date') {
      if (initialValue) {
        try {
          const d = new Date(initialValue);
          val = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
        } catch {
          val = '';
        }
      }
    } else {
      val = initialValue !== null && initialValue !== undefined ? String(initialValue) : '';
    }
    setInlineEditingValue(val);
    setInlineError(null);
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingField(null);
    setInlineEditingValue('');
    setInlineError(null);
  };

  const handleSaveInlineEdit = async (fieldKey: string) => {
    if (!id || !deployment) return;
    setInlineError(null);

    const trimmed = inlineEditingValue.trim();
    if ((fieldKey === 'customer_name' || fieldKey === 'location') && !trimmed) {
      setInlineError('This field cannot be empty.');
      return;
    }

    try {
      setIsSavingInline(true);
      let payloadValue: any = trimmed;
      if (fieldKey === 'deployment_date') {
        payloadValue = trimmed ? new Date(trimmed).toISOString() : null;
      } else if (!trimmed) {
        payloadValue = null;
      }

      const updated = await updateDeployment(id, { [fieldKey]: payloadValue });
      setDeployment((prev: any) => prev ? { ...prev, ...updated } : updated);
      setInlineEditingField(null);
      setInlineEditingValue('');
    } catch (err: any) {
      setInlineError(err?.response?.data?.detail || 'Failed to save change.');
    } finally {
      setIsSavingInline(false);
    }
  };

  const renderInlineEditControls = (fieldKey: string) => (
    <div className="flex items-center gap-1 shrink-0 ml-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleSaveInlineEdit(fieldKey);
        }}
        disabled={isSavingInline}
        className="p-1 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
        title="Save"
      >
        {isSavingInline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleCancelInlineEdit();
        }}
        disabled={isSavingInline}
        className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const executeStatusChange = async (newStatus: string) => {
    if (!id || !deployment) return;
    try {
      setStatusUpdating(true);
      const updated = await updateDeployment(id, { pre_poc_status: newStatus });
      setDeployment((prev: any) => prev ? { ...prev, ...updated } : updated);
      setSelectedPhase(newStatus);
      fetchPhaseRemarks(newStatus);
    } catch (err) {
      alert('Failed to update deployment status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !deployment) return;
    if (hasUnsavedChanges && newStatus !== selectedPhase) {
      setPendingAction({ type: 'CHANGE_STATUS', status: newStatus });
      return;
    }
    await executeStatusChange(newStatus);
  };

  const handleConfirmSaveAndProceed = async () => {
    if (!pendingAction) return;
    try {
      if (remarkEditText.trim()) {
        setIsSubmittingRemark(true);
        await createPhaseRemark(id!, {
          phase: selectedPhase,
          remark: remarkEditText.trim()
        });
        await fetchPhaseRemarks(selectedPhase);
      }
      setIsEditingRemark(false);
      setRemarkEditText('');

      if (pendingAction.type === 'NAVIGATION') {
        blocker.proceed?.();
      } else if (pendingAction.type === 'CHANGE_STATUS') {
        await executeStatusChange(pendingAction.status);
      } else if (pendingAction.type === 'VIEW_HISTORY') {
        setIsPhaseRemarksHistoryModalOpen(true);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to save remark');
    } finally {
      setIsSubmittingRemark(false);
      setPendingAction(null);
    }
  };

  const handleConfirmDiscard = () => {
    if (!pendingAction) return;
    setIsEditingRemark(false);
    setRemarkEditText('');

    if (pendingAction.type === 'NAVIGATION') {
      blocker.proceed?.();
    } else if (pendingAction.type === 'CHANGE_STATUS') {
      executeStatusChange(pendingAction.status);
    } else if (pendingAction.type === 'VIEW_HISTORY') {
      setIsPhaseRemarksHistoryModalOpen(true);
    }
    setPendingAction(null);
  };

  const handleCancelPendingAction = () => {
    if (pendingAction?.type === 'NAVIGATION') {
      blocker.reset?.();
    }
    setPendingAction(null);
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
                  {deployment.company_id ? (
                    <Link to={`/companies/${deployment.company_id}`} className="hover:text-blue-600 hover:underline">
                      {deployment.customer_name}
                    </Link>
                  ) : (
                    deployment.customer_name
                  )}
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
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 outline-none focus:outline-none focus:ring-0"
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
                        setIsPhaseRemarksHistoryModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Phase Remarks History</span>
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
                {inlineEditingField === 'deployed_product' ? (
                  <div>
                    <div className="flex items-center pt-0.5">
                      <select
                        autoFocus
                        value={inlineEditingValue}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineEdit('deployed_product');
                          if (e.key === 'Escape') handleCancelInlineEdit();
                        }}
                        disabled={isSavingInline}
                        className="w-full text-sm font-semibold text-slate-900 border border-blue-500 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {getFieldOptions('deployed_product', [
                          'FieldOps Core Gateway',
                          'Edge Compute Appliance X1',
                          'Secure Access Service Edge (SASE)',
                          'AI Inference Node Enterprise',
                          'Zero Trust Network Connector'
                        ]).map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        {inlineEditingValue && !getFieldOptions('deployed_product', [
                          'FieldOps Core Gateway',
                          'Edge Compute Appliance X1',
                          'Secure Access Service Edge (SASE)',
                          'AI Inference Node Enterprise',
                          'Zero Trust Network Connector'
                        ]).includes(inlineEditingValue) && (
                          <option value={inlineEditingValue}>{inlineEditingValue}</option>
                        )}
                      </select>
                      {renderInlineEditControls('deployed_product')}
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('deployed_product', deployment.deployed_product || 'FieldOps Core Gateway')}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit deployed product"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.deployed_product || 'FieldOps Core Gateway'}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 2: Deployment Type */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deployment Type</span>
                </div>
                {inlineEditingField === 'deployment_type' ? (
                  <div>
                    <div className="flex items-center pt-0.5">
                      <select
                        autoFocus
                        value={inlineEditingValue}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineEdit('deployment_type');
                          if (e.key === 'Escape') handleCancelInlineEdit();
                        }}
                        disabled={isSavingInline}
                        className="w-full text-sm font-semibold text-slate-900 border border-blue-500 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {getFieldOptions('deployment_type', ['Deployment', 'POC', 'Pilot', 'Trial', 'Staging']).map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {renderInlineEditControls('deployment_type')}
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('deployment_type', deployment.deployment_type)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit deployment type"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.deployment_type}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 3: Account Owner */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account Owner</span>
                </div>
                {inlineEditingField === 'account_owner' ? (
                  <div>
                    <div className="flex items-center pt-0.5">
                      <input
                        type="text"
                        autoFocus
                        value={inlineEditingValue}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineEdit('account_owner');
                          if (e.key === 'Escape') handleCancelInlineEdit();
                        }}
                        disabled={isSavingInline}
                        className="w-full text-sm font-semibold text-slate-900 border border-blue-500 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Assign account owner..."
                      />
                      {renderInlineEditControls('account_owner')}
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('account_owner', deployment.account_owner)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit account owner"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.account_owner || <span className="text-slate-400 font-normal italic">Unassigned</span>}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 4: Lead Engineer */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lead Engineer</span>
                </div>
                {inlineEditingField === 'lead_engineer' ? (
                  <div>
                    <div className="flex items-center pt-0.5">
                      <input
                        type="text"
                        autoFocus
                        value={inlineEditingValue}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineEdit('lead_engineer');
                          if (e.key === 'Escape') handleCancelInlineEdit();
                        }}
                        disabled={isSavingInline}
                        className="w-full text-sm font-semibold text-slate-900 border border-blue-500 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Assign lead engineer..."
                      />
                      {renderInlineEditControls('lead_engineer')}
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('lead_engineer', deployment.lead_engineer)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit lead engineer"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.lead_engineer || <span className="text-slate-400 font-normal italic">Unassigned</span>}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 5: Assisting Engineer(s) */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assisting Engineer(s)</span>
                </div>
                {inlineEditingField === 'assisting_engineers' ? (
                  <div>
                    <div className="flex items-center pt-0.5">
                      <input
                        type="text"
                        autoFocus
                        value={inlineEditingValue}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineEdit('assisting_engineers');
                          if (e.key === 'Escape') handleCancelInlineEdit();
                        }}
                        disabled={isSavingInline}
                        className="w-full text-sm font-semibold text-slate-900 border border-blue-500 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Add assisting engineer(s)..."
                      />
                      {renderInlineEditControls('assisting_engineers')}
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('assisting_engineers', deployment.assisting_engineers)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit assisting engineer(s)"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.assisting_engineers || <span className="text-slate-400 font-normal italic">None</span>}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 6: Datacenter / Location */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Datacenter / Location</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {deployment.location}
                </div>
              </div>

              {/* Field 7: Internal Group */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Internal Group</span>
                </div>
                {inlineEditingField === 'internal_group_name' ? (
                  <div>
                    <div className="flex items-center pt-0.5">
                      <select
                        autoFocus
                        value={inlineEditingValue}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineEdit('internal_group_name');
                          if (e.key === 'Escape') handleCancelInlineEdit();
                        }}
                        disabled={isSavingInline}
                        className="w-full text-sm font-semibold text-slate-900 border border-blue-500 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">None</option>
                        {getFieldOptions('internal_group_name', [
                          'Edge Infrastructure',
                          'Core Platform',
                          'Cloud Ops',
                          'Security Team',
                          'Hardware Lab'
                        ]).map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        {inlineEditingValue && !getFieldOptions('internal_group_name', [
                          'Edge Infrastructure',
                          'Core Platform',
                          'Cloud Ops',
                          'Security Team',
                          'Hardware Lab'
                        ]).includes(inlineEditingValue) && (
                          <option value={inlineEditingValue}>{inlineEditingValue}</option>
                        )}
                      </select>
                      {renderInlineEditControls('internal_group_name')}
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('internal_group_name', deployment.internal_group_name)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit internal group"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.internal_group_name || <span className="text-slate-400 font-normal italic">None</span>}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 8: Deployment Date */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deployment Date</span>
                </div>
                {inlineEditingField === 'deployment_date' ? (
                  <div>
                    <div className="flex items-center pt-0.5">
                      <input
                        type="date"
                        autoFocus
                        value={inlineEditingValue}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineEdit('deployment_date');
                          if (e.key === 'Escape') handleCancelInlineEdit();
                        }}
                        disabled={isSavingInline}
                        className="w-full text-sm font-semibold text-slate-900 border border-blue-500 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {renderInlineEditControls('deployment_date')}
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('deployment_date', deployment.deployment_date)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit deployment date"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {formatDate(deployment.deployment_date || deployment.created_at)}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 9: Company Profile */}
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
                    <div
                      onClick={() => handleStartInlineEdit('customer_name', deployment.customer_name)}
                      className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                      title="Click to edit customer name"
                    >
                      <span className="text-sm font-semibold text-slate-900 truncate">{deployment.customer_name}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  )}
                </div>
              </div>

              {/* Field 10: Deployment Folder */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deployment Folder</span>
                </div>
                {inlineEditingField === 'deployment_folder' ? (
                  <div>
                    <div className="flex items-center pt-0.5">
                      <input
                        type="text"
                        autoFocus
                        value={inlineEditingValue}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineEdit('deployment_folder');
                          if (e.key === 'Escape') handleCancelInlineEdit();
                        }}
                        disabled={isSavingInline}
                        className="w-full text-sm font-semibold text-slate-900 border border-blue-500 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="https://..."
                      />
                      {renderInlineEditControls('deployment_folder')}
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all">
                    {deployment.deployment_folder ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <a
                          href={deployment.deployment_folder.startsWith('http://') || deployment.deployment_folder.startsWith('https://') 
                            ? deployment.deployment_folder 
                            : `https://${deployment.deployment_folder}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50/70 border border-blue-200/80 px-2.5 py-1.5 rounded-lg transition-colors group/link"
                          title={deployment.deployment_folder}
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-blue-600 shrink-0 group-hover/link:scale-105 transition-transform" />
                          <span className="truncate max-w-[170px]">Open OneDrive Folder</span>
                          <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                        </a>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartInlineEdit('deployment_folder', deployment.deployment_folder)}
                        className="text-sm text-slate-400 font-normal italic cursor-pointer flex-1"
                        title="Click to add folder link"
                      >
                        No folder linked
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartInlineEdit('deployment_folder', deployment.deployment_folder)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                      title="Edit folder link"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Field 11: Notes & Technical Specs */}
              <div className="pt-3 space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Notes & Technical Specs</span>
                </div>
                {inlineEditingField === 'notes' ? (
                  <div className="pt-0.5 space-y-1.5">
                    <textarea
                      rows={3}
                      autoFocus
                      value={inlineEditingValue}
                      onChange={(e) => setInlineEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSaveInlineEdit('notes');
                        if (e.key === 'Escape') handleCancelInlineEdit();
                      }}
                      disabled={isSavingInline}
                      className="w-full text-xs text-slate-900 border border-blue-500 rounded-md p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Enter notes & technical specs (Ctrl+Enter to save)..."
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Ctrl+Enter to save, Esc to cancel</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCancelInlineEdit()}
                          disabled={isSavingInline}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineEdit('notes')}
                          disabled={isSavingInline}
                          className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          {isSavingInline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('notes', deployment.notes)}
                    className="group p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all relative"
                    title="Click to edit notes"
                  >
                    {deployment.notes ? (
                      <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded-md border border-slate-200/70 group-hover:border-slate-300">
                        {deployment.notes}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-normal italic flex items-center justify-between">
                        <span>Click to add notes...</span>
                      </div>
                    )}
                    <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                )}
              </div>
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
                {(deployment.status_updated_at || deployment.status_updated_by_name) && (
                  <div className="text-xs text-slate-500 flex items-center space-x-1 pt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      Set {formatDateTime(deployment.status_updated_at)}
                      {deployment.status_updated_by_name ? ` by ${deployment.status_updated_by_name}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stepper Timeline Body */}
            <div className="p-5 sm:p-6 bg-slate-50/50">
              {(() => {
                const rawStatus = deployment.pre_poc_status || 'Planning';
                const statusAliases: Record<string, string> = {
                  Active: 'In Progress',
                };
                const currentStatus = statusOptions.includes(rawStatus)
                  ? rawStatus
                  : statusAliases[rawStatus] && statusOptions.includes(statusAliases[rawStatus])
                  ? statusAliases[rawStatus]
                  : rawStatus;
                const currentStepIndex = Math.max(0, statusOptions.indexOf(currentStatus));
                const isCancelled = currentStatus === 'Cancelled';
                const cancelledIsFirst = statusOptions[0] === 'Cancelled';
                const normalSteps = statusOptions.filter(s => s !== 'Cancelled');
                const currentNormalIndex = normalSteps.indexOf(currentStatus);
                const progressPercent = isCancelled 
                  ? 0 
                  : currentNormalIndex >= 0 && normalSteps.length > 1
                  ? Math.round((currentNormalIndex / (normalSteps.length - 1)) * 100)
                  : 0;
                const segmentColor = 
                  currentStatus === 'Completed' 
                    ? 'bg-emerald-600' 
                    : currentStatus === 'On Hold' 
                    ? 'bg-amber-500' 
                    : 'bg-blue-600';

                return (
                  <div className="space-y-4">
                    {/* Stepper nodes */}
                    <div className="overflow-x-auto pb-2 -mb-2">
                      <div className="min-w-[550px] flex items-start w-full relative px-2 pt-1 pb-2">
                        {statusOptions.map((status, index) => {
                          const isLast = index === statusOptions.length - 1;
                          const isPast = status !== 'Cancelled' && currentStatus !== 'Cancelled' && index < currentStepIndex;
                          const isCurrent = index === currentStepIndex;

                          let circleStyle = 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600';
                          let labelStyle = 'text-slate-400 group-hover:text-slate-600';

                          if (isCurrent) {
                            if (status === 'Cancelled') {
                              circleStyle = 'bg-red-600 text-white ring-4 ring-red-100 ring-offset-1 scale-110 shadow-md';
                              labelStyle = 'text-red-600 font-bold';
                            } else if (status === 'On Hold') {
                              circleStyle = 'bg-amber-500 text-white ring-4 ring-amber-100 ring-offset-1 scale-110 shadow-md';
                              labelStyle = 'text-amber-600 font-bold';
                            } else if (status === 'Completed') {
                              circleStyle = 'bg-emerald-600 text-white ring-4 ring-emerald-100 ring-offset-1 scale-110 shadow-md';
                              labelStyle = 'text-emerald-600 font-bold';
                            } else {
                              circleStyle = 'bg-blue-600 text-white ring-4 ring-blue-100 ring-offset-1 scale-110 shadow-md';
                              labelStyle = 'text-blue-700 font-bold';
                            }
                          } else if (status === 'Cancelled') {
                            circleStyle = 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-red-400 group-hover:text-red-500';
                            labelStyle = 'text-slate-400 group-hover:text-red-500';
                          } else if (isPast) {
                            circleStyle = 'bg-emerald-600 text-white ring-4 ring-emerald-50 group-hover:bg-emerald-700';
                            labelStyle = 'text-slate-800 font-medium';
                          }

                          const stageNumber = cancelledIsFirst ? index : index + 1;
                          const isSegmentActive = cancelledIsFirst
                            ? index > 0 && !isCancelled && currentStepIndex > index
                            : !isCancelled && currentStepIndex > index;

                          return (
                            <div key={status} className="relative flex-1 flex flex-col items-center">
                              {/* Connecting track line to the next node (only rendered between nodes, never outside) */}
                              {!isLast && (
                                <div 
                                  className="absolute top-5 left-1/2 w-full h-1 -z-0 -translate-y-1/2"
                                >
                                  <div className="w-full h-full bg-slate-200">
                                    <div 
                                      className={`h-full transition-all duration-300 ${segmentColor}`}
                                      style={{ width: isSegmentActive ? '100%' : '0%' }}
                                    />
                                  </div>
                                </div>
                              )}

                              <button 
                                type="button"
                                disabled={statusUpdating}
                                onClick={() => handleStatusChange(status)}
                                title={`Set status to ${status}`}
                                className="flex flex-col items-center relative z-10 group cursor-pointer text-center focus:outline-none p-1 rounded-lg transition-all disabled:opacity-50 w-full"
                              >
                                {/* Circle node */}
                                <div 
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${circleStyle}`}
                                >
                                  {status === 'Cancelled' ? (
                                    <X className="w-4 h-4 stroke-[2.5]" />
                                  ) : isPast ? (
                                    <Check className="w-4 h-4 stroke-[2.5]" />
                                  ) : (
                                    <span>{stageNumber}</span>
                                  )}
                                </div>

                                {/* Label */}
                                <div className="mt-2 text-center w-full px-0.5">
                                  <span className={`text-xs block font-semibold transition-colors truncate ${labelStyle}`}>
                                    {status}
                                  </span>
                                  <span className="text-[10px] text-slate-400 hidden sm:block truncate">
                                    {status === 'Cancelled'
                                      ? 'Cancelled'
                                      : isCurrent 
                                      ? (status === 'On Hold' ? 'On Hold' : status === 'Completed' ? 'Completed' : 'Active') 
                                      : isPast 
                                      ? 'Done' 
                                      : `Stage ${stageNumber}`}
                                  </span>
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress summary bar */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 px-1">
                      {isCancelled ? (
                        <span>Status: <strong className="text-red-600 font-semibold">Deployment Cancelled</strong></span>
                      ) : currentNormalIndex < 0 ? (
                        <span>Status: <strong className="text-slate-700 font-semibold">{rawStatus}</strong> (not in configured workflow)</span>
                      ) : (
                        <span>Progress: <strong className="text-slate-700 font-semibold">{progressPercent}%</strong> ({currentNormalIndex + 1} of {normalSteps.length} phases)</span>
                      )}
                    </div>

                    {/* Stage Remarks Notepad Card */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-indigo-600" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Stage Remarks
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (hasUnsavedChanges) {
                              setPendingAction({ type: 'VIEW_HISTORY' });
                            } else {
                              setIsPhaseRemarksHistoryModalOpen(true);
                            }
                          }}
                          className="inline-flex items-center space-x-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:underline cursor-pointer ml-auto"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>View All History</span>
                        </button>
                      </div>

                      {(() => {
                        const currentActiveRemark = phaseRemarks.find(r => !r.is_archived) || null;

                        if (loadingRemarks) {
                          return (
                            <div className="text-center py-6 text-xs text-slate-400">
                              Loading notepad...
                            </div>
                          );
                        }

                        if (isEditingRemark) {
                          return (
                            <div className="bg-white p-4 rounded-xl border-2 border-indigo-500/80 shadow-xs space-y-3 animate-in fade-in duration-150">
                              <textarea
                                autoFocus
                                rows={4}
                                value={remarkEditText}
                                onChange={e => setRemarkEditText(e.target.value)}
                                placeholder="Type stage remarks or technical notes here..."
                                className="w-full text-xs text-slate-800 bg-transparent border-0 focus:ring-0 focus:outline-none resize-y leading-relaxed font-sans placeholder:text-slate-400"
                              />

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                                <span className="text-[11px] text-slate-400">
                                  {currentActiveRemark 
                                    ? 'Saving will update this notepad and archive the previous remark to history.' 
                                    : 'Saving will create the stage notepad.'}
                                </span>
                                <div className="flex items-center space-x-2 ml-auto">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (hasUnsavedChanges) {
                                        setPendingAction({ type: 'CANCEL_EDIT' });
                                      } else {
                                        setIsEditingRemark(false);
                                        setRemarkEditText('');
                                      }
                                    }}
                                    disabled={isSubmittingRemark}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveNotepadRemark}
                                    disabled={isSubmittingRemark || !remarkEditText.trim()}
                                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-2xs transition-all cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isSubmittingRemark ? 'Saving...' : 'Save Remark'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (currentActiveRemark && currentActiveRemark.remark) {
                          return (
                            <div 
                              onClick={() => {
                                setRemarkEditText(currentActiveRemark.remark);
                                setIsEditingRemark(true);
                              }}
                              className="group relative bg-white hover:bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs space-y-2.5"
                              title="Click to edit remark"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <div className="flex items-center space-x-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Last edited by <strong className="text-slate-800 font-semibold">{currentActiveRemark.author_name || 'Team Member'}</strong></span>
                                  <span className="text-slate-300">•</span>
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{formatDateTime(currentActiveRemark.updated_at || currentActiveRemark.created_at)}</span>
                                </div>
                                <span className="text-indigo-600 font-medium flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Pencil className="w-3 h-3" />
                                  <span>Click to edit</span>
                                </span>
                              </div>

                              <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans min-h-[36px]">
                                {currentActiveRemark.remark}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            onClick={() => {
                              setRemarkEditText('');
                              setIsEditingRemark(true);
                            }}
                            className="group relative bg-white hover:bg-indigo-50/30 p-5 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-all cursor-pointer text-center space-y-2 shadow-2xs"
                            title="Click to add remarks"
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center mx-auto transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                No remarks recorded for this stage yet
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Click anywhere here to write notes. Anyone can edit this notepad.
                              </p>
                            </div>
                          </div>
                        );
                      })()}
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
                                    setSelectedVersionCred(cred);
                                    setIsVersionsModalOpen(true);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                                >
                                  <History className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Previous Credentials</span>
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
          onSuccess={(updated: any) => {
            setDeployment((prev: any) => prev ? { ...prev, ...updated } : updated);
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

      {/* Phase Remarks History Modal */}
      {id && deployment && (
        <PhaseRemarksHistoryModal
          isOpen={isPhaseRemarksHistoryModalOpen}
          onClose={() => setIsPhaseRemarksHistoryModalOpen(false)}
          deploymentId={id}
          customerName={deployment.customer_name}
          statusOptions={statusOptions}
        />
      )}

      {/* Credential Versions & Recovery Modal */}
      {selectedVersionCred && (
        <CredentialVersionsModal
          isOpen={isVersionsModalOpen}
          onClose={() => {
            setIsVersionsModalOpen(false);
            setSelectedVersionCred(null);
          }}
          credential={selectedVersionCred}
          onRestored={(updatedCred) => {
            setCredentials(prev => prev.map(c => c.id === updatedCred.id ? { ...c, ...updatedCred } : c));
            if (updatedCred.id) {
              setRevealedCreds(prev => {
                const copy = { ...prev };
                delete copy[updatedCred.id!];
                return copy;
              });
            }
          }}
        />
      )}

      {/* Unsaved Remarks Confirmation Dialog */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">Unsaved Stage Remarks</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You have unsaved changes in your stage remarks. Would you like to save your work before proceeding?
                </p>
              </div>
            </div>

            {remarkEditText.trim() && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 italic max-h-24 overflow-y-auto whitespace-pre-wrap">
                "{remarkEditText}"
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 flex-wrap gap-y-2">
              <button
                type="button"
                onClick={handleCancelPendingAction}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveAndProceed}
                disabled={isSubmittingRemark || !remarkEditText.trim()}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentDetailPage;
