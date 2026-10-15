docker compose exec web python -c '
import os
from sqlalchemy import create_engine
from h import models
from h.db import Base, pre_create

engine = create_engine(os.environ["DATABASE_URL"])
pre_create(engine)
Base.metadata.create_all(engine)
print("Hypothesis database tables created.")
'


PG_VOLUME=$(docker inspect "$PG_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')

echo "PostgreSQL volume: $PG_VOLUME"



python3 -c "from h.search.client import get_client; es = get_client({'es.url': 'http://elasticsearch:9200', 'es.index': 'hypothesis'}); es.conn.indices.create(index='hypothesis', ignore=400); print('SUCCESS: Base index created!')"



docker compose exec web sh -lc '
cd /var/lib/hypothesis || exit 1
echo "=== Provider enum ==="
grep -n -A35 -B5 "class IdentityProvider" h/models/user_identity.py
echo "=== OIDC callback and routes ==="
grep -n -E "oidc.redirect|def redirect|add_route|add_view|route_name=" h/views/oidc.py
echo "=== OIDC service ==="
sed -n "1,180p" h/services/oidc.py
echo "=== Login provider buttons ==="
grep -n -E -i "orcid|google|facebook|SocialLoginLink" h/static/scripts/components/LoginForm.tsx
'
