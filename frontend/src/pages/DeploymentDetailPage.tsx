import { useEffect, useState, useRef } from 'react';
import { SearchableSelect } from '../components/SearchableSelect';
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
  Loader2,
  UserCheck,
  Target,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp
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
  getDeploymentExtraItems,
  createDeploymentExtraItem,
  updateDeploymentExtraItem,
  deleteDeploymentExtraItem,
  getLocations,
  type DeploymentData, 
  type CredentialData,
  type PhaseRemarkItem,
  type ExtraItem
} from '../api';
import NewCredentialModal from '../components/NewCredentialModal';
import EditCredentialModal from '../components/EditCredentialModal';
import EditDeploymentModal from '../components/EditDeploymentModal';
import DeploymentActivityModal from '../components/DeploymentActivityModal';
import CredentialAccessLogsModal from '../components/CredentialAccessLogsModal';
import PhaseRemarksHistoryModal from '../components/PhaseRemarksHistoryModal';
import CredentialVersionsModal from '../components/CredentialVersionsModal';

const DEPLOYMENT_STAGES = [
  'Initiated',
  'Device Received',
  'Box Prepared',
  'Kick Off Meeting Done',
  'Deployment in progress',
  'Preparing UAT/FAT/Documentation',
  'Waiting for signature',
  'Complete'
];

const POC_STAGES = [
  'Initiated',
  'Box allocated',
  'Box prepared',
  'Pre-POC Meeting Done',
  'Deployment pending',
  'Deployment in progress',
  'Review Policy',
  'Collect Report',
  'POC Complete',
  'Post POC Meeting',
  'Complete',
  'Change to deployment'
];

export const DeploymentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const clickTimeoutRef = useRef<{ [stageName: string]: any }>({});

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
    | { type: 'CHANGE_STATUS'; status: string; stageKey?: string }
    | { type: 'CANCEL_EDIT' }
    | { type: 'VIEW_HISTORY' }
    | null
  >(null);

  const [fieldSettings, setFieldSettings] = useState<any[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [inlineEditingField, setInlineEditingField] = useState<string | null>(null);
  const [inlineEditingValue, setInlineEditingValue] = useState<any>('');
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [timelineViewMode, setTimelineViewMode] = useState<'focus' | 'vertical' | 'grid'>('focus');
  const [isFocusCompressedExpanded, setIsFocusCompressedExpanded] = useState(false);

  // Extra Items State
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [isExtraItemModalOpen, setIsExtraItemModalOpen] = useState(false);
  const [editingExtraItem, setEditingExtraItem] = useState<ExtraItem | null>(null);
  const [extraItemName, setExtraItemName] = useState('');
  const [extraItemQuantity, setExtraItemQuantity] = useState(1);
  const [extraItemNotes, setExtraItemNotes] = useState('');
  const [isSubmittingExtraItem, setIsSubmittingExtraItem] = useState(false);
  const [extraItemError, setExtraItemError] = useState<string | null>(null);

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
    if (deployment) {
      if (deployment.deployment_type === 'POC') {
        setSelectedPhase('Pre-PoC');
      } else {
        setSelectedPhase('Kick-Off');
      }
    }
  }, [deployment?.deployment_type]);

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
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.code === 'ECONNABORTED' || err?.message === 'canceled' || err?.message === 'Request aborted') {
        return;
      }
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

      try {
        const itemData = await getDeploymentExtraItems(id);
        setExtraItems(itemData || []);
      } catch (itemErr) {
        console.warn('Could not load extra items for deployment:', itemErr);
        setExtraItems([]);
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.code === 'ECONNABORTED' || err?.message === 'canceled' || err?.message === 'Request aborted') {
        return;
      }
      console.error('Failed to fetch deployment details', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddExtraItemModal = () => {
    setEditingExtraItem(null);
    setExtraItemName('');
    setExtraItemQuantity(1);
    setExtraItemNotes('');
    setExtraItemError(null);
    setIsExtraItemModalOpen(true);
  };

  const handleOpenEditExtraItemModal = (item: ExtraItem) => {
    setEditingExtraItem(item);
    setExtraItemName(item.item_name);
    setExtraItemQuantity(item.quantity);
    setExtraItemNotes(item.notes || '');
    setExtraItemError(null);
    setIsExtraItemModalOpen(true);
  };

  const handleSaveExtraItem = async () => {
    if (!id || !extraItemName.trim()) {
      setExtraItemError('Please select or enter an item name.');
      return;
    }
    if (extraItemQuantity <= 0) {
      setExtraItemError('Quantity must be at least 1.');
      return;
    }

    try {
      setIsSubmittingExtraItem(true);
      setExtraItemError(null);
      if (editingExtraItem) {
        await updateDeploymentExtraItem(id, editingExtraItem.id, {
          item_name: extraItemName.trim(),
          quantity: Number(extraItemQuantity),
          notes: extraItemNotes.trim() || undefined
        });
      } else {
        await createDeploymentExtraItem(id, {
          item_name: extraItemName.trim(),
          quantity: Number(extraItemQuantity),
          notes: extraItemNotes.trim() || undefined
        });
      }
      setIsExtraItemModalOpen(false);
      setEditingExtraItem(null);
      const updatedList = await getDeploymentExtraItems(id);
      setExtraItems(updatedList || []);
    } catch (err: any) {
      setExtraItemError(err?.response?.data?.detail || 'Failed to save extra item.');
    } finally {
      setIsSubmittingExtraItem(false);
    }
  };

  const handleDeleteExtraItem = async (itemId: string) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDeploymentExtraItem(id, itemId);
      setExtraItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete extra item.');
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
    getLocations().then((locs: any) => {
      if (Array.isArray(locs)) {
        const names = locs.map((l: any) => l.name).filter(Boolean);
        setLocationOptions(Array.from(new Set(names)));
      }
    }).catch(() => {});
  }, [id]);

  const getFieldOptions = (key: string, fallback: string[]) => {
    const f = fieldSettings.find((field: any) => field.key === key);
    return (f?.options && f.options.length > 0) ? f.options : fallback;
  };

  const handleStartInlineEdit = (fieldKey: string, initialValue: any) => {
    setInlineEditingField(fieldKey);
    let val: any = '';
    if (['deployment_date', 'kickoff_date', 'end_date'].includes(fieldKey)) {
      if (initialValue) {
        try {
          const d = new Date(initialValue);
          val = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
        } catch {
          val = '';
        }
      }
    } else if (fieldKey === 'assisting_engineers') {
      val = initialValue ? (typeof initialValue === 'string' ? initialValue.split(', ').filter(Boolean) : initialValue) : [];
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

  const handleSaveInlineEdit = async (fieldKey: string, newValue?: any, keepOpen: boolean = false) => {
    if (!id || !deployment) return;
    setInlineError(null);

    const valToUse = newValue !== undefined ? newValue : inlineEditingValue;

    try {
      setIsSavingInline(true);
      let payloadValue: any = null;
      if (Array.isArray(valToUse)) {
        payloadValue = valToUse.length > 0 ? valToUse.join(', ') : null;
      } else {
        const strVal = typeof valToUse === 'string' ? valToUse : String(valToUse || '');
        const trimmed = strVal.trim();
        if (['deployment_date', 'kickoff_date', 'end_date'].includes(fieldKey)) {
          payloadValue = trimmed ? new Date(trimmed).toISOString() : null;
        } else if (!trimmed) {
          payloadValue = null;
        } else {
          payloadValue = trimmed;
        }
      }

      const updated = await updateDeployment(id, { [fieldKey]: payloadValue });
      setDeployment((prev: any) => prev ? { ...prev, ...updated } : updated);
      if (!keepOpen) {
        setInlineEditingField(null);
        setInlineEditingValue('');
      }
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

  const executeStatusChange = async (stageKey: string, newStatus: string) => {
    if (!id || !deployment) return;
    try {
      setStatusUpdating(true);
      const updated = await updateDeployment(id, { [stageKey]: newStatus });
      setDeployment((prev: any) => prev ? { ...prev, ...updated } : updated);
    } catch (err) {
      alert('Failed to update stage status');
    } finally {
      setStatusUpdating(false);
    }
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
        await executeStatusChange(pendingAction.stageKey || 'pre_poc_status', pendingAction.status);
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
      executeStatusChange(pendingAction.stageKey || 'pre_poc_status', pendingAction.status);
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
        {/* Left Column (1/3): Deployment Info Card (Sticky on scroll) */}
        <div className="sm:col-span-1 space-y-6 min-w-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
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
                    <div className="pt-0.5">
                      <SearchableSelect
                        value={inlineEditingValue}
                        onChange={(val) => {
                          setInlineEditingValue(val);
                          handleSaveInlineEdit('deployed_product', val);
                        }}
                        options={getFieldOptions('deployed_product', [
                          'FieldOps Core Gateway',
                          'Edge Compute Appliance X1',
                          'Secure Access Service Edge (SASE)',
                          'AI Inference Node Enterprise',
                          'Zero Trust Network Connector'
                        ])}
                        allowOther={true}
                        placeholder="-- Select Product --"
                      />
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
                    <div className="pt-0.5">
                      <SearchableSelect
                        value={inlineEditingValue}
                        onChange={(val) => {
                          setInlineEditingValue(val);
                          handleSaveInlineEdit('deployment_type', val);
                        }}
                        options={getFieldOptions('deployment_type', ['Deployment', 'POC', 'Pilot', 'Trial', 'Staging'])}
                        allowOther={true}
                        placeholder="-- Select Deployment Type --"
                      />
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
                    <div className="pt-0.5">
                      <SearchableSelect
                        value={inlineEditingValue}
                        onChange={(val) => {
                          setInlineEditingValue(val);
                          handleSaveInlineEdit('account_owner', val);
                        }}
                        options={getFieldOptions('account_owner', [
                          'Sarah Jenkins (Account Lead)',
                          'Alex Rivera (Customer Success)',
                          'Marcus Vance (Enterprise Sales)',
                          'Elena Rostova (Client Executive)'
                        ])}
                        allowOther={true}
                        placeholder="Select or type account owner..."
                      />
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
                    <div className="pt-0.5">
                      <SearchableSelect
                        value={inlineEditingValue}
                        onChange={(val) => {
                          setInlineEditingValue(val);
                          handleSaveInlineEdit('lead_engineer', val);
                        }}
                        options={getFieldOptions('lead_engineer', [
                          'Michael Chang (Principal Engineer)',
                          'David Kim (Senior Systems Architect)',
                          'Priya Patel (Lead Field Engineer)',
                          'James Wilson (Deployment Lead)'
                        ])}
                        allowOther={true}
                        placeholder="Select or type lead engineer..."
                      />
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
                    <div className="pt-0.5">
                      <SearchableSelect
                        multiple
                        value={Array.isArray(inlineEditingValue) ? inlineEditingValue : (inlineEditingValue ? String(inlineEditingValue).split(', ').filter(Boolean) : [])}
                        onChange={(val) => {
                          setInlineEditingValue(val);
                          handleSaveInlineEdit('assisting_engineers', val, true);
                        }}
                        onOutsideClick={() => {
                          setInlineEditingField(null);
                          setInlineEditingValue('');
                        }}
                        options={getFieldOptions('assisting_engineers', [
                          'Sarah Miller (Field Specialist)',
                          'David Kim (Senior Systems Architect)',
                          'Rachel Adams (Network Engineer)',
                          "Liam O'Connor (Infrastructure Tech)"
                        ])}
                        allowOther={true}
                        placeholder="Select or type assisting engineer(s)..."
                      />
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('assisting_engineers', deployment.assisting_engineers)}
                    className="group flex items-start justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit assisting engineer(s)"
                  >
                    <div className="flex-1 space-y-1">
                      {deployment.assisting_engineers ? (
                        deployment.assisting_engineers.split(', ').filter(Boolean).map((eng: string) => (
                          <div key={eng} className="text-sm font-semibold text-slate-900 flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 inline-block" />
                            <span className="break-words">{eng}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 font-normal italic text-sm">None</span>
                      )}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                )}
              </div>

              {/* Field 6: Datacenter / Location */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Datacenter / Location</span>
                </div>
                {inlineEditingField === 'location' ? (
                  <div>
                    <div className="pt-0.5">
                      <SearchableSelect
                        value={inlineEditingValue}
                        onChange={(val) => {
                          setInlineEditingValue(val);
                          handleSaveInlineEdit('location', val);
                        }}
                        options={locationOptions}
                        allowOther={true}
                        placeholder="Select or type location..."
                      />
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('location', deployment.location)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit location"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.location || <span className="text-slate-400 font-normal italic">Click to set location...</span>}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 7: Internal Group */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Internal Group</span>
                </div>
                {inlineEditingField === 'internal_group_name' ? (
                  <div>
                    <div className="pt-0.5">
                      <SearchableSelect
                        value={inlineEditingValue}
                        onChange={(val) => {
                          setInlineEditingValue(val);
                          handleSaveInlineEdit('internal_group_name', val);
                        }}
                        options={getFieldOptions('internal_group_name', [
                          'Edge Infrastructure',
                          'Core Platform',
                          'Cloud Ops',
                          'Security Team',
                          'Hardware Lab'
                        ])}
                        allowOther={true}
                        placeholder="-- Select Internal Group --"
                      />
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

              {/* Field 8: Deployment & End Dates */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deployment & End Dates</span>
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
                      {deployment.end_date ? ` → ${formatDate(deployment.end_date)}` : ''}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 8.5: Kick-Off Date */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>Kick-Off Date</span>
                </div>
                {inlineEditingField === 'kickoff_date' ? (
                  <div>
                    <div className="flex items-center pt-0.5">
                      <input
                        type="date"
                        autoFocus
                        value={inlineEditingValue}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineEdit('kickoff_date');
                          if (e.key === 'Escape') handleCancelInlineEdit();
                        }}
                        disabled={isSavingInline}
                        className="w-full text-sm font-semibold text-slate-900 border border-blue-500 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {renderInlineEditControls('kickoff_date')}
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('kickoff_date', deployment.kickoff_date)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit kick-off date"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.kickoff_date ? formatDate(deployment.kickoff_date) : <span className="text-slate-400 font-normal italic">Not set</span>}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 8.6: Validated By */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Validated By</span>
                </div>
                {inlineEditingField === 'validated_by' ? (
                  <div>
                    <div className="pt-0.5">
                      <SearchableSelect
                        value={inlineEditingValue}
                        onChange={(val) => {
                          setInlineEditingValue(val);
                          handleSaveInlineEdit('validated_by', val);
                        }}
                        options={getFieldOptions('validated_by', [
                          'Kah Meng',
                          'Michael Chang',
                          'Sarah Jenkins',
                          'Alex Rivera'
                        ])}
                        allowOther={true}
                        placeholder="Select or type validator name..."
                      />
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('validated_by', deployment.validated_by)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit validator"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.validated_by || <span className="text-slate-400 font-normal italic">Not validated</span>}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 8.7: Device Status */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  <span>Device Status</span>
                </div>
                {inlineEditingField === 'device_status' ? (
                  <div>
                    <div className="pt-0.5">
                      <SearchableSelect
                        value={inlineEditingValue}
                        onChange={(val) => {
                          setInlineEditingValue(val);
                          handleSaveInlineEdit('device_status', val);
                        }}
                        options={getFieldOptions('device_status', [
                          'Initiated',
                          'Box Received',
                          'Box Allocated',
                          'Box Prepared',
                          'Deployment Pending',
                          'Deployed / In Progress',
                          'Pending Collection',
                          'Collected',
                          'Returned to Office',
                          'In Storage',
                          'Decommissioned'
                        ])}
                        allowOther={true}
                        placeholder="Select or type device status..."
                      />
                    </div>
                    {inlineError && <p className="text-xs text-red-600 mt-1">{inlineError}</p>}
                  </div>
                ) : (
                  <div
                    onClick={() => handleStartInlineEdit('device_status', deployment.device_status)}
                    className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                    title="Click to edit device status"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {deployment.device_status ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {deployment.device_status}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Not set</span>
                      )}
                    </div>
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
              </div>

              {/* Field 8.8: Equipment Collected */}
              <div className="space-y-1 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span>Equipment Collected (Physical)</span>
                </div>
                <div
                  onClick={async () => {
                    const nextState = !deployment.collected;
                    await handleSaveInlineEdit('collected', nextState);
                  }}
                  className="group flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/80 cursor-pointer transition-all"
                  title="Click to toggle equipment collected status"
                >
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shadow-2xs transition-all ${
                      deployment.collected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}>
                      {deployment.collected ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span>{deployment.collected ? 'Yes (Collected)' : 'No (Pending Collection)'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 italic font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                      (Click to toggle)
                    </span>
                  </div>
                  <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
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
            <div className="p-5 sm:p-6 bg-slate-50/50 space-y-6">
              {(() => {
                const isPoc = deployment.deployment_type === 'POC';
                const stages = isPoc ? POC_STAGES : DEPLOYMENT_STAGES;
                const stageStatuses = deployment.stage_statuses || {};

                const getStageStatus = (stgName: string): 'complete' | 'pending' | 'not_started' => {
                  if (stageStatuses[stgName]) {
                    const val = stageStatuses[stgName].toLowerCase();
                    if (val === 'complete' || val === 'done' || val === 'completed') return 'complete';
                    if (val === 'pending' || val === 'in progress' || val === 'in_progress') return 'pending';
                    return 'not_started';
                  }
                  // Fallbacks if stage_statuses map isn't set yet for this key
                  if (isPoc) {
                    if (stgName === 'Pre-POC Meeting Done' && ['done', 'complete'].includes((deployment.pre_poc_status || '').toLowerCase())) return 'complete';
                    if (stgName === 'Deployment in progress' && ['done', 'complete', 'in progress'].includes((deployment.poc_status || '').toLowerCase())) return deployment.poc_status === 'Done' ? 'complete' : 'pending';
                    if (stgName === 'Post POC Meeting' && ['done', 'complete'].includes((deployment.post_poc_status || '').toLowerCase())) return 'complete';
                  } else {
                    if (stgName === 'Kick Off Meeting Done' && ['done', 'complete'].includes((deployment.kickoff_status || '').toLowerCase())) return 'complete';
                    if (stgName === 'Box Prepared' && ['done', 'complete'].includes((deployment.materials_status || '').toLowerCase())) return 'complete';
                    if (stgName === 'Preparing UAT/FAT/Documentation' && ['done', 'complete'].includes((deployment.uat_fat_status || '').toLowerCase())) return 'complete';
                  }
                  if (stgName === 'Initiated') return 'complete';
                  return 'not_started';
                };

                const completedCount = stages.filter(s => getStageStatus(s) === 'complete').length;
                const progressPercent = Math.round((completedCount / stages.length) * 100);

                const handleStageStatusChange = async (targetStage: string, newStatus: string, autoFillPreceding: boolean = true) => {
                  const targetIdx = stages.indexOf(targetStage);
                  if (targetIdx === -1) return;
                  const newMap = { ...stageStatuses };

                  if (newStatus === 'complete') {
                    if (autoFillPreceding) {
                      for (let i = 0; i <= targetIdx; i++) {
                        newMap[stages[i]] = 'complete';
                      }
                    } else {
                      newMap[targetStage] = 'complete';
                    }
                  } else {
                    // When setting a stage to incomplete (not_started or pending),
                    // mark this stage and reset all succeeding stages to not_started
                    newMap[targetStage] = newStatus;
                    for (let i = targetIdx + 1; i < stages.length; i++) {
                      newMap[stages[i]] = 'not_started';
                    }
                  }

                  try {
                    setStatusUpdating(true);
                    const updated = await updateDeployment(id!, { stage_statuses: newMap });
                    setDeployment((prev: any) => prev ? { ...prev, ...updated } : updated);
                  } catch (err) {
                    alert('Failed to update stage status');
                  } finally {
                    setStatusUpdating(false);
                  }
                };

                const handleNodeClick = (stgName: string) => {
                  setSelectedPhase(stgName);

                  if (clickTimeoutRef.current[stgName]) {
                    // Double click detected!
                    clearTimeout(clickTimeoutRef.current[stgName]);
                    clickTimeoutRef.current[stgName] = null;
                    handleStageStatusChange(stgName, 'complete', true);
                  } else {
                    // Single click timer
                    clickTimeoutRef.current[stgName] = setTimeout(() => {
                      clickTimeoutRef.current[stgName] = null;
                      const currentSt = getStageStatus(stgName);
                      const nextSt = currentSt === 'pending' ? 'not_started' : 'pending';
                      handleStageStatusChange(stgName, nextSt, false);
                    }, 250);
                  }
                };

                return (
                  <div className="space-y-6">
                    {/* Refactored Progress & Timeline Track */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-5">
                      {/* Summary & View Toggle Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                            {progressPercent}%
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Overall Timeline Completion
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {completedCount} of {stages.length} stages completed
                            </div>
                          </div>
                        </div>

                        {/* View Switcher Tabs (Icon-only on constrained screens, text on xl+) */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setTimelineViewMode('focus');
                              const pendingIdx = stages.findIndex(s => getStageStatus(s) === 'pending');
                              const targetIdx = pendingIdx !== -1 ? pendingIdx : stages.findIndex(s => getStageStatus(s) === 'not_started');
                              if (targetIdx !== -1 && stages[targetIdx]) {
                                setSelectedPhase(stages[targetIdx]);
                              }
                            }}
                            title="Focus View"
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                              timelineViewMode === 'focus'
                                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Target className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="hidden xl:inline">Focus View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTimelineViewMode('vertical')}
                            title="Vertical Stepper"
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                              timelineViewMode === 'vertical'
                                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden xl:inline">Vertical Stepper</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTimelineViewMode('grid')}
                            title="Stage Cards"
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                              timelineViewMode === 'grid'
                                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Package className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden xl:inline">Stage Cards</span>
                          </button>
                        </div>
                      </div>

                      {/* Top Overall Fill Progress Bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500 rounded-full" 
                          style={{ width: `${progressPercent}%` }} 
                        />
                      </div>

                      {/* MODE 1: VERTICAL STEPPER TIMELINE */}
                      {timelineViewMode === 'vertical' && (
                        <div className="relative pl-6 sm:pl-8 space-y-3 pt-2">
                          {/* Continuous Vertical Connector Line */}
                          <div className="absolute left-[15px] sm:left-[23px] top-4 bottom-6 w-0.5 bg-slate-200 -z-0" />

                          {stages.map((stgName, index) => {
                            const stStatus = getStageStatus(stgName);
                            const isSelected = selectedPhase === stgName;
                            const isComplete = stStatus === 'complete';
                            const isPending = stStatus === 'pending';

                            return (
                              <div
                                key={stgName}
                                onClick={() => setSelectedPhase(stgName)}
                                className={`group relative flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                                    : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                {/* Step Circle Badge */}
                                <div className="flex items-center space-x-3.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNodeClick(stgName);
                                    }}
                                    disabled={statusUpdating}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shrink-0 cursor-pointer -ml-8 sm:-ml-10.5 z-10 ${
                                      isComplete
                                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 hover:bg-emerald-700 shadow-xs'
                                        : isPending
                                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-105 shadow-md animate-pulse'
                                        : 'bg-white border-2 border-slate-300 text-slate-500 hover:border-blue-400'
                                    }`}
                                    title="Click once: Pending | Double-click: Complete"
                                  >
                                    {isComplete ? (
                                      <Check className="w-4 h-4 stroke-[2.5]" />
                                    ) : isPending ? (
                                      <Clock className="w-4 h-4" />
                                    ) : (
                                      <span>{index + 1}</span>
                                    )}
                                  </button>

                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-xs font-bold leading-tight ${
                                        isSelected ? 'text-blue-900 font-extrabold' : isComplete ? 'text-slate-800 font-semibold' : isPending ? 'text-blue-600 font-bold' : 'text-slate-600'
                                      }`}>
                                        {index + 1}. {stgName}
                                      </span>
                                      {isSelected && (
                                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                                          Selected Phase
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Status Selector Pill */}
                                <div className="shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={stStatus}
                                    disabled={statusUpdating}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleStageStatusChange(stgName, e.target.value, e.target.value === 'complete');
                                    }}
                                    className={`text-xs font-semibold py-1 px-2.5 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                                      isComplete
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                                        : isPending
                                        ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                                        : 'bg-slate-100 text-slate-600 border-slate-300'
                                    }`}
                                  >
                                    <option value="not_started">Not Started</option>
                                    <option value="pending">Pending</option>
                                    <option value="complete">Complete</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* MODE 2: STEP STAGE CARDS GRID */}
                      {timelineViewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          {stages.map((stgName, index) => {
                            const stStatus = getStageStatus(stgName);
                            const isSelected = selectedPhase === stgName;
                            const isComplete = stStatus === 'complete';
                            const isPending = stStatus === 'pending';

                            return (
                              <div
                                key={stgName}
                                onClick={() => setSelectedPhase(stgName)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-3 ${
                                  isSelected
                                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                                    : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleNodeClick(stgName);
                                      }}
                                      disabled={statusUpdating}
                                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shrink-0 cursor-pointer ${
                                        isComplete
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : isPending
                                          ? 'bg-blue-600 text-white shadow-md animate-pulse'
                                          : 'bg-white border-2 border-slate-300 text-slate-500'
                                      }`}
                                    >
                                      {isComplete ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : isPending ? <Clock className="w-3.5 h-3.5" /> : <span>{index + 1}</span>}
                                    </button>
                                    <span className="text-xs font-bold text-slate-800">
                                      {index + 1}. {stgName}
                                    </span>
                                  </div>

                                  <div onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={stStatus}
                                      disabled={statusUpdating}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleStageStatusChange(stgName, e.target.value, e.target.value === 'complete');
                                      }}
                                      className={`text-[11px] font-semibold py-0.5 px-2 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                                        isComplete
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                                          : isPending
                                          ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                                          : 'bg-slate-100 text-slate-600 border-slate-300'
                                      }`}
                                    >
                                      <option value="not_started">Not Started</option>
                                      <option value="pending">Pending</option>
                                      <option value="complete">Complete</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* MODE 3: FOCUS VIEW */}
                      {timelineViewMode === 'focus' && (() => {
                        const activeStageIndex = (() => {
                          const pendingIdx = stages.findIndex(s => getStageStatus(s) === 'pending');
                          if (pendingIdx !== -1) return pendingIdx;
                          const notStartedIdx = stages.findIndex(s => getStageStatus(s) === 'not_started');
                          if (notStartedIdx !== -1) return notStartedIdx;
                          return Math.max(0, stages.length - 1);
                        })();

                        const currentFocusedIndex = (() => {
                          const idx = stages.indexOf(selectedPhase);
                          return idx !== -1 ? idx : activeStageIndex;
                        })();

                        const focusedStageName = stages[currentFocusedIndex] || stages[0];
                        const focusedStatus = getStageStatus(focusedStageName);

                        return (
                          <div className="space-y-4 pt-2 min-w-0">
                            {/* Compressed Horizontal Stepper Strip */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  All Stages (Compressed)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsFocusCompressedExpanded(!isFocusCompressedExpanded)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 cursor-pointer shrink-0"
                                >
                                  <span>{isFocusCompressedExpanded ? 'Hide Full List' : `View All (${stages.length})`}</span>
                                  {isFocusCompressedExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>

                              {/* Mini Horizontal Breadcrumb Bar */}
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                                {stages.map((stgName, idx) => {
                                  const st = getStageStatus(stgName);
                                  const isFocused = selectedPhase === stgName;
                                  const isDone = st === 'complete';
                                  const isPending = st === 'pending';

                                  return (
                                    <button
                                      key={stgName}
                                      type="button"
                                      onClick={() => setSelectedPhase(stgName)}
                                      className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                                        isFocused
                                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-400/30 font-bold'
                                          : isDone
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                          : isPending
                                          ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 font-bold'
                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                      title={`Stage ${idx + 1}: ${stgName} (${st})`}
                                    >
                                      {isDone ? (
                                        <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                                      ) : isPending ? (
                                        <Clock className="w-3.5 h-3.5 shrink-0" />
                                      ) : (
                                        <span className="text-[10px] font-bold opacity-75 shrink-0">{idx + 1}</span>
                                      )}
                                      <span className="truncate max-w-[130px]">{stgName}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Expanded Compressed Stages List */}
                              {isFocusCompressedExpanded && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                                  {stages.map((stgName, idx) => {
                                    const st = getStageStatus(stgName);
                                    const isFocused = selectedPhase === stgName;

                                    return (
                                      <div
                                        key={stgName}
                                        onClick={() => setSelectedPhase(stgName)}
                                        className={`p-2 rounded-lg text-xs flex items-center justify-between border cursor-pointer transition-all ${
                                          isFocused ? 'bg-blue-50 border-blue-400 font-bold text-blue-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2 truncate">
                                          <span className="font-bold text-slate-400 w-4">{idx + 1}.</span>
                                          <span className="truncate">{stgName}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          st === 'complete' ? 'bg-emerald-100 text-emerald-800' : st === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                          {st === 'complete' ? 'Done' : st === 'pending' ? 'In Progress' : 'Not Started'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Focused Active Stage Hero Card */}
                            <div className="bg-gradient-to-b from-blue-50/70 via-white to-white rounded-2xl border-2 border-blue-400/80 p-5 sm:p-6 shadow-xs space-y-5">
                              {/* Pill: Current Progress */}
                              <div className="flex items-center">
                                <span className="px-3 py-1 text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 rounded-full uppercase tracking-wider flex items-center space-x-1.5 shadow-2xs">
                                  <Target className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Current Progress</span>
                                </span>
                              </div>

                              {/* Stage Title and Dropdown Below */}
                              <div className="space-y-3">
                                <h3 className="text-xl font-extrabold text-slate-900">
                                  {currentFocusedIndex + 1}. {focusedStageName}
                                </h3>

                                {/* Status Dropdown Only (Below Stage Name) */}
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-slate-500 font-semibold">Status:</span>
                                  <select
                                    value={focusedStatus}
                                    disabled={statusUpdating}
                                    onChange={(e) => {
                                      handleStageStatusChange(focusedStageName, e.target.value, e.target.value === 'complete');
                                    }}
                                    className={`text-xs font-extrabold py-1.5 px-3 rounded-xl border shadow-2xs cursor-pointer focus:outline-none transition-colors ${
                                      focusedStatus === 'complete'
                                        ? 'bg-emerald-600 text-white border-emerald-700'
                                        : focusedStatus === 'pending'
                                        ? 'bg-blue-600 text-white border-blue-700'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <option value="not_started">Not Started</option>
                                    <option value="pending">Pending / In Progress</option>
                                    <option value="complete">Complete</option>
                                  </select>
                                </div>
                              </div>

                              {/* Navigation Controls: Prev on left, Page info centered, Next on right */}
                              <div className="flex items-center justify-between pt-4 border-t border-blue-100">
                                {/* Prev Button (Left Aligned) */}
                                <div>
                                  <button
                                    type="button"
                                    disabled={currentFocusedIndex === 0}
                                    onClick={() => {
                                      if (currentFocusedIndex > 0) {
                                        setSelectedPhase(stages[currentFocusedIndex - 1]);
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 text-xs font-semibold shadow-2xs"
                                    title="Previous Stage"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Prev</span>
                                  </button>
                                </div>

                                {/* Page Info (Center Aligned) */}
                                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-1 rounded-full border border-slate-200/80">
                                  Stage {currentFocusedIndex + 1} of {stages.length}
                                </div>

                                {/* Next Button (Right Aligned) */}
                                <div>
                                  <button
                                    type="button"
                                    disabled={currentFocusedIndex === stages.length - 1}
                                    onClick={() => {
                                      if (currentFocusedIndex < stages.length - 1) {
                                        setSelectedPhase(stages[currentFocusedIndex + 1]);
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 text-xs font-semibold shadow-2xs"
                                    title="Next Stage"
                                  >
                                    <span>Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Footer Info */}
                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                        <span className="text-[11px] text-slate-400 italic">
                          Click stage row to select phase for remarks | Click status dropdown to update
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

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

          {/* Extra Items & Hardware Accessories Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span>Extra Items & Hardware Accessories</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track associated cables, transceivers, rail kits, and hardware accessories for this deployment.
                </p>
              </div>
              <button
                onClick={handleOpenAddExtraItemModal}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Extra Item</span>
              </button>
            </div>

            {/* Extra Items Table / List */}
            <div>
              {extraItems.length === 0 ? (
                <div className="p-10 text-center">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No extra items recorded</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Add hardware accessories, spare cables, or transceivers required for this installation.
                  </p>
                  <button
                    onClick={handleOpenAddExtraItemModal}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Item</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4 text-center">Quantity</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      {extraItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900">{item.item_name}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {item.notes || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditExtraItemModal(item)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Edit item"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExtraItem(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Delete item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

      {/* Add / Edit Extra Item Modal */}
      {isExtraItemModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span>{editingExtraItem ? 'Edit Extra Item' : 'Add Extra Item'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExtraItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {extraItemError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {extraItemError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Item Name Searchable Select */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Item <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={extraItemName}
                  onChange={(val) => setExtraItemName(Array.isArray(val) ? val[0] || '' : val)}
                  options={getFieldOptions('extra_item_options', [
                    '10G SFP+ SR Transceiver Module',
                    '10G SFP+ LR Transceiver Module',
                    '1G SFP RJ45 Copper Transceiver Module',
                    'DAC 10G Passive Direct Attach Cable (1m)',
                    'DAC 10G Passive Direct Attach Cable (3m)',
                    'Fiber Patch Cord LC-LC Duplex OM4 (5m)',
                    'Cat6A Shielded Ethernet Cable (3m)',
                    'Cat6A Shielded Ethernet Cable (10m)',
                    'Rack Mount Rail Kit 1U',
                    'Dual AC Power Supply Module'
                  ])}
                  placeholder="Select or enter item name..."
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={extraItemQuantity}
                  onChange={(e) => setExtraItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Notes / Specification (Optional)
                </label>
                <textarea
                  rows={2}
                  value={extraItemNotes}
                  onChange={(e) => setExtraItemNotes(e.target.value)}
                  placeholder="Additional details (e.g. Serial #, port destination)..."
                  className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExtraItemModalOpen(false)}
                disabled={isSubmittingExtraItem}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExtraItem}
                disabled={isSubmittingExtraItem}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                {isSubmittingExtraItem ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isSubmittingExtraItem ? 'Saving...' : 'Save Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentDetailPage;
