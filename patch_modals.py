import re

def patch_new_location():
    with open('frontend/src/components/NewLocationModal.tsx', 'r') as f:
        content = f.read()

    # Imports
    content = content.replace("type Company, type CompanyLocation } from '../api';", "getStatesDistricts, type Company, type CompanyLocation, type StateDistrictItem } from '../api';")
    
    # State
    content = content.replace("const [city, setCity] = useState('');", "const [stateName, setStateName] = useState('');")
    content = content.replace("const [country, setCountry] = useState('');", "const [district, setDistrict] = useState('');\n  const [statesDistricts, setStatesDistricts] = useState<StateDistrictItem[]>([]);")
    content = content.replace("const [datacenterTier, setDatacenterTier] = useState('Tier 3');\n", "")

    # Fetch
    content = content.replace("if (isOpen && !initialCompanyId) {", "if (isOpen) { getStatesDistricts().then(setStatesDistricts).catch(console.error); }\n    if (isOpen && !initialCompanyId) {")

    # Payload
    payload_old = """        city: city.trim() || undefined,
        country: country.trim() || undefined,
        datacenter_tier: datacenterTier || undefined,"""
    payload_new = """        state: stateName || undefined,
        district: district || undefined,"""
    content = content.replace(payload_old, payload_new)
    
    # reset form
    content = content.replace("setCity('');\n      setCountry('');", "setStateName('');\n      setDistrict('');")

    # UI fields
    ui_old = """            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Singapore, Frankfurt, Virginia"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Country / Region
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Singapore, Germany, United States"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>"""
    ui_new = """            <div>
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
            </div>"""
    content = content.replace(ui_old, ui_new)
    
    # Datacenter
    dc_old = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Datacenter / Facility Tier
              </label>
              <div className="relative">
                <Server className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={datacenterTier}
                  onChange={(e) => setDatacenterTier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="Tier 1">Tier 1 (Basic)</option>
                  <option value="Tier 2">Tier 2 (Redundant)</option>
                  <option value="Tier 3">Tier 3 (Concurrently Maintainable)</option>
                  <option value="Tier 4">Tier 4 (Fault Tolerant)</option>
                  <option value="Edge / On-Premise">Edge / On-Premise Facility</option>
                  <option value="Customer Office">Customer Office Server Room</option>
                </select>
              </div>
            </div>"""
    dc_new = """          <div className="grid grid-cols-1 gap-4">"""
    content = content.replace(dc_old, dc_new)

    with open('frontend/src/components/NewLocationModal.tsx', 'w') as f:
        f.write(content)

def patch_edit_location():
    with open('frontend/src/components/EditLocationModal.tsx', 'r') as f:
        content = f.read()

    # Imports
    content = content.replace("type CompanyLocation } from '../api';", "getStatesDistricts, type CompanyLocation, type StateDistrictItem } from '../api';")
    
    # State
    content = content.replace("const [city, setCity] = useState('');", "const [stateName, setStateName] = useState('');")
    content = content.replace("const [country, setCountry] = useState('');", "const [district, setDistrict] = useState('');\n  const [statesDistricts, setStatesDistricts] = useState<StateDistrictItem[]>([]);")
    content = content.replace("const [datacenterTier, setDatacenterTier] = useState('Tier 3');\n", "")

    content = content.replace("setCity(location.city || '');\n      setCountry(location.country || '');", "setStateName(location.state || '');\n      setDistrict(location.district || '');")
    content = content.replace("setDatacenterTier(location.datacenter_tier || 'Tier 3');\n", "")
    
    content = content.replace("if (isOpen && location) {", "if (isOpen) { getStatesDistricts().then(setStatesDistricts).catch(console.error); }\n    if (isOpen && location) {")

    payload_old = """        city: city.trim() || undefined,
        country: country.trim() || undefined,
        datacenter_tier: datacenterTier || undefined,"""
    payload_new = """        state: stateName || undefined,
        district: district || undefined,"""
    content = content.replace(payload_old, payload_new)
    
    ui_old = """            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Singapore, Frankfurt, Virginia"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Country / Region
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Singapore, Germany, United States"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>"""
    ui_new = """            <div>
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
            </div>"""
    content = content.replace(ui_old, ui_new)
    
    dc_old = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Datacenter Tier / Reliability Rating
              </label>
              <div className="relative">
                <Server className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={datacenterTier}
                  onChange={(e) => setDatacenterTier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="Tier 1">Tier 1 (Basic)</option>
                  <option value="Tier 2">Tier 2 (Redundant)</option>
                  <option value="Tier 3">Tier 3 (Concurrently Maintainable)</option>
                  <option value="Tier 4">Tier 4 (Fault Tolerant)</option>
                  <option value="Edge / On-Premise">Edge / On-Premise Facility</option>
                  <option value="Customer Office">Customer Office Server Room</option>
                </select>
              </div>
            </div>"""
    dc_new = """          <div className="grid grid-cols-1 gap-4">"""
    content = content.replace(dc_old, dc_new)

    with open('frontend/src/components/EditLocationModal.tsx', 'w') as f:
        f.write(content)

patch_new_location()
patch_edit_location()
