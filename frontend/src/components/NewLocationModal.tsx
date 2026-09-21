import React, { useState, useEffect } from 'react';
import { X, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { createCompanyLocation, getCompanies, getStatesDistricts, type Company, type CompanyLocation, type StateDistrictItem } from '../api';

interface NewLocationModalProps {
  isOpen: boolean;
  companyId?: string;
  onClose: () => void;
  onSuccess: (location: CompanyLocation) => void;
}

export const NewLocationModal: React.FC<NewLocationModalProps> = ({
  isOpen,
  companyId: initialCompanyId,
  onClose,
  onSuccess,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId || '');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [statesDistricts, setStatesDistricts] = useState<StateDistrictItem[]>([]);
    const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialCompanyId) {
        setSelectedCompanyId(initialCompanyId);
      } else {
        getCompanies().then(comps => {
          setCompanies(comps);
          if (comps.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(comps[0].id);
          }
        }).catch(() => {});
      }
      getStatesDistricts().then(setStatesDistricts).catch(() => {});
    }
  }, [isOpen, initialCompanyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      setError('Please select a company.');
      return;
    }
    if (!name.trim()) {
      setError('Location name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const loc = await createCompanyLocation(selectedCompanyId, {
        name: name.trim(),
        address: address.trim() || undefined,
        state: stateName || undefined,
        district: district || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess(loc);
      onClose();
      // Reset form
      setName('');
      setAddress('');
      setStateName('');
      setDistrict('');
      setNotes('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create location. Please try again.');
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
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-base">Add Location to Company</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {!initialCompanyId && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Company *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">-- Choose Company --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Location Name / Identifier *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Singapore Equinix SG1, Frankfurt FRA-01, Ashburn DC"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">State</label>
              <select value={stateName} onChange={e => { setStateName(e.target.value); setDistrict(''); }} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                <option value="">-- Select State --</option>
                {statesDistricts.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">District</label>
              <select value={district} onChange={e => setDistrict(e.target.value)} disabled={!stateName} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-500">
                <option value="">-- Select District --</option>
                {statesDistricts.find(s => s.state === stateName)?.districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Street / Facility Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="20 Ayer Rajah Crescent"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Notes & Access Info
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cage number, rack specifications, primary site contact..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

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
                <span>Adding...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Add Location</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewLocationModal;
