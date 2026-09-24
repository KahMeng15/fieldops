import os
import sys

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.getcwd())

from app.db.base import SessionLocal
from app.models import Role, Team, User, Deployment, Credential, DeploymentType
from app.core.security import get_password_hash
from app.core.encryption import encrypt_credential, get_master_key

def seed_data():
    db = SessionLocal()
    master_key = get_master_key()

    try:
        # Create roles
        admin_role = db.query(Role).filter_by(name="admin").first()
        if not admin_role:
            admin_role = Role(
                name="admin",
                description="Administrator",
                permissions=["create_deployment", "edit_credential", "reveal_credential", "audit_view", "delete_deployment", "create_credential"]
            )
            db.add(admin_role)
            db.commit()

        manager_role = db.query(Role).filter_by(name="manager").first()
        if not manager_role:
            manager_role = Role(
                name="manager",
                description="Manager",
                permissions=["create_deployment", "edit_credential"]
            )
            db.add(manager_role)
            db.commit()

        # Create teams
        hq_team = db.query(Team).filter_by(name="HQ Admin").first()
        if not hq_team:
            hq_team = Team(name="HQ Admin", description="Headquarters team")
            db.add(hq_team)
            db.commit()

        # Create admin user
        admin_user = db.query(User).filter_by(username="admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                team_id=hq_team.id,
                role_id=admin_role.id
            )
            db.add(admin_user)
            db.commit()
            print("Admin user created with username: admin, password: admin123")
        else:
            admin_user.password_hash = get_password_hash("admin123")
            db.commit()
            print("Admin user password hash updated to admin123.")

        # Seed sample deployments and credentials ONLY if explicitly enabled via SEED_SAMPLE_DATA=true
        seed_sample_data = os.getenv("SEED_SAMPLE_DATA", "false").lower() in ("true", "1", "yes")
        if seed_sample_data and db.query(Deployment).filter(Deployment.deleted_at == None).count() < 3:
            print("Seeding initial sample deployments and encrypted credentials...")
            
            d1 = Deployment(
                customer_name="Acme Corporation",
                location="US-East (N. Virginia)",
                internal_group_name="Edge-Cluster-Alpha",
                deployment_type=DeploymentType.Deployment,
                pre_poc_status="Active",
                notes="Primary Kubernetes production cluster with high availability ingress and distributed storage nodes.",
                created_by_id=admin_user.id
            )
            db.add(d1)
            db.commit()
            db.refresh(d1)

            c1 = Credential(
                deployment_id=d1.id,
                credential_type="ssh",
                label="Bastion SSH Key",
                encrypted_payload=encrypt_credential({
                    "host": "bastion.acme.prod.internal",
                    "port": 22,
                    "user": "ubuntu",
                    "private_key": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExamplePrivateKeyForDemoOnly"
                }, master_key),
                created_by_id=admin_user.id
            )
            db.add(c1)

            d2 = Deployment(
                customer_name="Global FinTech Ltd",
                location="Europe (Frankfurt FRA-01)",
                internal_group_name="HFT-Gateway",
                deployment_type=DeploymentType.POC,
                pre_poc_status="In Progress",
                notes="Ultra-low latency microservices proof-of-concept testing with direct optical interconnect.",
                created_by_id=admin_user.id
            )
            db.add(d2)
            db.commit()
            db.refresh(d2)

            c2 = Credential(
                deployment_id=d2.id,
                credential_type="database",
                label="PostgreSQL Analytics Replica",
                encrypted_payload=encrypt_credential({
                    "host": "db-analytics.fra.fintech.net",
                    "port": 5432,
                    "username": "readonly_analyst",
                    "password": "FinTechReadOnlyP@ssword2026!",
                    "database": "market_ticks"
                }, master_key),
                created_by_id=admin_user.id
            )
            db.add(c2)

            d3 = Deployment(
                customer_name="Nordic Health Systems",
                location="Stockholm DC-2",
                internal_group_name="PatientRecords-Core",
                deployment_type=DeploymentType.Deployment,
                pre_poc_status="Planning",
                notes="HIPAA/GDPR compliant isolated private cloud deployment. Security audits pending.",
                created_by_id=admin_user.id
            )
            db.add(d3)
            db.commit()
            db.refresh(d3)

            c3 = Credential(
                deployment_id=d3.id,
                credential_type="web_portal",
                label="vCenter Infrastructure Console",
                encrypted_payload=encrypt_credential({
                    "url": "https://vcenter.nordichealth.internal/ui",
                    "username": "administrator@vsphere.local",
                    "password": "SecureHealthCloudP@ss#99",
                    "mfa": "Hardware Yubikey Required"
                }, master_key),
                created_by_id=admin_user.id
            )
            db.add(c3)

            db.commit()
            print("Sample deployments and encrypted credentials successfully seeded.")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
