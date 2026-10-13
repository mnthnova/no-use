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




docker compose exec web sh -lc \
'env | grep -E "^(MODEL_CREATE_ALL|DATABASE_URL|ENABLE_WEB|ENABLE_WORKER|WEB_NUM_WORKERS)=" | sed "s/^DATABASE_URL=.*/DATABASE_URL=[REDACTED]/"'
