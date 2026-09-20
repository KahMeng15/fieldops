import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  Shield, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Sliders, 
  ListPlus, 
  Lock, 
  Sparkles,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  getDeploymentFieldSettings, 
  updateDeploymentFieldSettings, 
  resetDeploymentFieldSettings, 
  getMe,
  type DeploymentFieldConfig, 
  type DeploymentFieldsSettings 
} from '../api';

interface SettingsPageProps {
  type: 'user' | 'admin';
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ type }) => {
  const isAdmin = type === 'admin';

  // Admin Settings State
  const [settings, setSettings] = useState<DeploymentFieldsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // New option input states keyed by field key
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  // New custom field state
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'select' | 'textarea'>('select');
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newFieldOptionInput, setNewFieldOptionInput] = useState('');
  const [newFieldDefault, setNewFieldDefault] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // User Settings State
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getDeploymentFieldSettings();
      setSettings(data);
      setHasChanges(false);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load deployment field settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    } else {
      getMe().then(user => {
        setCurrentUser(user);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [isAdmin]);

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (!settings) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.fields.length) return;

    const newFields = [...settings.fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);

    setSettings({ ...settings, fields: newFields });
    setHasChanges(true);
  };

  const handleToggleEnabled = (key: string) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f => {
          if (f.key === key && !f.system_fixed) {
            return { ...f, enabled: !f.enabled };
          }
          return f;
        })
      };
    });
    setHasChanges(true);
  };

  const handleToggleRequired = (key: string) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f => {
          if (f.key === key && !f.system_fixed) {
            return { ...f, required: !f.required };
          }
          return f;
        })
      };
    });
    setHasChanges(true);
  };

  const handleDefaultValueChange = (key: string, value: string) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f => {
          if (f.key === key) {
            return { ...f, default_value: value };
          }
          return f;
        })
      };
    });
    setHasChanges(true);
  };

  const handleAddOption = (fieldKey: string) => {
    const inputVal = (newOptionInputs[fieldKey] || '').trim();
    if (!inputVal || !settings) return;

    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f => {
          if (f.key === fieldKey) {
            const currentOpts = f.options || [];
            if (!currentOpts.includes(inputVal)) {
              return { ...f, options: [...currentOpts, inputVal] };
            }
          }
          return f;
        })
      };
    });

    setNewOptionInputs(prev => ({ ...prev, [fieldKey]: '' }));
    setHasChanges(true);
  };

  const handleRemoveOption = (fieldKey: string, optionToRemove: string) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f => {
          if (f.key === fieldKey) {
            const updatedOpts = (f.options || []).filter(o => o !== optionToRemove);
            const newDefault = f.default_value === optionToRemove ? (updatedOpts[0] || '') : f.default_value;
            return { ...f, options: updatedOpts, default_value: newDefault };
          }
          return f;
        })
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setMessage(null);
      const updated = await updateDeploymentFieldSettings(settings);
      setSettings(updated);
      setHasChanges(false);
      setMessage({ type: 'success', text: 'Deployment field settings saved successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all deployment fields and default values to system defaults?')) {
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      const res = await resetDeploymentFieldSettings();
      setSettings(res);
      setHasChanges(false);
      setMessage({ type: 'success', text: 'Settings reset to system defaults.' });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to reset settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const generatedKey = 'custom_' + newFieldLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

    const newField: DeploymentFieldConfig = {
      key: generatedKey,
      label: newFieldLabel.trim(),
      type: newFieldType,
      enabled: true,
      required: newFieldRequired,
      default_value: newFieldDefault,
      options: newFieldType === 'select' ? newFieldOptions : undefined,
      system_fixed: false,
      description: 'Custom user-defined field'
    };

    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: [...prev.fields, newField]
      };
    });

    setIsAddingField(false);
    setNewFieldLabel('');
    setNewFieldType('select');
    setNewFieldOptions([]);
    setNewFieldOptionInput('');
    setNewFieldDefault('');
    setNewFieldRequired(false);
    setHasChanges(true);
  };

  const handleDeleteField = (key: string) => {
    if (!window.confirm('Are you sure you want to completely remove this field?')) return;
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.filter(f => f.key !== key)
      };
    });
    setHasChanges(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm ${isAdmin ? 'bg-blue-600' : 'bg-slate-700'}`}>
            {isAdmin ? <Shield className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isAdmin ? 'Admin Settings' : 'User Settings'}
            </h1>
            <p className="text-sm text-slate-500">
              {isAdmin
                ? 'Configure deployment record fields, arrange display order, and define default values.'
                : 'Manage your user profile and account preferences.'}
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Alerts */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-3 text-sm border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* USER SETTINGS VIEW */}
      {!isAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Account Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium">
                {currentUser?.username || 'admin'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium">
                {currentUser?.email || 'admin@example.com'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Role & Permissions
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Administrator (Full Access)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Security & Encryption
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>AES-256-GCM Hardware Vault Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN SETTINGS VIEW */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Subheader bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-4 sm:p-5 rounded-xl shadow-md">
            <div>
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold">Deployment Record Fields Manager</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Customize which fields appear on deployment records, rearrange their order, configure default values, and edit allowed options.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Reset all fields to system defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                  hasChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/30 ring-2 ring-blue-400/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Explanatory Guide Box */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start space-x-3 text-xs text-blue-950">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p>
                <strong>What does &ldquo;Included in Record&rdquo; mean?</strong> It controls whether a field is active and shown when creating and managing deployment records. When toggled <em>Removed / Hidden</em>, the field is excluded from new deployment creation forms and record views so teams only see relevant inputs.
              </p>
              <p>
                <strong>Field Ordering:</strong> Use the <span className="inline-flex items-center px-1.5 py-0.5 bg-white border border-blue-200 rounded font-semibold text-[11px]">&uarr;</span> and <span className="inline-flex items-center px-1.5 py-0.5 bg-white border border-blue-200 rounded font-semibold text-[11px]">&darr;</span> buttons on each card to change the order fields appear on the deployment form.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
              Loading deployment fields configuration...
            </div>
          ) : (
            <div className="space-y-4">
              {settings?.fields.map((field, index) => {
                const isFixed = field.system_fixed;
                const isEnabled = field.enabled;
                const isSelect = field.type === 'select';
                const totalFields = settings.fields.length;

                return (
                  <div
                    key={field.key}
                    className={`border rounded-xl transition-all ${
                      isEnabled
                        ? 'bg-white border-slate-200 shadow-sm'
                        : 'bg-slate-50/80 border-slate-200/60 opacity-75'
                    }`}
                  >
                    {/* Field Card Header */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                      <div className="flex items-start space-x-3.5">
                        {/* Order & Reordering Controls */}
                        <div className="flex flex-col items-center space-y-1 shrink-0 mt-0.5">
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            #{index + 1}
                          </span>
                          <div className="flex items-center space-x-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveField(index, 'up')}
                              title="Move field up"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={index === totalFields - 1}
                              onClick={() => handleMoveField(index, 'down')}
                              title="Move field down"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 text-base">
                              {field.label}
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                              {field.key}
                            </span>
                            <span className="text-[11px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 uppercase">
                              {field.type}
                            </span>
                            {isFixed && (
                              <span className="text-[11px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 flex items-center space-x-1">
                                <Lock className="w-3 h-3" />
                                <span>Core Required</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {field.description || 'Configurable deployment record property'}
                          </p>
                        </div>
                      </div>

                      {/* Field Status & Inclusion Toggles */}
                      <div className="flex items-center space-x-3 shrink-0">
                        {/* Include / Remove Toggle */}
                        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-xs font-medium text-slate-700">
                            {isEnabled ? 'Included in Record' : 'Removed / Hidden'}
                          </span>
                          <button
                            type="button"
                            disabled={isFixed}
                            onClick={() => handleToggleEnabled(field.key)}
                            title={isFixed ? 'Core field cannot be removed' : isEnabled ? 'Click to remove from records' : 'Click to include in records'}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isFixed
                                ? 'bg-blue-600 opacity-60 cursor-not-allowed'
                                : isEnabled
                                ? 'bg-blue-600'
                                : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Custom field delete */}
                        {!isFixed && field.key.startsWith('custom_') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteField(field.key)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete custom field"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Field Options & Default Value Body (Visible when included) */}
                    {isEnabled && (
                      <div className="p-4 sm:p-5 bg-slate-50/50 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Default Value Configurator */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                              Default Value
                            </label>
                            {isSelect ? (
                              <select
                                value={field.default_value}
                                onChange={(e) => handleDefaultValueChange(field.key, e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
                              >
                                <option value="">(No Default / Empty)</option>
                                {(field.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt} (Default)
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={field.default_value}
                                onChange={(e) => handleDefaultValueChange(field.key, e.target.value)}
                                placeholder="Leave blank for no default..."
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                              />
                            )}
                            <p className="text-[11px] text-slate-500 mt-1">
                              This value will be automatically selected when creating a new deployment.
                            </p>
                          </div>

                          {/* Requirement toggle */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                              Required Field
                            </label>
                            <div className="flex items-center space-x-3 pt-1">
                              <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={isFixed}
                                  checked={field.required}
                                  onChange={() => handleToggleRequired(field.key)}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="font-medium">
                                  {field.required ? 'Mandatory for new records' : 'Optional field'}
                                </span>
                              </label>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {isFixed
                                ? 'This system field is always required.'
                                : 'If checked, users must provide a value before saving.'}
                            </p>
                          </div>
                        </div>

                        {/* Selectable Options Manager (for select fields) */}
                        {isSelect && (
                          <div className="pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Allowed Values / Options ({field.options?.length || 0})
                              </label>
                              <span className="text-[11px] text-slate-500">
                                Click <span className="text-red-500 font-bold">&times;</span> to remove an option
                              </span>
                            </div>

                            {/* Option Chips */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {(field.options || []).map((option) => {
                                const isCurrentDefault = field.default_value === option;
                                return (
                                  <span
                                    key={option}
                                    className={`inline-flex items-center space-x-1.5 pl-3 pr-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                      isCurrentDefault
                                        ? 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/40'
                                        : 'bg-white text-slate-800 border-slate-300'
                                    }`}
                                  >
                                    <span>{option}</span>
                                    {isCurrentDefault && (
                                      <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-semibold">
                                        Default
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(field.key, option)}
                                      className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors ml-1 cursor-pointer"
                                      title={`Remove "${option}"`}
                                    >
                                      &times;
                                    </button>
                                  </span>
                                );
                              })}
                            </div>

                            {/* Add Option Input */}
                            <div className="flex items-center space-x-2 max-w-md">
                              <input
                                type="text"
                                placeholder={`Add new ${field.label.toLowerCase()} option...`}
                                value={newOptionInputs[field.key] || ''}
                                onChange={(e) =>
                                  setNewOptionInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddOption(field.key);
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddOption(field.key)}
                                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Option</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Custom Field Card */}
              {isAddingField ? (
                <div className="bg-white border-2 border-dashed border-blue-300 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2 text-blue-600 font-semibold text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Define New Deployment Field</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingField(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Field Label *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SLA Tier or Environment Region"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Input Type
                      </label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="select">Dropdown Select (Predefined Options)</option>
                        <option value="text">Single-line Text</option>
                        <option value="textarea">Multi-line Text Area</option>
                      </select>
                    </div>
                  </div>

                  {newFieldType === 'select' && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Initial Options
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {newFieldOptions.map((opt) => (
                          <span
                            key={opt}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white border border-slate-300 text-xs font-medium text-slate-700"
                          >
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => setNewFieldOptions((prev) => prev.filter((o) => o !== opt))}
                              className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2 max-w-sm">
                        <input
                          type="text"
                          placeholder="Add option..."
                          value={newFieldOptionInput}
                          onChange={(e) => setNewFieldOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newFieldOptionInput.trim()) {
                                setNewFieldOptions((prev) => [...prev, newFieldOptionInput.trim()]);
                                setNewFieldOptionInput('');
                              }
                            }
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newFieldOptionInput.trim()) {
                              setNewFieldOptions((prev) => [...prev, newFieldOptionInput.trim()]);
                              setNewFieldOptionInput('');
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingField(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newFieldLabel.trim()}
                      onClick={handleCreateCustomField}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
                    >
                      Add Field
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingField(true)}
                  className="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/30 transition-all cursor-pointer"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Add Custom Deployment Field</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
