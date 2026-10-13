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
'grep -R -n -E "MODEL_CREATE_ALL|create_all\(" /usr/local/lib/python3.11/site-packages/hypothesis 2>/dev/null | head -80'
