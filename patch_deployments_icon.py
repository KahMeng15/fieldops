import re

with open('./frontend/src/pages/DeploymentsPage.tsx', 'r') as f:
    c = f.read()

target = "import { "
replacement = "import { \n  Server,"

c = c.replace(target, replacement, 1)

with open('./frontend/src/pages/DeploymentsPage.tsx', 'w') as f:
    f.write(c)
