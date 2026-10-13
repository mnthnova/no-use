docker compose exec web sh -c '
python -c "
import os
from sqlalchemy.engine import make_url
u = make_url(os.environ[\"DATABASE_URL\"])
print(\"Database host:\", u.host)
print(\"Database name:\", u.database)
print(\"Database user:\", u.username)
"
'




docker compose logs --tail=200 web 2>&1 | grep -iE 'create_all|migration|alembic|undefinedtable|traceback|error'
