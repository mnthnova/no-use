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

echo "=== GitLab/OIDC references in Hypothesis source ==="
grep -RInE \
"H_AUTHENTICATION_PROVIDER|GITLAB_CLIENT_ID|GITLAB_CLIENT_SECRET|GITLAB_BASE_URL|OIDC_ISSUER_URL|gitlab" \
h conf bin \
--exclude="*.map" \
--exclude="*.lock" \
2>/dev/null | head -100

echo "=== Authentication-related source files ==="
find h conf -type f 2>/dev/null |
grep -Ei "auth|login|oauth|oidc|provider"
'
