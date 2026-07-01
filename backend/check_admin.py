
from app.database import SessionLocal
from app.models import User, Role

db = SessionLocal()
try:
    admin_user = db.query(User).filter(User.username == 'admin').first()
    if admin_user:
        print(f"User: {admin_user.username}, Role ID: {admin_user.role_id}")
        role = db.query(Role).filter(Role.role_id == admin_user.role_id).first()
        if role:
            print(f"Role Name: {role.role_name}")
    else:
        print("Admin user not found")
        
    all_users = db.query(User).all()
    print("\nAll Users:")
    for u in all_users:
        print(f"- {u.username} (ID: {u.user_id}, Role: {u.role_id})")
        
    all_roles = db.query(Role).all()
    print("\nAll Roles:")
    for r in all_roles:
        print(f"- {r.role_name} (ID: {r.role_id})")
finally:
    db.close()
