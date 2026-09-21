with open('frontend/src/components/EditLocationModal.tsx', 'r') as f:
    lines = f.readlines()
with open('frontend/src/components/EditLocationModal.tsx', 'w') as f:
    skip = False
    for i, line in enumerate(lines):
        if '<div>' in line and '<label' in lines[i+1] and 'text-slate-700' in lines[i+1] and '<label' in lines[i+2]:
            continue
        if '<label' in line and '<label' in lines[i+1]:
            continue
        f.write(line)
