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



grep -RInE \
'H_AUTHENTICATION_PROVIDER|GITLAB_CLIENT_ID|OIDC_ISSUER_URL|GITLAB_BASE_URL' \
. \
--exclude-dir=.git \
--exclude-dir=node_modules \
--exclude='*.lock' \
--exclude='*.map' \
2>/dev/null | head -100



docker compose exec web sh -lc '
printf "H_AUTHENTICATION_PROVIDER=%s\n" "$H_AUTHENTICATION_PROVIDER"
printf "OIDC_ISSUER_URL=%s\n" "$OIDC_ISSUER_URL"
printf "GITLAB_BASE_URL=%s\n" "$GITLAB_BASE_URL"
'
