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



docker compose exec web python -c \
"import socket; s=socket.create_connection(('rabbitmq',5672),timeout=5); print('RabbitMQ port is reachable'); s.close()"
