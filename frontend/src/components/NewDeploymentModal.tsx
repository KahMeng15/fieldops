import React, { useState } from 'react';
import { X, Server, Building2, MapPin, Tag, FileText, CheckCircle } from 'lucide-react';
import { createDeployment, type DeploymentData } from '../api';

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
  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [deploymentType, setDeploymentType] = useState<'Deployment' | 'POC'>('Deployment');
  const [internalGroupName, setInternalGroupName] = useState('');
  const [status, setStatus] = useState('Planning');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !location.trim()) {
      setError('Customer name and location are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Partial<DeploymentData> = {
        customer_name: customerName.trim(),
        location: location.trim(),
        deployment_type: deploymentType,
        internal_group_name: internalGroupName.trim() || undefined,
        pre_poc_status: status,
        notes: notes.trim() || undefined,
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
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Customer / Organization Name *
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Location / Datacenter *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. US-East (Virginia)"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Deployment Type
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={deploymentType}
                  onChange={e => setDeploymentType(e.target.value as 'Deployment' | 'POC')}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="Deployment">Production Deployment</option>
                  <option value="POC">Proof of Concept (POC)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Internal Group / Team
              </label>
              <input
                type="text"
                value={internalGroupName}
                onChange={e => setInternalGroupName(e.target.value)}
                placeholder="e.g. Edge Infrastructure"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              >
                <option value="Planning">Planning</option>
                <option value="Pre-POC">Pre-POC</option>
                <option value="In Progress">In Progress</option>
                <option value="Staging">Staging</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

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
                placeholder="Details regarding hardware specs, network requirements, or primary point of contact..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
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
