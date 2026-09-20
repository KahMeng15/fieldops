import React, { useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  Building2, 
  MapPin, 
  Tag, 
  FileText, 
  CheckCircle, 
  Users, 
  User,
  Package, 
  Calendar, 
  Plus,
  Wrench,
  FolderOpen
} from 'lucide-react';
import { 
  createDeployment, 
  getDeploymentFieldSettings, 
  getCompanies, 
  getCompanyLocations,
  type DeploymentData, 
  type DeploymentFieldsSettings,
  type DeploymentFieldConfig,
  type Company,
  type CompanyLocation
} from '../api';
import NewCompanyModal from './NewCompanyModal';
import NewLocationModal from './NewLocationModal';

interface NewDeploymentModalProps {
  isOpen: boolean;
  defaultCompanyId?: string;
  defaultLocationId?: string;
  defaultCompanyName?: string;
  defaultLocationName?: string;
  onClose: () => void;
  onSuccess: (deployment: DeploymentData) => void;
}

export const NewDeploymentModal: React.FC<NewDeploymentModalProps> = ({
  isOpen,
  defaultCompanyId,
  defaultLocationId,
  defaultCompanyName,
  defaultLocationName,
  onClose,
  onSuccess,
}) => {
  const [settings, setSettings] = useState<DeploymentFieldsSettings | null>(null);
  
  // Company & Location State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(defaultCompanyId || '');
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(defaultLocationId || '');
  const [customerName, setCustomerName] = useState(defaultCompanyName || '');
  const [location, setLocation] = useState(defaultLocationName || '');

  // Sub-modals for inline creation
  const [isInlineCompanyModalOpen, setIsInlineCompanyModalOpen] = useState(false);
  const [isInlineLocationModalOpen, setIsInlineLocationModalOpen] = useState(false);

  // Deployment Core State
  const [deployedProduct, setDeployedProduct] = useState('FieldOps Core Gateway');
  const [deploymentDate, setDeploymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deploymentType, setDeploymentType] = useState('Deployment');
  const [internalGroupName, setInternalGroupName] = useState('');
  const [accountOwner, setAccountOwner] = useState('');
  const [leadEngineer, setLeadEngineer] = useState('');
  const [assistingEngineers, setAssistingEngineers] = useState('');
  const [status, setStatus] = useState('Planning');
  const [deploymentFolder, setDeploymentFolder] = useState('');
  const [notes, setNotes] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load companies
  const loadCompaniesList = async () => {
    try {
      const list = await getCompanies();
      setCompanies(list || []);
    } catch {
      // Fallback silent
    }
  };

  // Load locations when company changes
  const loadLocationsForCompany = async (compId: string) => {
    if (!compId) {
      setCompanyLocations([]);
      return;
    }
    try {
      const locs = await getCompanyLocations(compId);
      setCompanyLocations(locs || []);
      if (defaultLocationId && locs.some(l => l.id === defaultLocationId)) {
        setSelectedLocationId(defaultLocationId);
      }
    } catch {
      setCompanyLocations([]);
    }
  };

  // Load settings and company data when modal is opened
  useEffect(() => {
    if (isOpen) {
      loadCompaniesList();

      if (defaultCompanyId) {
        setSelectedCompanyId(defaultCompanyId);
        loadLocationsForCompany(defaultCompanyId);
      }
      if (defaultCompanyName) setCustomerName(defaultCompanyName);
      if (defaultLocationId) setSelectedLocationId(defaultLocationId);
      if (defaultLocationName) setLocation(defaultLocationName);

      getDeploymentFieldSettings()
        .then(data => {
          setSettings(data);
          
          const fields = data.fields || [];
          const productField = fields.find(f => f.key === 'deployed_product');
          const typeField = fields.find(f => f.key === 'deployment_type');
          const groupField = fields.find(f => f.key === 'internal_group_name');
          const ownerField = fields.find(f => f.key === 'account_owner');
          const leadField = fields.find(f => f.key === 'lead_engineer');
          const assistField = fields.find(f => f.key === 'assisting_engineers');
          const statusField = fields.find(f => f.key === 'pre_poc_status');
          const notesField = fields.find(f => f.key === 'notes');

          if (productField?.default_value) setDeployedProduct(productField.default_value);
          setDeploymentType(typeField?.default_value ?? '');
          setInternalGroupName(groupField?.default_value ?? '');
          setAccountOwner(ownerField?.default_value ?? '');
          setLeadEngineer(leadField?.default_value ?? '');
          setAssistingEngineers(assistField?.default_value ?? '');
          setStatus(statusField?.default_value ?? '');
          setNotes(notesField?.default_value ?? '');

          // Initialize custom/dynamic fields default values
          const initialCustom: Record<string, string> = {};
          fields
            .filter(f => !['customer_name', 'location', 'deployed_product', 'deployment_date', 'deployment_type', 'internal_group_name', 'account_owner', 'lead_engineer', 'assisting_engineers', 'pre_poc_status', 'notes'].includes(f.key))
            .forEach(f => {
              initialCustom[f.key] = f.default_value ?? '';
            });
          setCustomValues(initialCustom);
          setOtherValues({});
        })
        .catch(() => {
          setDeploymentType('');
          setStatus('');
        });
    } else {
      // Reset form on close
      if (!defaultCompanyId) setSelectedCompanyId('');
      if (!defaultLocationId) setSelectedLocationId('');
      if (!defaultCompanyName) setCustomerName('');
      if (!defaultLocationName) setLocation('');
      setDeployedProduct('FieldOps Core Gateway');
      setDeploymentDate(new Date().toISOString().split('T')[0]);
      setDeploymentType('');
      setInternalGroupName('');
      setAccountOwner('');
      setStatus('');
      setDeploymentFolder('');
      setNotes('');
      setCustomValues({});
      setOtherValues({});
      setError(null);
    }
  }, [isOpen, defaultCompanyId, defaultLocationId, defaultCompanyName, defaultLocationName]);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const compId = e.target.value;
    setSelectedCompanyId(compId);
    const found = companies.find(c => c.id === compId);
    if (found) {
      setCustomerName(found.name);
    }
    setSelectedLocationId('');
    setLocation('');
    loadLocationsForCompany(compId);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    setSelectedLocationId(locId);
    const found = companyLocations.find(l => l.id === locId);
    if (found) {
      setLocation(found.name);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCustomerName = customerName.trim();
    if (!finalCustomerName) {
      setError('Please select or specify a company.');
      return;
    }

    const finalLocationName = location.trim();
    if (!finalLocationName) {
      setError('Please select or specify a location.');
      return;
    }

    if (!deployedProduct.trim()) {
      setError('Deployed Product is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const finalProduct = (deployedProduct === 'Other' && otherValues['deployed_product']?.trim())
        ? otherValues['deployed_product'].trim()
        : deployedProduct;

      const finalDeploymentType = (deploymentType === 'Other' && otherValues['deployment_type']?.trim())
        ? otherValues['deployment_type'].trim()
        : deploymentType;

      const finalInternalGroup = (internalGroupName === 'Other' && otherValues['internal_group_name']?.trim())
        ? otherValues['internal_group_name'].trim()
        : internalGroupName;

      const finalStatus = (status === 'Other' && otherValues['pre_poc_status']?.trim())
        ? otherValues['pre_poc_status'].trim()
        : status;

      const payload: Record<string, any> = {
        company_id: selectedCompanyId || undefined,
        location_id: selectedLocationId || undefined,
        customer_name: finalCustomerName,
        location: finalLocationName,
        deployed_product: finalProduct.trim(),
        deployment_date: deploymentDate ? new Date(deploymentDate).toISOString() : new Date().toISOString(),
      };

      if (isFieldEnabled('deployment_type')) {
        payload.deployment_type = finalDeploymentType || null;
      }
      if (isFieldEnabled('internal_group_name')) {
        payload.internal_group_name = finalInternalGroup.trim() || null;
      }
      if (isFieldEnabled('pre_poc_status')) {
        payload.pre_poc_status = finalStatus || null;
      }
      if (isFieldEnabled('account_owner')) {
        payload.account_owner = accountOwner.trim() || null;
      }
      if (isFieldEnabled('lead_engineer')) {
        payload.lead_engineer = leadEngineer.trim() || null;
      }
      if (isFieldEnabled('assisting_engineers')) {
        payload.assisting_engineers = assistingEngineers.trim() || null;
      }
      if (isFieldEnabled('notes')) {
        payload.notes = notes.trim() || null;
      }
      payload.deployment_folder = deploymentFolder.trim() || null;

      // Add all other custom or non-system fields directly to payload to save in PostgreSQL
      const otherConfiguredFields = (settings?.fields || []).filter(
        f => !['customer_name', 'location', 'deployed_product', 'deployment_date', 'deployment_type', 'internal_group_name', 'account_owner', 'lead_engineer', 'assisting_engineers', 'pre_poc_status', 'notes'].includes(f.key) && f.enabled
      );

      for (const cf of otherConfiguredFields) {
        const rawVal = customValues[cf.key] ?? '';
        const resolvedVal = (rawVal === 'Other' && otherValues[cf.key]?.trim())
          ? otherValues[cf.key].trim()
          : rawVal;
        payload[cf.key] = resolvedVal || null;
      }

      const result = await createDeployment(payload as any);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create deployment record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productField = getField('deployed_product');
  const productOptions = [
    ...(productField?.options || [
      'FieldOps Core Gateway',
      'Edge Compute Appliance X1',
      'Secure Access Service Edge (SASE)',
      'AI Inference Node Enterprise',
      'Zero Trust Network Connector'
    ])
  ];
  if (productField?.allow_other && !productOptions.includes('Other')) {
    productOptions.push('Other');
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Modal Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Record New Deployment</h3>
                <p className="text-[11px] text-slate-400">
                  Record a deployed product at a company datacenter location
                </p>
              </div>
            </div>
            <button
              type="button"
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

            {/* SECTION 1: Company & Location Hierarchy */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Organization & Location Hierarchy</span>
              </div>

              {/* Company Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Company / Customer *
                  </label>
                  {!defaultCompanyId && (
                    <button
                      type="button"
                      onClick={() => setIsInlineCompanyModalOpen(true)}
                      className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Company</span>
                    </button>
                  )}
                </div>

                {companies.length > 0 ? (
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <select
                      value={selectedCompanyId}
                      onChange={handleCompanyChange}
                      disabled={Boolean(defaultCompanyId)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-slate-100 font-medium"
                      required
                    >
                      <option value="">-- Select Company --</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Location Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Datacenter / Facility Location *
                  </label>
                  {selectedCompanyId && !defaultLocationId && (
                    <button
                      type="button"
                      onClick={() => setIsInlineLocationModalOpen(true)}
                      className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Location</span>
                    </button>
                  )}
                </div>

                {companyLocations.length > 0 ? (
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <select
                      value={selectedLocationId}
                      onChange={handleLocationChange}
                      disabled={Boolean(defaultLocationId)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-slate-100 font-medium"
                      required
                    >
                      <option value="">-- Select Location --</option>
                      {companyLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} {l.city ? `(${l.city})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={selectedCompanyId ? "No locations found - enter location name..." : "Select a company or enter location..."}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: Deployed Product & Deployment Date */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-4">
              <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Deployed Product & Timeline</span>
              </div>

              {/* Deployed Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Deployed Product *
                </label>
                <div className="relative">
                  <Package className="w-4 h-4 absolute left-3 top-3 text-indigo-500" />
                  <select
                    value={deployedProduct}
                    onChange={(e) => setDeployedProduct(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-900"
                  >
                    <option value="">-- Select Product --</option>
                    {productOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {deployedProduct === 'Other' && (
                  <div className="mt-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      required
                      value={otherValues['deployed_product'] || ''}
                      onChange={(e) => setOtherValues(prev => ({ ...prev, deployed_product: e.target.value }))}
                      placeholder="Specify custom product name or SKU..."
                      className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Deployment Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Deployment Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={deploymentDate}
                    onChange={(e) => setDeploymentDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Date when the product was or will be deployed at this location.
                </p>
              </div>
            </div>

            {/* SECTION 3: Lifecycle, Status, Group & Notes */}
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Deployment Type */}
                {isFieldEnabled('deployment_type') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Deployment Type {isFieldRequired('deployment_type') && '*'}
                    </label>
                    <div className="relative">
                      <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <select
                        value={deploymentType}
                        required={isFieldRequired('deployment_type')}
                        onChange={e => setDeploymentType(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Select Deployment Type --</option>
                        {(getField('deployment_type')?.options || ['Deployment', 'POC', 'Pilot', 'Trial', 'Staging']).map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Status */}
                {isFieldEnabled('pre_poc_status') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Status {isFieldRequired('pre_poc_status') && '*'}
                    </label>
                    <select
                      value={status}
                      required={isFieldRequired('pre_poc_status')}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">-- Select Status --</option>
                      {(getField('pre_poc_status')?.options || ['Planning', 'Pre-POC', 'In Progress', 'Staging', 'Active', 'Completed']).map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Account Owner */}
                {isFieldEnabled('account_owner') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Account Owner {isFieldRequired('account_owner') && '*'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={accountOwner}
                        required={isFieldRequired('account_owner')}
                        onChange={e => setAccountOwner(e.target.value)}
                        placeholder="e.g. Sarah Jenkins (Account Lead)"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Internal Group */}
                {isFieldEnabled('internal_group_name') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Internal Engineering Group {isFieldRequired('internal_group_name') && '*'}
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <select
                        value={internalGroupName}
                        required={isFieldRequired('internal_group_name')}
                        onChange={e => setInternalGroupName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Select Internal Group --</option>
                        {(getField('internal_group_name')?.options || ['Edge Infrastructure', 'Core Platform', 'Cloud Ops', 'Security Team']).map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {/* Lead Engineer */}
                {isFieldEnabled('lead_engineer') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Lead Engineer {isFieldRequired('lead_engineer') && '*'}
                    </label>
                    <div className="relative">
                      <Wrench className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={leadEngineer}
                        required={isFieldRequired('lead_engineer')}
                        onChange={e => setLeadEngineer(e.target.value)}
                        placeholder="e.g. Alex Chen"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Assisting Engineer(s) */}
                {isFieldEnabled('assisting_engineers') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Assisting Engineer(s) {isFieldRequired('assisting_engineers') && '*'}
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={assistingEngineers}
                        required={isFieldRequired('assisting_engineers')}
                        onChange={e => setAssistingEngineers(e.target.value)}
                        placeholder="e.g. Sarah Miller, David Kim"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                )}
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
                    placeholder="https://onedrive.live.com/... or SharePoint folder link"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Link to OneDrive / SharePoint folder for configuration files, UAT sign-offs, and backups.
                </p>
              </div>

              {/* Notes */}
              {isFieldEnabled('notes') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Notes & Technical Specs
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Hardware specs, networking info, primary point of contact..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Dynamically Render Any Custom Fields configured by Admin */}
              {(settings?.fields || [])
                .filter(f => !['customer_name', 'location', 'deployed_product', 'deployment_date', 'deployment_type', 'internal_group_name', 'account_owner', 'lead_engineer', 'assisting_engineers', 'pre_poc_status', 'notes'].includes(f.key) && f.enabled)
                .map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {f.label} {f.required && '*'}
                    </label>
                    {f.type === 'select' ? (
                      <select
                        required={f.required}
                        value={customValues[f.key] || ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Select {f.label} --</option>
                        {(f.options || []).map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required={f.required}
                        value={customValues[f.key] || ''}
                        onChange={e => setCustomValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
            </div>

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
                    <span>Create Deployment Record</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sub-modals for inline creation */}
      <NewCompanyModal
        isOpen={isInlineCompanyModalOpen}
        onClose={() => setIsInlineCompanyModalOpen(false)}
        onSuccess={(newComp) => {
          setCompanies(prev => [...prev, newComp]);
          setSelectedCompanyId(newComp.id);
          setCustomerName(newComp.name);
          loadLocationsForCompany(newComp.id);
        }}
      />

      <NewLocationModal
        isOpen={isInlineLocationModalOpen}
        companyId={selectedCompanyId}
        onClose={() => setIsInlineLocationModalOpen(false)}
        onSuccess={(newLoc) => {
          setCompanyLocations(prev => [...prev, newLoc]);
          setSelectedLocationId(newLoc.id);
          setLocation(newLoc.name);
        }}
      />
    </>
  );
};

export default NewDeploymentModal;
