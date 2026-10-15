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




docker compose exec elasticsearch bin/elasticsearch-plugin install --batch analysis-icu
docker compose restart elasticsearch
docker compose exec web python3 -c "from h.search.client import get_client; from h.search.config import init; es = get_client({'es.url': 'http://elasticsearch:9200', 'es.index': 'hypothesis'}); init(es); print('SUCCESS')"



python3 -c "import h.search.config as c; from h.search.client import get_client; c._ensure_icu_plugin = lambda conn: None; c.ANALYSIS_SETTINGS['analyzer']['default']['tokenizer'] = 'standard'; c.ANALYSIS_SETTINGS['filter']['asciifolding'] = {'type': 'asciifolding'}; es = get_client({'es.url': 'http://elasticsearch:9200', 'es.index': 'hypothesis'}); c.init(es); print('SUCCESS: Hypothesis index created!')"
