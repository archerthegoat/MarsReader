#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-qmreader}"
APP_DIR="${APP_DIR:-/opt/qiaomu-apps/qmreader}"
PORT="${PORT:-3088}"
HOST="${HOST:-127.0.0.1}"
STARTUP_REFRESH_DELAY_MS="${STARTUP_REFRESH_DELAY_MS:--1}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
NPM_BIN="${NPM_BIN:-$(command -v npm)}"
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

if [[ "$(id -u)" != "0" ]]; then
  echo "Please run as root because systemd unit installation requires it." >&2
  exit 1
fi

if [[ -z "${NODE_BIN}" || ! -x "${NODE_BIN}" ]]; then
  echo "node executable not found." >&2
  exit 1
fi

if [[ -z "${NPM_BIN}" || ! -x "${NPM_BIN}" ]]; then
  echo "npm executable not found." >&2
  exit 1
fi

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "package.json not found in ${APP_DIR}." >&2
  exit 1
fi

cd "${APP_DIR}"
"${NPM_BIN}" ci --omit=dev

cat > "${UNIT_PATH}" <<UNIT
[Unit]
Description=QMReader RSS asset site
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=HOST=${HOST}
Environment=PORT=${PORT}
Environment=STARTUP_REFRESH_DELAY_MS=${STARTUP_REFRESH_DELAY_MS}
ExecStart=${NODE_BIN} ${APP_DIR}/server.js
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"
systemctl restart "${SERVICE_NAME}.service"
systemctl --no-pager --full status "${SERVICE_NAME}.service"
