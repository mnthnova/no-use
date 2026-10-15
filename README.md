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



      - H_AUTHENTICATION_PROVIDER=gitlab
      
      # ORCID Dummy Config
      - OIDC_CLIENTID_ORCID=dummy
      - OIDC_CLIENTSECRET_ORCID=dummy
      - OIDC_AUTHURL_ORCID=http://dummy
      - OIDC_TOKENURL_ORCID=http://dummy
      - OIDC_PROFILEURL_ORCID=http://dummy
      - OIDC_KEYSETURL_ORCID=http://dummy
      - OIDC_ISSUERURL_ORCID=http://dummy

      # Google Dummy Config
      - OIDC_CLIENTID_GOOGLE=dummy
      - OIDC_CLIENTSECRET_GOOGLE=dummy
      - OIDC_AUTHURL_GOOGLE=http://dummy
      - OIDC_TOKENURL_GOOGLE=http://dummy
      - OIDC_PROFILEURL_GOOGLE=http://dummy
      - OIDC_KEYSETURL_GOOGLE=http://dummy
      - OIDC_ISSUERURL_GOOGLE=http://dummy

      # Facebook Dummy Config
      - OIDC_CLIENTID_FACEBOOK=dummy
      - OIDC_CLIENTSECRET_FACEBOOK=dummy
      - OIDC_AUTHURL_FACEBOOK=http://dummy
      - OIDC_TOKENURL_FACEBOOK=http://dummy
      - OIDC_PROFILEURL_FACEBOOK=http://dummy
      - OIDC_KEYSETURL_FACEBOOK=http://dummy
      - OIDC_ISSUERURL_FACEBOOK=http://dummy
