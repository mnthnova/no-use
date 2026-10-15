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




python3 -c "import h.search.config as c; from h.search.client import get_client; c._ensure_icu_plugin = lambda conn: None; [v.update({'tokenizer': 'standard'}) for v in c.ANALYSIS_SETTINGS.get('analyzer', {}).values() if v.get('tokenizer') == 'icu_tokenizer']; [v.update({'type': 'asciifolding'}) for v in c.ANALYSIS_SETTINGS.get('filter', {}).values() if v.get('type') == 'icu_folding']; es = get_client({'es.url': 'http://elasticsearch:9200', 'es.index': 'hypothesis'}); c.init(es); print('SUCCESS: Hypothesis index created!')"




python3 -c "from h.search.client import get_client; es = get_client({'es.url': 'http://elasticsearch:9200', 'es.index': 'hypothesis'}); es.conn.indices.create(index='hypothesis', ignore=400); print('SUCCESS: Base index created!')"
