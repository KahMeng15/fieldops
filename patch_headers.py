import re

# 1. Patch CompaniesPage
with open('./frontend/src/pages/CompaniesPage.tsx', 'r') as f:
    c = f.read()

target_companies = """      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Companies</h1>
              <p className="text-sm text-slate-500">
                Organize client organizations, configure their datacenter locations, and track deployment records over time.
              </p>
            </div>
          </div>
        </div>"""

replacement_companies = """      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize client organizations, configure their datacenter locations, and track deployment records over time.
          </p>
        </div>"""

c = c.replace(target_companies, replacement_companies)

with open('./frontend/src/pages/CompaniesPage.tsx', 'w') as f:
    f.write(c)

# 2. Patch DeploymentsPage
with open('./frontend/src/pages/DeploymentsPage.tsx', 'r') as f:
    d = f.read()

target_deployments = """      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Deployments
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage customer infrastructure, hardware tracking, and access credentials.
              </p>
            </div>
          </div>
        </div>"""

replacement_deployments = """      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Deployments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customer infrastructure, hardware tracking, and access credentials.
          </p>
        </div>"""

d = d.replace(target_deployments, replacement_deployments)

with open('./frontend/src/pages/DeploymentsPage.tsx', 'w') as f:
    f.write(d)

