#!/bin/sh
set -e

CERT_DIR=/mosquitto/persist/certs
CONFIG_DIR=/mosquitto/config

mkdir -p /mosquitto/persist/data "$CERT_DIR"

if [ ! -f "$CERT_DIR/ca.crt" ]; then
  echo "Generating MQTT TLS certificates..."
  openssl req -new -x509 -days 3650 -extensions v3_ca \
    -keyout "$CERT_DIR/ca.key" -out "$CERT_DIR/ca.crt" \
    -nodes -subj "/CN=DroneRadar MQTT CA"
  openssl req -new -nodes \
    -keyout "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" \
    -subj "/CN=droneradar-mqtt.fly.dev"
  openssl x509 -req -in "$CERT_DIR/server.csr" \
    -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" -CAcreateserial \
    -out "$CERT_DIR/server.crt" -days 3650
  rm -f "$CERT_DIR/server.csr" "$CERT_DIR/ca.srl"
  echo "CA certificate (set as MQTT_CA_PEM on Render, base64):"
  base64 -w 0 "$CERT_DIR/ca.crt" 2>/dev/null || base64 "$CERT_DIR/ca.crt" | tr -d '\n'
  echo ""
fi

if [ -z "$MQTT_BACKEND_USER" ] || [ -z "$MQTT_BACKEND_PASSWORD" ]; then
  echo "MQTT_BACKEND_USER and MQTT_BACKEND_PASSWORD must be set (fly secrets)"
  exit 1
fi

MQTT_DRONE_USER="${MQTT_DRONE_USER:-drone-simulator}"
MQTT_DRONE_PASSWORD="${MQTT_DRONE_PASSWORD:-$MQTT_BACKEND_PASSWORD}"

mosquitto_passwd -b -c "$CONFIG_DIR/passwd" "$MQTT_BACKEND_USER" "$MQTT_BACKEND_PASSWORD"
mosquitto_passwd -b "$CONFIG_DIR/passwd" "$MQTT_DRONE_USER" "$MQTT_DRONE_PASSWORD"

cat > "$CONFIG_DIR/acl" <<EOF
# Anonymous drones on :1883
topic write droneradar/telemetry/#

user ${MQTT_BACKEND_USER}
topic read droneradar/telemetry/#

user ${MQTT_DRONE_USER}
topic write droneradar/telemetry/#
EOF

chown mosquitto:mosquitto "$CONFIG_DIR/passwd" "$CONFIG_DIR/acl"
chmod 600 "$CONFIG_DIR/passwd" "$CONFIG_DIR/acl"

chown -R mosquitto:mosquitto /mosquitto/persist/data "$CERT_DIR"
chmod 600 "$CERT_DIR/server.key" 2>/dev/null || true
chmod 644 "$CERT_DIR/ca.crt" "$CERT_DIR/server.crt" 2>/dev/null || true

exec mosquitto -c "$CONFIG_DIR/mosquitto.prod.conf"
