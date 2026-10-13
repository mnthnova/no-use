docker compose run --rm --entrypoint grep web -o "ENV_ENABLE_[A-Z_]*" /var/lib/hypothesis/conf/supervisord.conf || docker compose run --rm --entrypoint grep web -R "ENV_ENABLE_" /



