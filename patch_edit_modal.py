import re

with open("frontend/src/components/EditDeploymentModal.tsx", "r") as f:
    content = f.read()

# Add SearchableSelect import
if "SearchableSelect" not in content:
    content = content.replace(
        "import { X, Calendar, MapPin, Building2, Tag, CheckCircle2, User, Users, FileText, FolderOpen } from 'lucide-react';",
        "import { X, Calendar, MapPin, Building2, Tag, CheckCircle2, User, Users, FileText, FolderOpen } from 'lucide-react';\nimport { SearchableSelect } from './SearchableSelect';"
    )

# Change assistingEngineers state
content = content.replace(
    "const [assistingEngineers, setAssistingEngineers] = useState('');",
    "const [assistingEngineers, setAssistingEngineers] = useState<string[]>([]);"
)
content = content.replace(
    "setAssistingEngineers(deployment.assisting_engineers || '');",
    "setAssistingEngineers(deployment.assisting_engineers ? deployment.assisting_engineers.split(', ').filter(Boolean) : []);"
)
content = content.replace(
    "assisting_engineers: assistingEngineers.trim() || undefined,",
    "assisting_engineers: assistingEngineers.length > 0 ? assistingEngineers.join(', ') : undefined,"
)

# Product Dropdown replacement
prod_orig = """                    <select
                      value={deployedProduct}
                      required
                      onChange={e => {
                        setDeployedProduct(e.target.value);
                        if (e.target.value !== 'Other') {
                          setOtherValues(prev => ({ ...prev, deployed_product: '' }));
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                    >
                      <option value="">-- Select Product --</option>
                      {(getField('deployed_product')?.options || ['FieldOps Core Gateway', 'FieldOps Edge Device']).map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option value="Other">Other (Specify...)</option>
                    </select>"""
prod_new = """                    <div className="pl-8">
                      <SearchableSelect
                        value={deployedProduct}
                        onChange={(v) => setDeployedProduct(v as string)}
                        options={getField('deployed_product')?.options || ['FieldOps Core Gateway', 'FieldOps Edge Device']}
                        allowOther={getField('deployed_product')?.allow_other ?? true}
                        placeholder="-- Select Product --"
                      />
                    </div>"""
content = content.replace(prod_orig, prod_new)

# Note: EditDeploymentModal.tsx might not have `<option value="Other">Other (Specify...)</option>` or it might. Let me check its precise structure. 
