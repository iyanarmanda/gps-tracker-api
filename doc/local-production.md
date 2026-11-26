# Local Production Setup

## Setup Used in Local Environment

A registered domain is required for this setup.

| Field               | Specification       |
|---------------------|---------------------|
| OS                  | Arch/Cahcyos Linux  |
| TLS (cert)          | Certbot             |
| DNS & Proxy         | Cloudflare          |
| TCP Port Forwarding | Ngrok               |

## Steps

### Create TLS for Mosquitto

Use `certbot` to generate a TLS certificate via DNS-01 challenge:

```sh
sudo certbot certonly --manual --preferred-challenges dns -d mqtt.domain.com
```

Certbot will provide a DNS `TXT` record to register on Cloudflare. Once propagated, continue the prompt to generate the certificate and private key, then copy them to `./mosquitto/certs/`:

```sh
sudo cp /etc/letsencrypt/live/[mqtt.domain.com/fullchain.pem](https://mqtt.domain.com/fullchain.pem) ./mosquitto/certs/
sudo cp /etc/letsencrypt/live/[mqtt.domain.com/privkey.pem](https://mqtt.domain.com/privkey.pem) ./mosquitto/certs/
```

Set ownership to the Mosquitto container user (`UID:GID 1883`) and restrict private key permissions:

```sh
sudo chown 1883:1883 ./mosquitto/certs/fullchain.pem ./mosquitto/certs/privkey.pem
sudo chmod 644 ./mosquitto/certs/fullchain.pem
sudo chmod 600 ./mosquitto/certs/privkey.pem
```

Create a new TCP tunnel with `ngrok` forwarding to port `8883`, then register a `CNAME` record (`mqtt` -> `<ngrok-host>`) on Cloudflare with **DNS Only** (gray cloud) mode:

```sh
ngrok tcp 8883
```

### ESP32 Setup

Retrieve the `ISRG Root X1` CA certificate on Arch/Cachyos Linux (provided by `ca-certificates`):

```sh
cat /etc/ssl/certs/ISRG_Root_X1.pem
```

Copy the entire output into `MQTT_ROOT_CA` inside `secrets.h` on the ESP32 firmware:

```txt
-----BEGIN CERTIFICATE-----
xxx
-----END CERTIFICATE-----
```

Fill in `MQTT_PORT` with the dynamic port assigned by `ngrok` (along with your Wi-Fi and MQTT broker credentials).

### `.env.production` Setup

Configure the local backend to connect to Mosquitto over the internal plaintext port `1883` (`mqtt://127.0.0.1:1883`). Keep the remaining variables aligned with `.env.example` (ensure `PORT=3000` matches the Cloudflare Tunnel ingress config).

### Test

Verify the end-to-end TLS handshake and SNI through the public tunnel:

```sh
openssl s_client -connect mqtt.domain.com:<PORT_TUNNEL> -servername mqtt.domain.com < /dev/null
```

### API & Web Deployment

> **Note:** Make sure both services are running locally in production mode before starting the tunnel:
> - **API (port `3000`):** `pnpm build && pnpm start:prod`
> - **Web (port `4173`):** `pnpm build && pnpm preview --host 127.0.0.1 --port 4173`

Create a Cloudflare Tunnel with `cloudflared`:

```sh
cloudflared tunnel create gps-tracker
```

Add the Tunnel UUID and ingress rules to `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /home/<USER>/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: api.domain.com
    service: http://127.0.0.1:3000
  - hostname: tracker.domain.com
    service: http://127.0.0.1:4173
  - service: http_status:404
```

Register the DNS routes to Cloudflare:

```sh
cloudflared tunnel route dns gps-tracker api.domain.com
cloudflared tunnel route dns gps-tracker tracker.domain.com
```

Run the tunnel to expose the API and Web dashboard publicly:

```sh
cloudflared tunnel run gps-tracker
```

## Usage

Manage production Docker containers:

```bash
# create and run containers
pnpm docker:prod:up

# start existing containers
pnpm docker:prod:start

# stop containers
pnpm docker:prod:stop

# remove containers and volumes
pnpm docker:prod:down
```

Run database migrations and seeding on production SQLite:

```bash
# apply SQL migrations
pnpm db:migrate:prod

# seed initial device data
pnpm db:seed:prod
```

