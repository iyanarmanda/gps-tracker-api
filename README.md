<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Description

GPS Tracker API built with [NestJS](https://github.com/nestjs/nest) framework.

## Prerequisites

- [node.js (>= v24)](https://nodejs.org/en)
- [pnpm (>= v12)](https://pnpm.io/id)

Database & Client:

- [Mosquitto](https://mosquitto.org/)
- [Redis](https://redis.io/)
*or*
- [Docker](https://www.docker.com/)

## Project setup

```bash
$ pnpm install
```

Create `.env` variables based on `.env.example`.

Run `pnpm script:hash` to generate hashed password and pepper.

Drizzle ORM configuration:

```bash
# first/instant migration
$ pnpm run db:push

# manual migration
$ pnpm drizzle-kit generate
$ pnpm run db:migrate
```

Seeding database:

```bash
$ pnpm run db:seed
```

If using Docker for create `Redis` and `Mosquitto`:

```bash
# create container
$ docker compose up -d

# delete container
$ docker compose down -v
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# build
$ pnpm run build

# production mode
$ pnpm run start:prod
```

```bash
# Drizzle studio
$ pnpm drizzle-kit studio
```

If using Docker:

```bash
# start containers
$ docker compose start

# stop containers
$ docker compose stop
```

Check the health at `http://localhost:3000/api/v1/health`.

Open Mosquitto client live (*with Docker*):

Publisher:
```bash
docker exec -it tracker-mosquitto sh -c 'mosquitto_sub -h localhost -p 1883 -u "$MQTT_USER" -P "$MQTT_PASSWORD" -t "tracker/devices/+/command" -v'
```

Subscriber:
```bash
docker exec -it tracker-mosquitto sh -c 'mosquitto_sub -h localhost -p 1883 -u "$MQTT_USER" -P "$MQTT_PASSWORD" -t "tracker/#" -v'
```


## Run tests

```bash
# unit tests
$ pnpm run test

# test coverage
$ pnpm run test:cov
```

e2e testing:

```bash
# e2e tests
$ pnpm run test:e2e

# with docker container environment
$ pnpm run test:e2e:up
$ pnpm run test:e2e:down
```

### Manual Testing (*with Docker*)

1. Send telemetry (subscribe)

    ```bash
    docker exec tracker-mosquitto sh -c 'mosquitto_pub -h localhost -p 1883 -u "$MQTT_USER" -P "$MQTT_PASSWORD" \
        -t "tracker/devices/esp32:001/telemetry" \
        -m "{\"device_id\":\"esp32:001\",\"lat\":-7.257472,\"lng\":112.752088,\"speed\":15.4,\"satellites\":8,\"timestamp\":1793701140}"'
    ```

2. Redis telemetry verification

    ```bash
    docker exec tracker-redis redis-cli HGETALL "device:esp32:001:location"

    docker exec tracker-redis redis-cli GEOPOS "active_trackers" "esp32:001"
    ```

3. Send command (publish)

    ```bash
    curl -X PATCH http://localhost:3000/api/v1/devices/esp32:002/command \
        -H "Content-Type: application/json" \
        -d '{"active": true, "interval": 2}'
    ```

    ```bash
    curl -X PATCH http://localhost:3000/api/v1/devices/esp32:002/command \
        -H "Content-Type: application/json" \
        -d '{"active": false}'
    ```

## Run Linter, Formatter, and Type-check

```bash
# linter
$ pnpm run lint

# formatter
$ pnpm run format

# type-check
$ pnpm run check
```

