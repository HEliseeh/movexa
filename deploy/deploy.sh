#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-all}" # all | movexa-back1 | movexa-gateway | movexa-front

build_jhipster() { # $1 = dossier du projet
  echo ">>> Build de $1"
  (cd "$ROOT/$1" && ./mvnw -ntp -Pprod verify jib:dockerBuild -DskipTests)
}

build_frontend() {
  echo ">>> Build du frontend"
  docker build -t movexa-frontend "$ROOT/movexa-front"
}

case "$TARGET" in
  movexa-back1)  build_jhipster movexa-back1 ;;
  movexa-gateway)  build_jhipster movexa-gateway ;;
  movexa-front) build_frontend ;;
  all)      build_jhipster movexa-gateway; build_jhipster movexa-back1; build_frontend ;;
  *) echo "Usage: $0 [all | movexa-back1 | movexa-gateway | movexa-front]"; exit 1;;
esac
cd "$ROOT/deploy"
docker compose --env-file .env up -d

docker compose ps
echo "Registry: http://localhost:8761  |  App: http://localhost"