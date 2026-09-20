import React, { useState, useEffect } from 'react';
import { X, Server, Building2, MapPin, Tag, FileText, CheckCircle, Users } from 'lucide-react';
import { 
  createDeployment, 
  getDeploymentFieldSettings, 
  type DeploymentData, 
  type DeploymentFieldsSettings,
  type DeploymentFieldConfig
} from '../api';

interface NewDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deployment: DeploymentData) => void;
}

export const NewDeploymentModal: React.FC<NewDeploymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [settings, setSettings] = useState<DeploymentFieldsSettings | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [deploymentType, setDeploymentType] = useState('Deployment');
  const [internalGroupName, setInternalGroupName] = useState('');
  const [status, setStatus] = useState('Planning');
  const [notes, setNotes] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings when modal is opened
  useEffect(() => {
    if (isOpen) {
      getDeploymentFieldSettings()
        .then(data => {
          setSettings(data);
          
          // Pre-populate default values from settings
          const fields = data.fields || [];
          const typeField = fields.find(f => f.key === 'deployment_type');
          const groupField = fields.find(f => f.key === 'internal_group_name');
          const statusField = fields.find(f => f.key === 'pre_poc_status');
          const locField = fields.find(f => f.key === 'location');
          const notesField = fields.find(f => f.key === 'notes');

          if (typeField?.default_value) setDeploymentType(typeField.default_value);
          else if (typeField?.options?.length) setDeploymentType(typeField.options[0]);

          if (groupField?.default_value) setInternalGroupName(groupField.default_value);
          else if (groupField?.options?.length) setInternalGroupName(groupField.options[0]);

          if (statusField?.default_value) setStatus(statusField.default_value);
          else if (statusField?.options?.length) setStatus(statusField.options[0]);

          if (locField?.default_value) setLocation(locField.default_value);
          if (notesField?.default_value) setNotes(notesField.default_value);

          // Initialize custom fields default values
          const initialCustom: Record<string, string> = {};
          fields.filter(f => f.key.startsWith('custom_')).forEach(f => {
            initialCustom[f.key] = f.default_value || (f.options?.length ? f.options[0] : '');
          });
          setCustomValues(initialCustom);
        })
        .catch(() => {
          // Fallback if settings endpoint fails
          setDeploymentType('Deployment');
          setStatus('Planning');
        });
    } else {
      // Reset form on close
      setCustomerName('');
      setLocation('');
      setInternalGroupName('');
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getField = (key: string): DeploymentFieldConfig | undefined => {
    return settings?.fields.find(f => f.key === key);
  };

  const isFieldEnabled = (key: string, defaultEnabled = true): boolean => {
    const f = getField(key);
    return f ? f.enabled : defaultEnabled;
  };

  const isFieldRequired = (key: string, defaultRequired = false): boolean => {
    const f = getField(key);
    return f ? f.required : defaultRequired;
  };

  const customFields = (settings?.fields || []).filter(
    f => f.key.startsWith('custom_') && f.enabled
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }

    if (isFieldEnabled('location') && isFieldRequired('location', true) && !location.trim()) {
      setError('Location is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Append any custom fields to notes if present
      let finalNotes = notes.trim();
      if (customFields.length > 0) {
        const customDetails = customFields
          .map(cf => `${cf.label}: ${customValues[cf.key] || 'N/A'}`)
          .join('\n');
        finalNotes = finalNotes ? `${finalNotes}\n\n[Custom Fields]\n${customDetails}` : `[Custom Fields]\n${customDetails}`;
      }

      const payload: Partial<DeploymentData> = {
        customer_name: customerName.trim(),
        location: isFieldEnabled('location') ? location.trim() : 'N/A',
        deployment_type: (isFieldEnabled('deployment_type') ? deploymentType : 'Deployment') as any,
        internal_group_name: isFieldEnabled('internal_group_name') ? (internalGroupName.trim() || undefined) : undefined,
        pre_poc_status: isFieldEnabled('pre_poc_status') ? status : 'Planning',
        notes: isFieldEnabled('notes') ? (finalNotes || undefined) : undefined,
      };

      const result = await createDeployment(payload);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create deployment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldItem = (f: DeploymentFieldConfig) => {
    switch (f.key) {
      case 'customer_name':
        return (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {f.label} *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        );

      case 'location':
        return (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {f.label} {f.required && '*'}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required={f.required}
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. US-East (Virginia)"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        );

      case 'deployment_type':
        return (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {f.label} {f.required && '*'}
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <select
                value={deploymentType}
                required={f.required}
                onChange={e => setDeploymentType(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              >
                {(f.options || ['Deployment', 'POC']).map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'internal_group_name':
        return (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {f.label} {f.required && '*'}
            </label>
            {f.options && f.options.length > 0 ? (
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={internalGroupName}
                  required={f.required}
                  onChange={e => setInternalGroupName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">(Select Internal Group)</option>
                  {f.options.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input
                type="text"
                required={f.required}
                value={internalGroupName}
                onChange={e => setInternalGroupName(e.target.value)}
                placeholder="e.g. Edge Infrastructure"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            )}
          </div>
        );

      case 'pre_poc_status':
        return (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {f.label} {f.required && '*'}
            </label>
            <select
              value={status}
              required={f.required}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            >
              {(f.options || ['Planning', 'Pre-POC', 'In Progress', 'Staging', 'Active', 'Completed']).map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );

      case 'notes':
        return (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {f.label} {f.required && '*'}
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <textarea
                rows={3}
                required={f.required}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Details regarding hardware specs, network requirements, or primary point of contact..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        );

      default:
        // Custom field
        return (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {f.label} {f.required && '*'}
            </label>
            {f.type === 'select' && f.options && f.options.length > 0 ? (
              <select
                required={f.required}
                value={customValues[f.key] || ''}
                onChange={e => setCustomValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select an option...</option>
                {f.options.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                required={f.required}
                rows={2}
                value={customValues[f.key] || ''}
                onChange={e => setCustomValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <input
                type="text"
                required={f.required}
                value={customValues[f.key] || ''}
                onChange={e => setCustomValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-base">Create New Deployment</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Dynamically Render Form Fields in Configured Order */}
          {(settings?.fields || [])
            .filter(f => f.enabled)
            .map(f => renderFieldItem(f))}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Create Deployment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewDeploymentModal;
