import { SearchableSelect } from "./SearchableSelect";
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Calendar, 
  CheckCircle2,
  FolderOpen,
  Package,
  Wrench,
  Layers,
  Activity,
} from 'lucide-react';
import { 
  updateDeployment, 
  getDeploymentFieldSettings, 
  type DeploymentData,
  type DeploymentFieldsSettings
} from '../api';

interface EditDeploymentModalProps {
  isOpen: boolean;
  deployment: DeploymentData | null;
  onClose: () => void;
  onSuccess: (updated: DeploymentData) => void;
}

export const EditDeploymentModal: React.FC<EditDeploymentModalProps> = ({
  isOpen,
  deployment,
  onClose,
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [deployedProduct, setDeployedProduct] = useState('');
  const [deploymentType, setDeploymentType] = useState('Deployment');
  const [prePocStatus, setPrePocStatus] = useState('Planning');
  const [accountOwner, setAccountOwner] = useState('');
  const [leadEngineer, setLeadEngineer] = useState('');
  const [assistingEngineers, setAssistingEngineers] = useState('');
  const [internalGroupName, setInternalGroupName] = useState('');
  const [deploymentDate, setDeploymentDate] = useState('');
  const [deploymentFolder, setDeploymentFolder] = useState('');
  const [notes, setNotes] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});

  const [typeOptions, setTypeOptions] = useState<string[]>(['Deployment', 'POC']);
  const [statusOptions, setStatusOptions] = useState<string[]>([
    'Cancelled', 'Planning', 'Pre-POC', 'In Progress', 'On Hold', 'Completed'
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DeploymentFieldsSettings | null>(null);

  useEffect(() => {
    if (isOpen) {
      getDeploymentFieldSettings()
        .then(settingsData => {
          setSettings(settingsData);
          const tf = settingsData.fields.find((f: any) => f.key === 'deployment_type');
          if (tf?.options?.length) setTypeOptions(tf.options);
          const sf = settingsData.fields.find((f: any) => f.key === 'pre_poc_status');
          if (sf?.options?.length) setStatusOptions(sf.options);

          const coreKeys = new Set([
            'customer_name', 'location', 'deployed_product', 'deployment_date',
            'deployment_type', 'internal_group_name', 'account_owner',
            'lead_engineer', 'assisting_engineers', 'pre_poc_status', 'notes',
            'deployment_folder'
          ]);
          const initialCustom: Record<string, string> = {};
          settingsData.fields
            .filter((field: any) => field.enabled && !coreKeys.has(field.key))
            .forEach((field: any) => {
              const value = (deployment as Record<string, unknown> | null)?.[field.key];
              initialCustom[field.key] = value !== undefined && value !== null
                ? String(value)
                : field.default_value || '';
            });
          setCustomValues(initialCustom);
          setOtherValues({});
        })
        .catch(() => {});
    }
  }, [isOpen, deployment]);

  useEffect(() => {
    if (deployment && isOpen) {
      setCustomerName(deployment.customer_name || '');
      setLocation(deployment.location || '');
      setDeployedProduct(deployment.deployed_product || 'FieldOps Core Gateway');
      setDeploymentType(deployment.deployment_type || 'Deployment');
      setPrePocStatus(deployment.pre_poc_status || 'Planning');
      setAccountOwner(deployment.account_owner || '');
      setLeadEngineer(deployment.lead_engineer || '');
      setAssistingEngineers(deployment.assisting_engineers || '');
      setInternalGroupName(deployment.internal_group_name || '');
      
      if (deployment.deployment_date) {
        try {
          const d = new Date(deployment.deployment_date);
          if (!isNaN(d.getTime())) {
            setDeploymentDate(d.toISOString().split('T')[0]);
          } else {
            setDeploymentDate('');
          }
        } catch {
          setDeploymentDate('');
        }
      } else {
        setDeploymentDate('');
      }

      setDeploymentFolder(deployment.deployment_folder || '');
      setNotes(deployment.notes || '');
      setError(null);
    }
  }, [deployment, isOpen]);

    const getField = (key: string) => settings?.fields.find((f: any) => f.key === key);

  if (!isOpen || !deployment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Customer / Company name is required.');
      return;
    }
    if (!location.trim()) {
      setError('Location is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: Record<string, any> = {
        customer_name: customerName.trim(),
        location: location.trim(),
        deployed_product: deployedProduct.trim() || undefined,
        deployment_type: deploymentType as any,
        pre_poc_status: prePocStatus,
        account_owner: accountOwner.trim() || undefined,
        lead_engineer: leadEngineer.trim() || undefined,
        assisting_engineers: assistingEngineers.trim() || undefined,
        internal_group_name: internalGroupName.trim() || undefined,
        deployment_date: deploymentDate ? new Date(deploymentDate).toISOString() : undefined,
        deployment_folder: deploymentFolder.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const coreKeys = new Set([
        'customer_name', 'location', 'deployed_product', 'deployment_date',
        'deployment_type', 'internal_group_name', 'account_owner',
        'lead_engineer', 'assisting_engineers', 'pre_poc_status', 'notes',
        'deployment_folder'
      ]);
      (settings?.fields || [])
        .filter(field => field.enabled && !coreKeys.has(field.key))
        .forEach(field => {
          const rawValue = customValues[field.key] ?? '';
          payload[field.key] = (rawValue === 'Other' && otherValues[field.key]?.trim())
            ? otherValues[field.key].trim()
            : rawValue || undefined;
        });

      const updated = await updateDeployment(deployment.id!, payload as Partial<DeploymentData>);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update deployment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Edit Deployment</h3>
              <p className="text-xs text-slate-400">Update deployment details and status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Company / Customer *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Datacenter / Location *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Singapore DC1"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Deployed Product */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Deployed Product
              </label>
              <div className="pl-8">
                <SearchableSelect
                  value={deployedProduct}
                  onChange={(v) => setDeployedProduct(v as string)}
                  options={getField('deployed_product')?.options || ['FieldOps Core Gateway', 'FieldOps Edge Device']}
                  allowOther={getField('deployed_product')?.allow_other ?? true}
                  placeholder="-- Select Product --"
                />
              </div>
            </div>

            {/* Account Owner */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Account Owner
              </label>
              <div className="pl-8">
                <SearchableSelect
                  value={accountOwner}
                  onChange={(v) => setAccountOwner(v as string)}
                  options={getField('account_owner')?.options || []}
                  allowOther={getField('account_owner')?.allow_other ?? true}
                  placeholder={getField('account_owner')?.other_placeholder || "e.g. Sarah Jenkins"}
                />
              </div>
            </div>

            {/* Lead Engineer */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lead Engineer
              </label>
              <div className="relative">
                <Wrench className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={leadEngineer}
                  onChange={e => setLeadEngineer(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Assisting Engineer(s) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assisting Engineer(s)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={assistingEngineers}
                  onChange={e => setAssistingEngineers(e.target.value)}
                  placeholder="e.g. Sarah Miller, David Kim"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Deployment Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Deployment Type
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={deploymentType}
                  onChange={e => setDeploymentType(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {typeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <div className="relative">
                <Activity className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={prePocStatus}
                  onChange={e => setPrePocStatus(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Deployment Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Deployment Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  value={deploymentDate}
                  onChange={e => setDeploymentDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Internal Group Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Internal Group / Project Reference
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={internalGroupName}
                  onChange={e => setInternalGroupName(e.target.value)}
                  placeholder="e.g. prod-sg-cluster-01"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Deployment Folder (OneDrive Link) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Deployment Folder (OneDrive Link)
            </label>
            <div className="relative">
              <FolderOpen className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="url"
                value={deploymentFolder}
                onChange={e => setDeploymentFolder(e.target.value)}
                placeholder="https://onedrive.live.com/... or SharePoint link"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Link to OneDrive / SharePoint folder for configuration files, UAT sign-offs, and backups.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Deployment Notes & Instructions
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Access instructions, maintenance windows, or notes..."
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {settings?.fields
            .filter(field => field.enabled && ![
              'customer_name', 'location', 'deployed_product', 'deployment_date',
              'deployment_type', 'internal_group_name', 'account_owner',
              'lead_engineer', 'assisting_engineers', 'pre_poc_status', 'notes',
              'deployment_folder'
            ].includes(field.key))
            .map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'select' ? (
                  <SearchableSelect
                    value={customValues[field.key] || ''}
                    onChange={value => setCustomValues(prev => ({ ...prev, [field.key]: value as string }))}
                    options={field.options || []}
                    allowOther={field.allow_other ?? false}
                    placeholder={`-- Select ${field.label} --`}
                  />
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={2}
                    required={field.required}
                    value={customValues[field.key] || ''}
                    onChange={event => setCustomValues(prev => ({ ...prev, [field.key]: event.target.value }))}
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    required={field.required}
                    value={customValues[field.key] || ''}
                    onChange={event => setCustomValues(prev => ({ ...prev, [field.key]: event.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            ))}

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDeploymentModal;
