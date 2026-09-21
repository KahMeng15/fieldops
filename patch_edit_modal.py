with open('frontend/src/components/EditLocationModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "import { updateLocation, type CompanyLocation } from '../api';",
    "import { updateLocation, getStatesDistricts, type CompanyLocation, type StateDistrictItem } from '../api';"
)

content = content.replace(
    "const [city, setCity] = useState('');\n  const [country, setCountry] = useState('');\n  const [datacenterTier, setDatacenterTier] = useState('Tier 3');",
    "const [stateName, setStateName] = useState('');\n  const [district, setDistrict] = useState('');\n  const [statesDistricts, setStatesDistricts] = useState<StateDistrictItem[]>([]);"
)

content = content.replace(
    "setCity(location.city || '');\n      setCountry(location.country || '');\n      setDatacenterTier(location.datacenter_tier || 'Tier 3');",
    "setStateName(location.state || '');\n      setDistrict(location.district || '');"
)

content = content.replace(
    "if (location && isOpen) {",
    "if (isOpen) { getStatesDistricts().then(setStatesDistricts).catch(console.error); }\n    if (location && isOpen) {"
)

payload_old = """        city: city.trim() || undefined,
        country: country.trim() || undefined,
        datacenter_tier: datacenterTier || undefined,"""
payload_new = """        state: stateName || undefined,
        district: district || undefined,"""
content = content.replace(payload_old, payload_new)
content = content.replace("updateLocation(location.id, {", "updateLocation(location.id, {\n" + payload_new + "      // @ts-ignore")

ui_old = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>"""
ui_new = """          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
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
          </div>"""
content = content.replace(ui_old, ui_new)

with open('frontend/src/components/EditLocationModal.tsx', 'w') as f:
    f.write(content)
