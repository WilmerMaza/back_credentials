# back_Credentials

API REST en NestJS con arquitectura hexagonal, CQRS y Prisma (Postgres).

## Setup

1) Copia el archivo `.env.example` a `.env` y ajusta `DATABASE_URL`.
2) Instala dependencias: `npm install`
3) Genera el cliente Prisma: `npm run prisma:generate`
4) Migra la base: `npm run prisma:migrate`
5) Levanta el servidor: `npm run start:dev`

## Swagger

`http://localhost:3000/docs`

## API Key

Si `API_KEY` esta vacio, el guard permite todas las solicitudes. Para activar, define `API_KEY` y usa el header `x-api-key`.

## Uploads

Las imagenes se guardan en `uploads/credentials/`.
