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
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Database,
  ChevronsDown,
  ChevronsUp,
  Building2,
  MapPin,
  User
} from 'lucide-react';
import { Link, useBlocker } from 'react-router-dom';
import { 
  getDeploymentFieldSettings, 
  updateDeploymentFieldSettings, 
  resetDeploymentFieldSettings, 
  getCompanyFieldSettings,
  updateCompanyFieldSettings,
  resetCompanyFieldSettings,
  getMe,
  type DeploymentFieldConfig, 
  type DeploymentFieldsSettings,
  type CompanyFieldConfig,
  type CompanyFieldsSettings,
  getStatesDistricts,
  updateStatesDistricts,
  type StateDistrictItem
} from '../api';

interface SettingsPageProps {
  type: 'user' | 'admin';
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ type }) => {
  const isAdmin = type === 'admin';

  // Admin Active Tab: 'deployment' | 'company'
  const [adminTab, setAdminTab] = useState<'deployment' | 'company' | 'regions'>('deployment');

  // Deployment Settings State
  const [deploymentSettings, setDeploymentSettings] = useState<DeploymentFieldsSettings | null>(null);
  const [deploymentHasChanges, setDeploymentHasChanges] = useState(false);
  const [savingDeployment, setSavingDeployment] = useState(false);
  const [deploymentCollapsed, setDeploymentCollapsed] = useState<Record<string, boolean>>({});
  const [newDeploymentOptionInputs, setNewDeploymentOptionInputs] = useState<Record<string, string>>({});

  // Add Custom Deployment Field State
  const [isAddingDeploymentField, setIsAddingDeploymentField] = useState(false);
  const [newDepLabel, setNewDepLabel] = useState('');
  const [newDepKey, setNewDepKey] = useState('');
  const [newDepType, setNewDepType] = useState<'text' | 'select' | 'textarea' | 'date' | 'number'>('text');
  const [newDepOptions, setNewDepOptions] = useState<string[]>([]);
  const [newDepOptionInput, setNewDepOptionInput] = useState('');
  const [newDepDefault, setNewDepDefault] = useState('');
  const [newDepRequired, setNewDepRequired] = useState(false);
  const [newDepAllowOther, setNewDepAllowOther] = useState(true);
  const [newDepOtherPlaceholder, setNewDepOtherPlaceholder] = useState('');

  // Company Settings State
  const [companySettings, setCompanySettings] = useState<CompanyFieldsSettings | null>(null);
  const [companyHasChanges, setCompanyHasChanges] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyCollapsed, setCompanyCollapsed] = useState<Record<string, boolean>>({});
  const [newCompanyOptionInputs, setNewCompanyOptionInputs] = useState<Record<string, string>>({});
  const [companyCategoryFilter, setCompanyCategoryFilter] = useState<'profile' | 'location' | 'contact'>('profile');

  // Add Custom Company Field State
  const [isAddingCompanyField, setIsAddingCompanyField] = useState(false);
  const [newCompCategory, setNewCompCategory] = useState<'profile' | 'location' | 'contact'>('profile');
  const [newCompLabel, setNewCompLabel] = useState('');
  const [newCompKey, setNewCompKey] = useState('');
  const [newCompType, setNewCompType] = useState<'text' | 'select' | 'textarea' | 'date' | 'number'>('text');
  const [newCompOptions, setNewCompOptions] = useState<string[]>([]);
  const [newCompOptionInput, setNewCompOptionInput] = useState('');
  const [newCompDefault, setNewCompDefault] = useState('');
  const [newCompRequired, setNewCompRequired] = useState(false);
  const [newCompAllowOther, setNewCompAllowOther] = useState(true);
  const [newCompOtherPlaceholder, setNewCompOtherPlaceholder] = useState('');

  // Region Data State
  const [regions, setRegions] = useState<StateDistrictItem[]>([]);
  const [regionsHasChanges, setRegionsHasChanges] = useState(false);
  const [savingRegions, setSavingRegions] = useState(false);
  const [newRegionDistrictInputs, setNewRegionDistrictInputs] = useState<Record<string, string>>({});
  const [newRegionStateInput, setNewRegionStateInput] = useState('');

  // General Status & Loading
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Settings State
  const [currentUser, setCurrentUser] = useState<any>(null);

  const hasAnyChanges = deploymentHasChanges || companyHasChanges;

  // Unsaved changes blocker for in-app navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isAdmin && hasAnyChanges && currentLocation.pathname !== nextLocation.pathname
  );

  // Unsaved changes warning for tab close / refresh
  useEffect(() => {
    if (!isAdmin) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAdmin, hasAnyChanges]);

  // Load Initial Settings
  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const [depData, compData, regionsData] = await Promise.all([
        getDeploymentFieldSettings(),
        getCompanyFieldSettings(),
        getStatesDistricts()
      ]);

      setDeploymentSettings(depData);
      const initialDepCollapsed: Record<string, boolean> = {};
      depData.fields.forEach(f => {
        initialDepCollapsed[f.key] = true;
      });
      setDeploymentCollapsed(initialDepCollapsed);
      setDeploymentHasChanges(false);

      setCompanySettings(compData);
      const initialCompCollapsed: Record<string, boolean> = {};
      compData.fields.forEach(f => {
        initialCompCollapsed[f.key] = true;
      });
      setCompanyCollapsed(initialCompCollapsed);
      setCompanyHasChanges(false);
      
      setRegions(regionsData || []);
      setRegionsHasChanges(false);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load field configuration settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllSettings();
    } else {
      getMe().then(user => {
        setCurrentUser(user);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [isAdmin]);

  // --- DEPLOYMENT SETTINGS HANDLERS ---
  const handleMoveDeploymentField = (index: number, direction: 'up' | 'down') => {
    if (!deploymentSettings) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= deploymentSettings.fields.length) return;

    const newFields = [...deploymentSettings.fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);

    setDeploymentSettings({ ...deploymentSettings, fields: newFields });
    setDeploymentHasChanges(true);
  };

  const handleUpdateDeploymentField = (index: number, updates: Partial<DeploymentFieldConfig>) => {
    if (!deploymentSettings) return;
    setDeploymentSettings(prev => {
      if (!prev) return prev;
      const newFields = [...prev.fields];
      newFields[index] = { ...newFields[index], ...updates };
      return { ...prev, fields: newFields };
    });
    setDeploymentHasChanges(true);
  };

  const handleToggleDeploymentEnabled = (key: string) => {
    if (!deploymentSettings) return;
    setDeploymentSettings(prev => {
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
    setDeploymentHasChanges(true);
  };

  const handleAddDeploymentOption = (fieldKey: string) => {
    const inputVal = (newDeploymentOptionInputs[fieldKey] || '').trim();
    if (!inputVal || !deploymentSettings) return;

    setDeploymentSettings(prev => {
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

    setNewDeploymentOptionInputs(prev => ({ ...prev, [fieldKey]: '' }));
    setDeploymentHasChanges(true);
  };

  const handleRemoveDeploymentOption = (fieldKey: string, optionToRemove: string) => {
    if (!deploymentSettings) return;
    setDeploymentSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f => {
          if (f.key === fieldKey) {
            const updatedOpts = (f.options || []).filter(o => o !== optionToRemove);
            const newDefault = f.default_value === optionToRemove ? '' : f.default_value;
            return { ...f, options: updatedOpts, default_value: newDefault };
          }
          return f;
        })
      };
    });
    setDeploymentHasChanges(true);
  };

  const handleCreateDeploymentCustomField = () => {
    if (!newDepLabel.trim() || !deploymentSettings) return;
    const finalKey = newDepKey.trim() 
      ? newDepKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : 'custom_' + newDepLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

    const newField: DeploymentFieldConfig = {
      key: finalKey,
      label: newDepLabel.trim(),
      type: newDepType,
      enabled: true,
      required: newDepRequired,
      default_value: newDepDefault,
      options: newDepType === 'select' ? newDepOptions : undefined,
      allow_other: newDepType === 'select' ? newDepAllowOther : undefined,
      other_placeholder: newDepType === 'select' ? newDepOtherPlaceholder : undefined,
      system_fixed: false,
      description: 'Custom deployment field'
    };

    setDeploymentSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: [...prev.fields, newField]
      };
    });

    setDeploymentCollapsed(prev => ({ ...prev, [finalKey]: false }));
    setIsAddingDeploymentField(false);
    setNewDepLabel('');
    setNewDepKey('');
    setNewDepType('text');
    setNewDepOptions([]);
    setNewDepOptionInput('');
    setNewDepDefault('');
    setNewDepRequired(false);
    setNewDepAllowOther(true);
    setNewDepOtherPlaceholder('');
    setDeploymentHasChanges(true);
  };

  const handleDeleteDeploymentField = (key: string) => {
    if (!window.confirm('Are you sure you want to delete this custom field?')) return;
    setDeploymentSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.filter(f => f.key !== key)
      };
    });
    setDeploymentHasChanges(true);
  };

  const handleSaveDeployment = async () => {
    if (!deploymentSettings) return;
    try {
      setSavingDeployment(true);
      setMessage(null);
      const updated = await updateDeploymentFieldSettings(deploymentSettings);
      setDeploymentSettings(updated);
      setDeploymentHasChanges(false);
      setMessage({ type: 'success', text: 'Deployment field settings saved successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to save deployment settings.' });
    } finally {
      setSavingDeployment(false);
    }
  };

  const handleResetDeployment = async () => {
    if (!window.confirm('Reset all deployment fields and defaults to system defaults?')) return;
    try {
      setSavingDeployment(true);
      setMessage(null);
      const res = await resetDeploymentFieldSettings();
      setDeploymentSettings(res);
      setDeploymentHasChanges(false);
      setMessage({ type: 'success', text: 'Deployment settings reset to system defaults.' });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to reset deployment settings.' });
    } finally {
      setSavingDeployment(false);
    }
  };

  // --- COMPANY SETTINGS HANDLERS ---
  const handleMoveCompanyField = (index: number, direction: 'up' | 'down') => {
    if (!companySettings) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= companySettings.fields.length) return;

    const newFields = [...companySettings.fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);

    setCompanySettings({ ...companySettings, fields: newFields });
    setCompanyHasChanges(true);
  };

  const handleUpdateCompanyField = (index: number, updates: Partial<CompanyFieldConfig>) => {
    if (!companySettings) return;
    setCompanySettings(prev => {
      if (!prev) return prev;
      const newFields = [...prev.fields];
      newFields[index] = { ...newFields[index], ...updates };
      return { ...prev, fields: newFields };
    });
    setCompanyHasChanges(true);
  };

  const handleToggleCompanyEnabled = (key: string) => {
    if (!companySettings) return;
    setCompanySettings(prev => {
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
    setCompanyHasChanges(true);
  };

  const handleAddCompanyOption = (fieldKey: string) => {
    const inputVal = (newCompanyOptionInputs[fieldKey] || '').trim();
    if (!inputVal || !companySettings) return;

    setCompanySettings(prev => {
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

    setNewCompanyOptionInputs(prev => ({ ...prev, [fieldKey]: '' }));
    setCompanyHasChanges(true);
  };

  const handleRemoveCompanyOption = (fieldKey: string, optionToRemove: string) => {
    if (!companySettings) return;
    setCompanySettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f => {
          if (f.key === fieldKey) {
            const updatedOpts = (f.options || []).filter(o => o !== optionToRemove);
            const newDefault = f.default_value === optionToRemove ? '' : f.default_value;
            return { ...f, options: updatedOpts, default_value: newDefault };
          }
          return f;
        })
      };
    });
    setCompanyHasChanges(true);
  };

  const handleCreateCompanyCustomField = () => {
    if (!newCompLabel.trim() || !companySettings) return;
    const finalKey = newCompKey.trim() 
      ? newCompKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : 'custom_' + newCompLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

    const newField: CompanyFieldConfig = {
      key: finalKey,
      label: newCompLabel.trim(),
      type: newCompType,
      category: newCompCategory,
      enabled: true,
      required: newCompRequired,
      default_value: newCompDefault,
      options: newCompType === 'select' ? newCompOptions : undefined,
      allow_other: newCompType === 'select' ? newCompAllowOther : undefined,
      other_placeholder: newCompType === 'select' ? newCompOtherPlaceholder : undefined,
      system_fixed: false,
      description: `Custom ${newCompCategory} field`
    };

    setCompanySettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: [...prev.fields, newField]
      };
    });

    setCompanyCollapsed(prev => ({ ...prev, [finalKey]: false }));
    setIsAddingCompanyField(false);
    setNewCompLabel('');
    setNewCompKey('');
    setNewCompType('text');
    setNewCompCategory('profile');
    setNewCompOptions([]);
    setNewCompOptionInput('');
    setNewCompDefault('');
    setNewCompRequired(false);
    setNewCompAllowOther(true);
    setNewCompOtherPlaceholder('');
    setCompanyHasChanges(true);
  };

  const handleDeleteCompanyField = (key: string) => {
    if (!window.confirm('Are you sure you want to delete this custom company field?')) return;
    setCompanySettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.filter(f => f.key !== key)
      };
    });
    setCompanyHasChanges(true);
  };

  const handleSaveCompany = async () => {
    if (!companySettings) return;
    try {
      setSavingCompany(true);
      setMessage(null);
      const updated = await updateCompanyFieldSettings(companySettings);
      setCompanySettings(updated);
      setCompanyHasChanges(false);
      setMessage({ type: 'success', text: 'Company field settings saved successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to save company settings.' });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleResetCompany = async () => {
    if (!window.confirm('Reset all company fields and defaults to system defaults?')) return;
    try {
      setSavingCompany(true);
      setMessage(null);
      const res = await resetCompanyFieldSettings();
      setCompanySettings(res);
      setCompanyHasChanges(false);
      setMessage({ type: 'success', text: 'Company settings reset to system defaults.' });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to reset company settings.' });
    } finally {
      setSavingCompany(false);
    }
  };

  // Helper for Category Labels & Badges
  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'profile':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 flex items-center space-x-1">
            <Building2 className="w-3 h-3" />
            <span>Company Profile</span>
          </span>
        );
      case 'location':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>Datacenter Location</span>
          </span>
        );
      case 'contact':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>Company Contact</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
            General
          </span>
        );
    }
  };

  // --- Region Data Handlers ---
  const handleAddState = () => {
    if (!newRegionStateInput.trim()) return;
    const isDup = regions.some(r => r.state.toLowerCase() === newRegionStateInput.trim().toLowerCase());
    if (isDup) {
      setMessage({ type: 'error', text: 'State already exists.' });
      return;
    }
    setRegions([...regions, { state: newRegionStateInput.trim(), districts: [] }]);
    setNewRegionStateInput('');
    setRegionsHasChanges(true);
  };

  const handleDeleteState = (stateName: string) => {
    if (!window.confirm(`Delete state "${stateName}" and all its districts?`)) return;
    setRegions(regions.filter(r => r.state !== stateName));
    setRegionsHasChanges(true);
  };

  const handleAddDistrict = (stateName: string) => {
    const input = newRegionDistrictInputs[stateName]?.trim();
    if (!input) return;
    setRegions(regions.map(r => {
      if (r.state === stateName) {
        if (!r.districts.includes(input)) {
          return { ...r, districts: [...r.districts, input] };
        }
      }
      return r;
    }));
    setNewRegionDistrictInputs(prev => ({ ...prev, [stateName]: '' }));
    setRegionsHasChanges(true);
  };

  const handleDeleteDistrict = (stateName: string, districtName: string) => {
    setRegions(regions.map(r => {
      if (r.state === stateName) {
        return { ...r, districts: r.districts.filter(d => d !== districtName) };
      }
      return r;
    }));
    setRegionsHasChanges(true);
  };

  const handleSaveRegions = async () => {
    try {
      setSavingRegions(true);
      setMessage(null);
      await updateStatesDistricts(regions);
      setRegionsHasChanges(false);
      setMessage({ type: 'success', text: 'Region settings saved successfully.' });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to save region settings.' });
    } finally {
      setSavingRegions(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm ${isAdmin ? 'bg-blue-600' : 'bg-slate-700'}`}>
            {isAdmin ? <Shield className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isAdmin ? 'Admin Field Customization' : 'User Settings'}
            </h1>
            <p className="text-sm text-slate-500">
              {isAdmin
                ? 'Manage and customize field specifications, default values, database mappings, and validation for Company and Deployment records.'
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
          </div>
        </div>
      )}

      {/* ADMIN SETTINGS VIEW */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Top Segmented Navigation Switcher */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs max-w-2xl">
            <button
              type="button"
              onClick={() => setAdminTab('deployment')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                adminTab === 'deployment'
                  ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Deployment Info</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${adminTab === 'deployment' ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-slate-200 text-slate-600'}`}>
                {deploymentSettings?.fields.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('company')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                adminTab === 'company'
                  ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Company Info</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${adminTab === 'company' ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-slate-200 text-slate-600'}`}>
                {companySettings?.fields.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('regions')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                adminTab === 'regions'
                  ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Region Data</span>
            </button>
          </div>

          {/* ==================== SECTION 1: DEPLOYMENT INFO FIELDS ==================== */}
          {adminTab === 'deployment' && (
            <div className="space-y-5">
              {/* Subheader bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-4 sm:p-5 rounded-xl shadow-md">
                <div>
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-bold">Deployment Record Fields Manager</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Customize deployment field names, database columns, enable/disable status, display order, default values, and &ldquo;Other&rdquo; options.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleResetDeployment}
                    disabled={savingDeployment}
                    className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Reset deployment fields to system defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDeployment}
                    disabled={savingDeployment || !deploymentHasChanges}
                    className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                      deploymentHasChanges
                        ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/30 ring-2 ring-blue-400/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {savingDeployment ? (
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

              {/* Toolbar */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {deploymentSettings?.fields.length || 0} Configured Deployment Fields
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, boolean> = {};
                      deploymentSettings?.fields.forEach(f => { next[f.key] = true; });
                      setDeploymentCollapsed(next);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <ChevronsUp className="w-3.5 h-3.5" />
                    <span>Collapse All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, boolean> = {};
                      deploymentSettings?.fields.forEach(f => { next[f.key] = false; });
                      setDeploymentCollapsed(next);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <ChevronsDown className="w-3.5 h-3.5" />
                    <span>Expand All</span>
                  </button>
                </div>
              </div>

              {/* Deployment Fields List */}
              {loading ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                  Loading deployment fields configuration...
                </div>
              ) : (
                <div className="space-y-3">
                  {deploymentSettings?.fields.map((field, index) => {
                    const isFixed = field.system_fixed;
                    const isEnabled = field.enabled;
                    const isSelect = field.type === 'select';
                    const isCollapsed = deploymentCollapsed[field.key] ?? true;
                    const totalFields = deploymentSettings.fields.length;

                    return (
                      <div
                        key={field.key}
                        className={`border rounded-xl transition-all shadow-xs overflow-hidden ${
                          isEnabled
                            ? 'bg-white border-slate-200 hover:border-slate-300'
                            : 'bg-slate-50 border-slate-200/80 opacity-80'
                        }`}
                      >
                        {/* Header */}
                        <div 
                          onClick={() => setDeploymentCollapsed(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                          className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 select-none transition-colors"
                        >
                          <div className="flex items-center space-x-3.5 min-w-0">
                            {/* Order & Reorder */}
                            <div onClick={(e) => e.stopPropagation()} className="flex items-center space-x-1 shrink-0">
                              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 min-w-[28px] text-center">
                                #{index + 1}
                              </span>
                              <div className="flex items-center space-x-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveDeploymentField(index, 'up')}
                                  title="Move field up"
                                  className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === totalFields - 1}
                                  onClick={() => handleMoveDeploymentField(index, 'down')}
                                  title="Move field down"
                                  className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Title & Badges */}
                            <div className="min-w-0 truncate">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                                  {field.label}
                                </span>
                                <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 flex items-center space-x-1">
                                  <Database className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{field.key}</span>
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 uppercase tracking-wide">
                                  {field.type}
                                </span>
                                {field.allow_other && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                                    Allows &ldquo;Other&rdquo;
                                  </span>
                                )}
                                {isFixed && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 flex items-center space-x-1">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Core</span>
                                  </span>
                                )}
                              </div>
                              {isCollapsed && (
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {isSelect 
                                    ? `${field.options?.length || 0} options${field.allow_other ? ' + Other' : ''} • Default: "${field.default_value || 'None'}"`
                                    : field.default_value ? `Default: "${field.default_value}"` : 'No default value set'}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right Controls */}
                          <div onClick={(e) => e.stopPropagation()} className="flex items-center space-x-3 shrink-0 self-end md:self-auto">
                            <div className="flex items-center space-x-2 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              <span className={`text-xs font-semibold ${isEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {isEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                              <button
                                type="button"
                                disabled={isFixed}
                                onClick={() => handleToggleDeploymentEnabled(field.key)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isFixed
                                    ? 'bg-emerald-600 opacity-60 cursor-not-allowed'
                                    : isEnabled
                                    ? 'bg-emerald-600'
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

                            {!isFixed && field.key.startsWith('custom_') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDeploymentField(field.key)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="Delete custom field"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setDeploymentCollapsed(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5 text-blue-600" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Edit Form */}
                        {!isCollapsed && (
                          <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 space-y-5 animate-in fade-in duration-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                  Field Display Name *
                                </label>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => handleUpdateDeploymentField(index, { label: e.target.value })}
                                  placeholder="e.g. Deployment Type"
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                  Database Column (Key) *
                                </label>
                                <div className="relative">
                                  <Database className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                  <input
                                    type="text"
                                    value={field.key}
                                    disabled={isFixed}
                                    onChange={(e) => handleUpdateDeploymentField(index, { key: e.target.value })}
                                    placeholder="e.g. deployment_type"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-200/70">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                  Default Value
                                </label>
                                {isSelect ? (
                                  <select
                                    value={field.default_value}
                                    onChange={(e) => handleUpdateDeploymentField(index, { default_value: e.target.value })}
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                                  >
                                    <option value="">(No Default / Empty)</option>
                                    {(field.options || []).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt} (Default)
                                      </option>
                                    ))}
                                    {field.allow_other && (
                                      <option value="Other">Other (Custom Write-in)</option>
                                    )}
                                  </select>
                                ) : field.type === 'date' ? (
                                  <input
                                    type="date"
                                    value={field.default_value}
                                    onChange={(e) => handleUpdateDeploymentField(index, { default_value: e.target.value })}
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={field.default_value}
                                    onChange={(e) => handleUpdateDeploymentField(index, { default_value: e.target.value })}
                                    placeholder="Leave blank for no default..."
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                                  />
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                  Requirement & Validation
                                </label>
                                <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer pt-1">
                                  <input
                                    type="checkbox"
                                    disabled={isFixed}
                                    checked={field.required}
                                    onChange={(e) => handleUpdateDeploymentField(index, { required: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                                  />
                                  <span className="font-medium">
                                    {field.required ? 'Mandatory field (Required)' : 'Optional field'}
                                  </span>
                                </label>
                              </div>
                            </div>

                            {/* Selectable Options Manager */}
                            {isSelect && (
                              <div className="pt-3 border-t border-slate-200/70 space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Allowed Values / Options ({field.options?.length || 0})
                                  </label>
                                  <span className="text-[11px] text-slate-500">
                                    Click &times; to remove an option
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-2">
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
                                          onClick={() => handleRemoveDeploymentOption(field.key, option)}
                                          className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors ml-1 cursor-pointer"
                                        >
                                          &times;
                                        </button>
                                      </span>
                                    );
                                  })}

                                  {field.allow_other && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-300 border-dashed">
                                      + &ldquo;Other&rdquo; (Custom Write-in)
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 max-w-md">
                                  <input
                                    type="text"
                                    placeholder={`Add new option for ${field.label}...`}
                                    value={newDeploymentOptionInputs[field.key] || ''}
                                    onChange={(e) =>
                                      setNewDeploymentOptionInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddDeploymentOption(field.key);
                                      }
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddDeploymentOption(field.key)}
                                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Option</span>
                                  </button>
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.allow_other ?? false}
                                      onChange={(e) => handleUpdateDeploymentField(index, { allow_other: e.target.checked })}
                                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                                    />
                                    <span>Allow custom &ldquo;Other&rdquo; write-in value</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Description / Instructions */}
                            <div className="pt-2 border-t border-slate-200/70">
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Description & Helper Text
                              </label>
                              <input
                                type="text"
                                value={field.description || ''}
                                onChange={(e) => handleUpdateDeploymentField(index, { description: e.target.value })}
                                placeholder="Explain field purpose to users..."
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Custom Deployment Field Form */}
              {isAddingDeploymentField ? (
                <div className="p-5 bg-white rounded-xl border-2 border-blue-500/50 shadow-md space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <ListPlus className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">Add New Custom Deployment Field</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingDeploymentField(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
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
                        value={newDepLabel}
                        onChange={(e) => setNewDepLabel(e.target.value)}
                        placeholder="e.g. VLAN ID, Rack Position, Firmware Version"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Field Key (Database Column)
                      </label>
                      <input
                        type="text"
                        value={newDepKey}
                        onChange={(e) => setNewDepKey(e.target.value)}
                        placeholder="Leave blank to auto-generate from label"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Input Type
                      </label>
                      <select
                        value={newDepType}
                        onChange={(e) => setNewDepType(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                      >
                        <option value="text">Single Line Text</option>
                        <option value="select">Dropdown Select</option>
                        <option value="textarea">Multi-line Textarea</option>
                        <option value="date">Date Picker</option>
                        <option value="number">Numeric Input</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Default Value
                      </label>
                      <input
                        type="text"
                        value={newDepDefault}
                        onChange={(e) => setNewDepDefault(e.target.value)}
                        placeholder="Optional default value..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-end pb-2">
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newDepRequired}
                          onChange={(e) => setNewDepRequired(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="font-medium text-xs">Mandatory (Required)</span>
                      </label>
                    </div>
                  </div>

                  {newDepType === 'select' && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Dropdown Options
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {newDepOptions.map(opt => (
                          <span key={opt} className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium">
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => setNewDepOptions(prev => prev.filter(o => o !== opt))}
                              className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2 max-w-md">
                        <input
                          type="text"
                          value={newDepOptionInput}
                          onChange={(e) => setNewDepOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newDepOptionInput.trim() && !newDepOptions.includes(newDepOptionInput.trim())) {
                                setNewDepOptions(prev => [...prev, newDepOptionInput.trim()]);
                                setNewDepOptionInput('');
                              }
                            }
                          }}
                          placeholder="Type option and press Enter..."
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newDepOptionInput.trim() && !newDepOptions.includes(newDepOptionInput.trim())) {
                              setNewDepOptions(prev => [...prev, newDepOptionInput.trim()]);
                              setNewDepOptionInput('');
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer"
                        >
                          Add Option
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingDeploymentField(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newDepLabel.trim()}
                      onClick={handleCreateDeploymentCustomField}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
                    >
                      Add Field
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingDeploymentField(true)}
                  className="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/30 transition-all cursor-pointer"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Add Custom Deployment Field</span>
                </button>
              )}
            </div>
          )}

          {/* ==================== SECTION 2: COMPANY INFO FIELDS ==================== */}
          {adminTab === 'company' && (
            <div className="space-y-5">
              {/* Subheader bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-4 sm:p-5 rounded-xl shadow-md">
                <div>
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-bold">Company & Organization Fields Manager</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Configure field specifications for Company Profiles, Datacenter Locations, and Primary Contacts. Edit database columns, default values, and add custom attributes.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleResetCompany}
                    disabled={savingCompany}
                    className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Reset company fields to system defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCompany}
                    disabled={savingCompany || !companyHasChanges}
                    className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                      companyHasChanges
                        ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/30 ring-2 ring-blue-400/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {savingCompany ? (
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

              {/* Category Filter Pills & Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">

                  <button
                    type="button"
                    onClick={() => setCompanyCategoryFilter('profile')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      companyCategoryFilter === 'profile'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Profile Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyCategoryFilter('location')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      companyCategoryFilter === 'location'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Locations</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyCategoryFilter('contact')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      companyCategoryFilter === 'contact'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Contacts</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, boolean> = {};
                      companySettings?.fields.forEach(f => { next[f.key] = true; });
                      setCompanyCollapsed(next);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <ChevronsUp className="w-3.5 h-3.5" />
                    <span>Collapse All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, boolean> = {};
                      companySettings?.fields.forEach(f => { next[f.key] = false; });
                      setCompanyCollapsed(next);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <ChevronsDown className="w-3.5 h-3.5" />
                    <span>Expand All</span>
                  </button>
                </div>
              </div>

              {/* Company Fields List */}
              {loading ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                  Loading company fields configuration...
                </div>
              ) : (
                <div className="space-y-3">
                  {companySettings?.fields
                    .filter(f => f.category === companyCategoryFilter)
                    .map((field) => {
                      const originalIndex = companySettings.fields.findIndex(item => item.key === field.key);
                      const isFixed = field.system_fixed;
                      const isEnabled = field.enabled;
                      const isSelect = field.type === 'select';
                      const isCollapsed = companyCollapsed[field.key] ?? true;
                      const totalFields = companySettings.fields.length;

                      return (
                        <div
                          key={field.key}
                          className={`border rounded-xl transition-all shadow-xs overflow-hidden ${
                            isEnabled
                              ? 'bg-white border-slate-200 hover:border-slate-300'
                              : 'bg-slate-50 border-slate-200/80 opacity-80'
                          }`}
                        >
                          {/* Header */}
                          <div 
                            onClick={() => setCompanyCollapsed(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                            className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 select-none transition-colors"
                          >
                            <div className="flex items-center space-x-3.5 min-w-0">
                              {/* Order & Reorder */}
                              <div onClick={(e) => e.stopPropagation()} className="flex items-center space-x-1 shrink-0">
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 min-w-[28px] text-center">
                                  #{originalIndex + 1}
                                </span>
                                <div className="flex items-center space-x-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
                                  <button
                                    type="button"
                                    disabled={originalIndex === 0}
                                    onClick={() => handleMoveCompanyField(originalIndex, 'up')}
                                    title="Move field up"
                                    className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={originalIndex === totalFields - 1}
                                    onClick={() => handleMoveCompanyField(originalIndex, 'down')}
                                    title="Move field down"
                                    className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Title & Badges */}
                              <div className="min-w-0 truncate">
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <span className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                                    {field.label}
                                  </span>
                                  {getCategoryBadge(field.category)}
                                  <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 flex items-center space-x-1">
                                    <Database className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{field.key}</span>
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 uppercase tracking-wide">
                                    {field.type}
                                  </span>
                                  {field.allow_other && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                                      Allows &ldquo;Other&rdquo;
                                    </span>
                                  )}
                                  {isFixed && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 flex items-center space-x-1">
                                      <Lock className="w-2.5 h-2.5" />
                                      <span>Core</span>
                                    </span>
                                  )}
                                </div>
                                {isCollapsed && (
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                    {isSelect 
                                      ? `${field.options?.length || 0} options${field.allow_other ? ' + Other' : ''} • Default: "${field.default_value || 'None'}"`
                                      : field.default_value ? `Default: "${field.default_value}"` : 'No default value set'}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right Controls */}
                            <div onClick={(e) => e.stopPropagation()} className="flex items-center space-x-3 shrink-0 self-end md:self-auto">
                              <div className="flex items-center space-x-2 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                <span className={`text-xs font-semibold ${isEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                                  {isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <button
                                  type="button"
                                  disabled={isFixed}
                                  onClick={() => handleToggleCompanyEnabled(field.key)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    isFixed
                                      ? 'bg-emerald-600 opacity-60 cursor-not-allowed'
                                      : isEnabled
                                      ? 'bg-emerald-600'
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

                              {!isFixed && field.key.startsWith('custom_') && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCompanyField(field.key)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Delete custom company field"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setCompanyCollapsed(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5 text-blue-600" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Edit Form */}
                          {!isCollapsed && (
                            <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 space-y-5 animate-in fade-in duration-100">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Field Display Name *
                                  </label>
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => handleUpdateCompanyField(originalIndex, { label: e.target.value })}
                                    placeholder="e.g. Industry Sector"
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Database Column (Key) *
                                  </label>
                                  <div className="relative">
                                    <Database className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                    <input
                                      type="text"
                                      value={field.key}
                                      disabled={isFixed}
                                      onChange={(e) => handleUpdateCompanyField(originalIndex, { key: e.target.value })}
                                      placeholder="e.g. industry_sector"
                                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Section / Entity Category
                                  </label>
                                  <select
                                    disabled={isFixed}
                                    value={field.category || 'profile'}
                                    onChange={(e) => handleUpdateCompanyField(originalIndex, { category: e.target.value as any })}
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-slate-100"
                                  >
                                    <option value="profile">Company Profile</option>
                                    <option value="location">Company Location</option>
                                    <option value="contact">Company Contact</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-200/70">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Default Value
                                  </label>
                                  {isSelect ? (
                                    <select
                                      value={field.default_value}
                                      onChange={(e) => handleUpdateCompanyField(originalIndex, { default_value: e.target.value })}
                                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                                    >
                                      <option value="">(No Default / Empty)</option>
                                      {(field.options || []).map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt} (Default)
                                        </option>
                                      ))}
                                      {field.allow_other && (
                                        <option value="Other">Other (Custom Write-in)</option>
                                      )}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={field.default_value}
                                      onChange={(e) => handleUpdateCompanyField(originalIndex, { default_value: e.target.value })}
                                      placeholder="Leave blank for no default..."
                                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                                    />
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Requirement & Validation
                                  </label>
                                  <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer pt-1">
                                    <input
                                      type="checkbox"
                                      disabled={isFixed}
                                      checked={field.required}
                                      onChange={(e) => handleUpdateCompanyField(originalIndex, { required: e.target.checked })}
                                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <span className="font-medium">
                                      {field.required ? 'Mandatory field (Required)' : 'Optional field'}
                                    </span>
                                  </label>
                                </div>
                              </div>

                              {/* Select Options Manager */}
                              {isSelect && (
                                <div className="pt-3 border-t border-slate-200/70 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                      Allowed Values / Options ({field.options?.length || 0})
                                    </label>
                                    <span className="text-[11px] text-slate-500">
                                      Click &times; to remove an option
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-2 mb-2">
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
                                            onClick={() => handleRemoveCompanyOption(field.key, option)}
                                            className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors ml-1 cursor-pointer"
                                          >
                                            &times;
                                          </button>
                                        </span>
                                      );
                                    })}

                                    {field.allow_other && (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-300 border-dashed">
                                        + &ldquo;Other&rdquo; (Custom Write-in)
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-2 max-w-md">
                                    <input
                                      type="text"
                                      placeholder={`Add new option for ${field.label}...`}
                                      value={newCompanyOptionInputs[field.key] || ''}
                                      onChange={(e) =>
                                        setNewCompanyOptionInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddCompanyOption(field.key);
                                        }
                                      }}
                                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddCompanyOption(field.key)}
                                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add Option</span>
                                    </button>
                                  </div>

                                  <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={field.allow_other ?? false}
                                        onChange={(e) => handleUpdateCompanyField(originalIndex, { allow_other: e.target.checked })}
                                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                                      />
                                      <span>Allow custom &ldquo;Other&rdquo; write-in value</span>
                                    </label>
                                  </div>
                                </div>
                              )}

                              {/* Description / Helper text */}
                              <div className="pt-2 border-t border-slate-200/70">
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                  Description & Helper Text
                                </label>
                                <input
                                  type="text"
                                  value={field.description || ''}
                                  onChange={(e) => handleUpdateCompanyField(originalIndex, { description: e.target.value })}
                                  placeholder="Explain field purpose to users..."
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Add Custom Company Field Form */}
              {isAddingCompanyField ? (
                <div className="p-5 bg-white rounded-xl border-2 border-blue-500/50 shadow-md space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <ListPlus className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">Add New Custom Company Field</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingCompanyField(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Category Section *
                      </label>
                      <select
                        value={newCompCategory}
                        onChange={(e) => setNewCompCategory(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                      >
                        <option value="profile">Company Profile</option>
                        <option value="location">Datacenter Location</option>
                        <option value="contact">Company Contact</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Field Label *
                      </label>
                      <input
                        type="text"
                        value={newCompLabel}
                        onChange={(e) => setNewCompLabel(e.target.value)}
                        placeholder="e.g. Industry, Billing Account ID, Tax ID"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Field Key (Database Column)
                      </label>
                      <input
                        type="text"
                        value={newCompKey}
                        onChange={(e) => setNewCompKey(e.target.value)}
                        placeholder="Leave blank to auto-generate"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Input Type
                      </label>
                      <select
                        value={newCompType}
                        onChange={(e) => setNewCompType(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                      >
                        <option value="text">Single Line Text</option>
                        <option value="select">Dropdown Select</option>
                        <option value="textarea">Multi-line Textarea</option>
                        <option value="date">Date Picker</option>
                        <option value="number">Numeric Input</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Default Value
                      </label>
                      <input
                        type="text"
                        value={newCompDefault}
                        onChange={(e) => setNewCompDefault(e.target.value)}
                        placeholder="Optional default value..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-end pb-2">
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCompRequired}
                          onChange={(e) => setNewCompRequired(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="font-medium text-xs">Mandatory (Required)</span>
                      </label>
                    </div>
                  </div>

                  {newCompType === 'select' && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Dropdown Options
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {newCompOptions.map(opt => (
                          <span key={opt} className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium">
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => setNewCompOptions(prev => prev.filter(o => o !== opt))}
                              className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2 max-w-md">
                        <input
                          type="text"
                          value={newCompOptionInput}
                          onChange={(e) => setNewCompOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCompOptionInput.trim() && !newCompOptions.includes(newCompOptionInput.trim())) {
                                setNewCompOptions(prev => [...prev, newCompOptionInput.trim()]);
                                setNewCompOptionInput('');
                              }
                            }
                          }}
                          placeholder="Type option and press Enter..."
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newCompOptionInput.trim() && !newCompOptions.includes(newCompOptionInput.trim())) {
                              setNewCompOptions(prev => [...prev, newCompOptionInput.trim()]);
                              setNewCompOptionInput('');
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer"
                        >
                          Add Option
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingCompanyField(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newCompLabel.trim()}
                      onClick={handleCreateCompanyCustomField}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
                    >
                      Add Field
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCompanyField(true)}
                  className="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/30 transition-all cursor-pointer"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Add Custom Company Field</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== SECTION 3: REGION DATA ==================== */}
      {isAdmin && adminTab === 'regions' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span>Malaysian States & Districts</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Manage the list of states and their corresponding districts. These are dynamically loaded in the Location configuration dropdowns.
                </p>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveRegions}
                  disabled={!regionsHasChanges || savingRegions}
                  className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                    regionsHasChanges
                      ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {savingRegions ? (
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

            <div className="space-y-4">
              {regions.map((region, index) => (
                <div key={index} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-semibold text-slate-800">{region.state}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteState(region.state)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {region.districts.map(d => (
                        <div key={d} className="flex items-center space-x-1 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 shadow-xs">
                          <span>{d}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDistrict(region.state, d)}
                            className="text-slate-400 hover:text-red-500 rounded cursor-pointer"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      {region.districts.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No districts added yet.</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newRegionDistrictInputs[region.state] || ''}
                        onChange={(e) => setNewRegionDistrictInputs(prev => ({ ...prev, [region.state]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddDistrict(region.state);
                          }
                        }}
                        placeholder="Type new district name..."
                        className="flex-1 text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddDistrict(region.state)}
                        disabled={!newRegionDistrictInputs[region.state]?.trim()}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100 flex items-center space-x-3">
                <input
                  type="text"
                  value={newRegionStateInput}
                  onChange={(e) => setNewRegionStateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddState();
                    }
                  }}
                  placeholder="Add a new Malaysian State..."
                  className="flex-1 max-w-sm text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddState}
                  disabled={!newRegionStateInput.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm disabled:opacity-50 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add State</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Unsaved Changes</h3>
                <p className="text-xs text-slate-500">You have unsaved changes in field customization settings.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to leave this page? Any unsaved modifications to fields, database columns, options, or default values will be discarded.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => blocker.reset()}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Stay on Page
              </button>
              <button
                type="button"
                onClick={() => blocker.proceed()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
