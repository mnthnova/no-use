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

echo "=== Authentication settings ==="
grep -RInE \
"H_AUTHENTICATION_PROVIDER|OIDC_AUTHURL|OIDC_CLIENTID|OIDC_CLIENTSECRET|AUTHENTICATION_PROVIDER" \
conf h \
--exclude-dir=migrations \
--exclude-dir=tests \
--exclude="*.map" \
2>/dev/null | head -100

echo "=== Login provider implementation ==="
sed -n "1,240p" h/views/oidc.py
sed -n "1,240p" h/services/oidc.py

echo "=== Login form provider links ==="
sed -n "1,200p" h/static/scripts/components/LoginForm.tsx
'
