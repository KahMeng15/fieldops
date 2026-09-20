import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Server, 
  Plus, 
  Search, 
  ExternalLink, 
  Globe, 
  Mail, 
  ChevronRight
} from 'lucide-react';
import { getCompanies, type Company } from '../api';
import NewCompanyModal from '../components/NewCompanyModal';
import NewLocationModal from '../components/NewLocationModal';

export const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [locationModalTargetCompany, setLocationModalTargetCompany] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await getCompanies(search || undefined);
      setCompanies(data || []);
    } catch (err) {
      console.error('Failed to load companies', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Companies & Locations</h1>
              <p className="text-sm text-slate-500">
                Organize client organizations, configure their datacenter locations, and track deployment records over time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Company</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies by name or description..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
          />
        </div>

        <div className="text-xs font-medium text-slate-500">
          Showing <span className="font-semibold text-slate-800">{companies.length}</span> companies
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <p className="text-sm">Loading companies and locations...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-xl p-8 shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 mb-1">No Companies Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
            {search ? 'No companies match your search criteria.' : 'Create a company first, then set up its datacenter locations and deployment records.'}
          </p>
          <button
            type="button"
            onClick={() => setIsCompanyModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Company</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-base group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        to={`/companies/${company.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 text-base line-clamp-1 transition-colors"
                      >
                        {company.name}
                      </Link>
                      <span className="text-[11px] text-slate-400">
                        Added {new Date(company.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/companies/${company.id}`}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                    title="View company details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>

                {/* Description */}
                {company.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {company.description}
                  </p>
                )}

                {/* Contact metadata */}
                <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {company.contact_email && (
                    <div className="flex items-center space-x-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{company.contact_email}</span>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center space-x-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-blue-600 hover:underline"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Metrics Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] mb-0.5">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>Locations</span>
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      {company.locations_count || 0}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] mb-0.5">
                      <Server className="w-3 h-3 text-blue-600" />
                      <span>Deployments</span>
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      {company.deployments_count || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setLocationModalTargetCompany(company.id)}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Location</span>
                </button>

                <Link
                  to={`/companies/${company.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <span>Explore Locations</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <NewCompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSuccess={() => {
          fetchCompanies();
        }}
      />

      <NewLocationModal
        isOpen={Boolean(locationModalTargetCompany)}
        companyId={locationModalTargetCompany || undefined}
        onClose={() => setLocationModalTargetCompany(null)}
        onSuccess={() => {
          fetchCompanies();
        }}
      />
    </div>
  );
};

export default CompaniesPage;
