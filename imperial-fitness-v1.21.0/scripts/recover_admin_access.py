"""Diagnostica o desbloquea un administrador sin cambiar su contraseña.

Diagnóstico (solo lectura): python scripts/recover_admin_access.py
Recuperar uno:             python scripts/recover_admin_access.py --email admin@dominio.com --unlock

Usa DATABASE_URL del entorno. No crea administradores ni eleva clientes a admin.
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone

from sqlalchemy import create_engine, text


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email")
    parser.add_argument("--unlock", action="store_true")
    args = parser.parse_args()
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        print("ERROR: define DATABASE_URL en el entorno.", file=sys.stderr)
        return 1
    engine = create_engine(url, pool_pre_ping=True)
    with engine.begin() as connection:
        rows = connection.execute(text("""
            select id,email,name,role,status,failed_login_attempts,locked_until
            from public.users where lower(role)='admin' order by id
        """)).mappings().all()
        if not rows:
            print("ERROR: no existe ninguna cuenta con role=admin.", file=sys.stderr)
            return 2
        for row in rows:
            print(f"admin id={row['id']} email={row['email']} status={row['status']} attempts={row['failed_login_attempts']} locked_until={row['locked_until']}")
        if not args.unlock:
            return 0
        if not args.email:
            print("ERROR: --unlock requiere --email para evitar modificar la cuenta equivocada.", file=sys.stderr)
            return 2
        target = connection.execute(text("select id,role from public.users where lower(email)=lower(:email)"), {"email": args.email}).mappings().first()
        if not target or str(target["role"]).lower() != "admin":
            print("ERROR: el correo indicado no corresponde a un administrador existente.", file=sys.stderr)
            return 2
        result = connection.execute(text("""
            update public.users
               set status='active', failed_login_attempts=0, locked_until=null,
                   status_changed_at=:now, activated_at=coalesce(activated_at,:now)
             where id=:id
        """), {"id": target["id"], "now": datetime.now(timezone.utc).replace(tzinfo=None)})
        print(f"OK: administrador desbloqueado/reactivado. Filas modificadas={result.rowcount}. Contraseña intacta.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
