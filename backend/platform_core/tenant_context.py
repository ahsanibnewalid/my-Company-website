from contextlib import contextmanager
from django.db import connection, transaction
@contextmanager
def tenant_database_context(verified_tenant_id):
    """Transaction-local RLS context; only call with tenant ID already verified via membership."""
    if not verified_tenant_id:
        raise ValueError("verified_tenant_id is required")
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("SELECT set_config('app.tenant_id', %s, true)", [str(verified_tenant_id)])
        yield
