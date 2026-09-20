import React, { useState, useEffect } from 'react';
import { X, MapPin, CheckCircle2, Server } from 'lucide-react';
import { updateLocation, type CompanyLocation } from '../api';

interface EditLocationModalProps {
  isOpen: boolean;
  location: CompanyLocation | null;
  onClose: () => void;
  onSuccess: (updatedLocation: CompanyLocation) => void;
}

export const EditLocationModal: React.FC<EditLocationModalProps> = ({
  isOpen,
  location,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [datacenterTier, setDatacenterTier] = useState('Tier 3');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location && isOpen) {
      setName(location.name || '');
      setAddress(location.address || '');
      setCity(location.city || '');
      setCountry(location.country || '');
      setDatacenterTier(location.datacenter_tier || 'Tier 3');
      setNotes(location.notes || '');
      setError(null);
    }
  }, [location, isOpen]);

  if (!isOpen || !location) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Location name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await updateLocation(location.id, {
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        datacenter_tier: datacenterTier || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update location. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-base">Edit Datacenter Location</h3>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Location / Facility Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frankfurt Primary DC, Equinix TY3, HQ Server Room"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Datacenter Tier / Reliability Rating
            </label>
            <div className="relative">
              <Server className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <select
                value={datacenterTier}
                onChange={(e) => setDatacenterTier(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="Tier 1">Tier 1 (Basic Server Room)</option>
                <option value="Tier 2">Tier 2 (Redundant Capacity)</option>
                <option value="Tier 3">Tier 3 (Concurrently Maintainable)</option>
                <option value="Tier 4">Tier 4 (Fault Tolerant)</option>
                <option value="Edge / On-Premise">Edge / On-Premise Facility</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Hanauer Landstraße 320"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Frankfurt"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Germany"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Access Instructions & Rack Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Badge access required at front desk, Cage 4B, Racks 12-15..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLocationModal;
