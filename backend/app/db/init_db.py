from app.db.base import SessionLocal
from app.models import Role, Team, User
from app.core.security import get_password_hash

def init_db():
    try:
        db = SessionLocal()
        admin_role = db.query(Role).filter_by(name="admin").first()
        if not admin_role:
            admin_role = Role(
                name="admin",
                description="Administrator",
                permissions=["create_deployment", "edit_credential", "reveal_credential", "audit_view", "delete_deployment", "create_credential", "manage_settings"]
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

        hq_team = db.query(Team).filter_by(name="HQ Admin").first()
        if not hq_team:
            hq_team = Team(name="HQ Admin", description="Headquarters team")
            db.add(hq_team)
            db.commit()

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
        db.close()
    except Exception as e:
        print(f"init_db startup seeding note: {e}")
