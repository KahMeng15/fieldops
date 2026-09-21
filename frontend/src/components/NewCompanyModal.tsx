import React, { useState, useEffect } from 'react';
import { X, Building2, Globe, Mail, Phone, FileText, CheckCircle2 } from 'lucide-react';
import { createCompany, getCompanyFieldSettings, type Company, type CompanyFieldsSettings } from '../api';

interface NewCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (company: Company) => void;
}

export const NewCompanyModal: React.FC<NewCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [fieldSettings, setFieldSettings] = useState<CompanyFieldsSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getCompanyFieldSettings()
        .then(settings => {
          setFieldSettings(settings);
          const nameField = settings.fields.find(f => f.key === 'name');
          const descField = settings.fields.find(f => f.key === 'description');
          const webField = settings.fields.find(f => f.key === 'website');
          const emailField = settings.fields.find(f => f.key === 'contact_email');
          const phoneField = settings.fields.find(f => f.key === 'contact_phone');

          if (nameField?.default_value) setName(nameField.default_value);
          if (descField?.default_value) setDescription(descField.default_value);
          if (webField?.default_value) setWebsite(webField.default_value);
          if (emailField?.default_value) setContactEmail(emailField.default_value);
          if (phoneField?.default_value) setContactPhone(phoneField.default_value);

          const initialCustom: Record<string, string> = {};
          settings.fields
            .filter(f => (f.category === 'profile' || !f.category) && !['name', 'description', 'website', 'contact_email', 'contact_phone'].includes(f.key) && f.enabled)
            .forEach(f => {
              initialCustom[f.key] = f.default_value || '';
            });
          setCustomValues(initialCustom);
        })
        .catch(() => {});
    } else {
      setName('');
      setDescription('');
      setWebsite('');
      setContactEmail('');
      setContactPhone('');
      setCustomValues({});
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Company name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        website: website.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        ...customValues
      };

      const company = await createCompany(payload);
      onSuccess(company);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create company. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-base">Create New Company</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Company Name *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corporation, TechCorp Global"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enterprise account, financial services client..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Website
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="ops@client.com"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Contact Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Dynamic Custom Profile Fields configured in Admin */}
          {fieldSettings?.fields
            .filter(f => (f.category === 'profile' || !f.category) && !['name', 'description', 'website', 'contact_email', 'contact_phone'].includes(f.key) && f.enabled)
            .map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {f.label} {f.required && '*'}
                </label>
                {f.type === 'select' ? (
                  <select
                    required={f.required}
                    value={customValues[f.key] || ''}
                    onChange={(e) => setCustomValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="">-- Select {f.label} --</option>
                    {(f.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    rows={2}
                    required={f.required}
                    value={customValues[f.key] || ''}
                    onChange={(e) => setCustomValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={`Enter ${f.label.toLowerCase()}...`}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    required={f.required}
                    value={customValues[f.key] || ''}
                    onChange={(e) => setCustomValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={`Enter ${f.label.toLowerCase()}...`}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}

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
              disabled={isSubmitting || !name.trim()}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Company</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCompanyModal;
