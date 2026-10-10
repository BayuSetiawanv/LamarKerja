from app.models.user import User
from app.models.cv import CV

# Ini penting agar Alembic tahu tabel apa saja yang harus dibuat
__all__ = ["User", "CV"]