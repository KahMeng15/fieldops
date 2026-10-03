with open('./backend/app/api/endpoints/deployments.py', 'r') as f:
    c = f.read()

target = """    for idx, r in enumerate(rows, start=1):
        cust_name = get_val("customer_name")
        if not cust_name or is_placeholder(cust_name):
            continue

        # Find or create company
        comp = db.query(Company).filter(Company.name.ilike(cust_name), Company.deleted_at == None).first()
        if not comp:
            comp = Company(name=cust_name)
            db.add(comp)
            db.flush()
            companies_created += 1

        # Products to create deployments for
        products_to_create = []
        
        p1_name = get_val("product_1")
        if not p1_name:
            # Detect product from end of customer_name (e.g., 'Test Company HCI' -> 'HCI')
            parts = cust_name.replace('-', ' ').split()
            if parts and parts[-1].isupper():
                p1_name = parts[-1]
            else:
                p1_name = None

        p1_qty_str = get_val("product_1_qty", "1")
        p1_qty = int(p1_qty_str) if p1_qty_str.isdigit() else 1
        
        products_to_create.append({"product": p1_name, "qty": p1_qty})"""


replacement = """    for idx, r in enumerate(rows, start=1):
        cust_name = get_val("customer_name")
        if not cust_name or is_placeholder(cust_name):
            continue

        p1_name = get_val("product_1")
        
        # Extract product from customer_name if separated by dash or trailing uppercase
        if "-" in cust_name:
            parts = cust_name.split("-")
            p1_extracted = parts[-1].strip()
            cust_name = "-".join(parts[:-1]).strip()
            if not p1_name and p1_extracted:
                p1_name = p1_extracted
        elif not p1_name:
            parts = cust_name.split()
            if len(parts) > 1 and parts[-1].isupper():
                p1_name = parts[-1]
                cust_name = " ".join(parts[:-1]).strip()

        # Find or create company
        comp = db.query(Company).filter(Company.name.ilike(cust_name), Company.deleted_at == None).first()
        if not comp:
            comp = Company(name=cust_name)
            db.add(comp)
            db.flush()
            companies_created += 1

        # Products to create deployments for
        products_to_create = []
        
        p1_qty_str = get_val("product_1_qty", "1")
        p1_qty = int(p1_qty_str) if p1_qty_str.isdigit() else 1
        
        products_to_create.append({"product": p1_name, "qty": p1_qty})"""

if target in c:
    c = c.replace(target, replacement)
    print("Patched successfully!")
else:
    print("Could not find target!")

with open('./backend/app/api/endpoints/deployments.py', 'w') as f:
    f.write(c)

