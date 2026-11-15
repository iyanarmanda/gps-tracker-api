<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Description

GPS Tracker API built with [NestJS](https://github.com/nestjs/nest) framework.

## Prerequisites

- [node.js (>= v22)](https://nodejs.org/en)
- [pnpm](https://pnpm.io/id)

Database & Client:

- [Mosquitto](https://mosquitto.org/)
- [Redis](https://redis.io/)
*or*
- [Docker](https://www.docker.com/)

## Project setup

```bash
$ pnpm install
```

Drizzle ORM configuration:

```bash
# first/instant migration
$ pnpm db:push

# manual migration
$ pnpm drizzle-kit generate
$ pnpm drizzle-kit migration
```

Seeding database:

```bash
$ pnpm db:seed
```

If using Docker for create `Redis` and `Mosquitto`:

```bash
# create container
$ docker compose up -d

# delete container
$ docker compose down -V
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

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

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Run Linter, Formatter, and Type-check

```bash
# linter
$ pnpm lint

# formatter
$ pnpm format

# type-check
$ pnpm check
```

