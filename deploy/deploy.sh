#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-all}" # all | backend | gateway | frontend

build_jhipster() { # $1 = dossier du projet
  echo ">>> Build de $1"
  (cd "$ROOT/$1" && ./mvnw -ntp -Pprod verify jib:dockerBuild -DskipTests)
}

build_frontend() {
  echo ">>> Build du frontend"
  docker build -t movexa-frontend "$ROOT/frontend"
}

case "$TARGET" in
  backend)  build_jhipster backend ;;
  gateway)  build_jhipster gateway ;;
  frontend) build_frontend ;;
  all)      build_jhipster backend; build_jhipster gateway; build_frontend;;
  *) echo "Usage: $0 [all|backend|gateway|frontend]"; exit 1;;
esac
cd "$ROOT/deploy"
docker compose --env-file .env up -d

docker compose ps
echo "Registry: http://localhost:8761  |  App: http://localhost"