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
echo "=== Current directory ==="
pwd

echo "=== Application directories ==="
ls -ld /var/local/hypothesis /app /srv /usr/src/app 2>/dev/null

echo "=== Authentication implementation ==="
grep -RInE \
"H_AUTHENTICATION_PROVIDER|GITLAB_CLIENT_ID|OIDC_ISSUER_URL" \
/var/local/hypothesis /app /srv /usr/src/app \
--exclude="*.map" --exclude="*.lock" \
2>/dev/null | head -100
'
