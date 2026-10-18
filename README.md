# Worked For Table Creation

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


curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" http://ip:5005/ws






# Worked For First Time Public Group Creation

docker compose exec -T postgres psql -U postgres -d postgres <<'EOF'
INSERT INTO organization (pubid, name, authority, created, updated)
VALUES ('__default__', 'Hypothesis', 'gitlab.tsip.intratmc.com', now(), now());

INSERT INTO "group"
  (pubid, authority, name, authority_provided_id,
   joinable_by, readable_by, writeable_by,
   enforce_scope, organization_id, created, updated)
VALUES
  ('__world__', 'gitlab.tsip.intratmc.com', 'Public', '__world__',
   NULL, 'world', 'authority',
   false, (SELECT id FROM organization WHERE pubid = '__default__'), now(), now());
EOF











# Worked For Mapping Creation And Index

docker compose exec web python3 -c "import json, h.search.config as c; from h.search.client import get_client; c._ensure_icu_plugin = lambda conn: None; s = json.dumps(c.ANALYSIS_SETTINGS).replace('icu_tokenizer', 'standard').replace('icu_folding', 'asciifolding'); c.ANALYSIS_SETTINGS.clear(); c.ANALYSIS_SETTINGS.update(json.loads(s)); es = get_client({'es.url': 'http://elasticsearch:9200', 'es.index': 'hypothesis'}); c.init(es); print('SUCCESS! Mapping keys:', list(es.conn.indices.get_mapping(index='hypothesis').values())[0]['mappings'].keys())"





docker compose exec web bash -c "
echo '=== 1. ROUTES.PY ==='
sed -n '315,326p' /var/lib/hypothesis/h/routes.py
echo '=== 2. VIEWS/OIDC.PY ==='
cat -n /var/lib/hypothesis/h/views/oidc.py
echo '=== 3. SERVICES/OIDC.PY ==='
cat -n /var/lib/hypothesis/h/services/oidc.py
echo '=== 4. FRONTEND & TEMPLATES WITH GOOGLE ==='
grep -rn 'Continue with Google\|Connected:' /var/lib/hypothesis/
"
