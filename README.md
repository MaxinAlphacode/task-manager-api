# Task Manager API

[![CI](https://github.com/MaxinAlphacode/task-manager-api/actions/workflows/ci.yml/badge.svg)](https://github.com/MaxinAlphacode/task-manager-api/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
[![Render](https://img.shields.io/badge/demo-en%20vivo-46E3B7?logo=render&logoColor=white)](https://task-manager-api-9598.onrender.com/api/docs)

API REST de gestión de tareas construida con **Node.js, TypeScript, Express 5, Prisma, PostgreSQL y Zod**, con autenticación JWT, aislamiento de datos por usuario, rate limiting, logs estructurados, documentación OpenAPI, validación, manejo centralizado de errores, paginación, filtros, tests automatizados y despliegue con Docker.

### 🌐 Demo en vivo: **[task-manager-api-9598.onrender.com/api/docs](https://task-manager-api-9598.onrender.com/api/docs)**

Abre Swagger, registra un usuario, pulsa **Authorize** con el token y prueba los endpoints.
> Corre en el plan gratuito de Render: si nadie la usó en los últimos 15 minutos, la primera petición tarda unos 50 segundos mientras el servicio despierta.

## Stack

| Capa | Tecnología | Para qué |
|---|---|---|
| Lenguaje | TypeScript | Tipado estático: errores detectados antes de ejecutar |
| Servidor HTTP | Express 5 | Rutas, middlewares, manejo de errores async nativo |
| Base de datos | PostgreSQL 17 | Persistencia, enums nativos, búsqueda sin distinguir mayúsculas |
| ORM | Prisma 7 (+ adaptador `pg`) | Esquema declarativo, migraciones, consultas tipadas |
| Validación | Zod | Valida entradas y genera los tipos TypeScript |
| Autenticación | JWT (jsonwebtoken) + bcryptjs | Tokens firmados y contraseñas hasheadas |
| Documentación | OpenAPI 3.1 + Swagger UI | Documentación interactiva generada desde los esquemas Zod |
| Seguridad | Helmet, CORS, express-rate-limit | Cabeceras seguras, control de orígenes y límite de peticiones por IP |
| Observabilidad | Pino + pino-http | Logs JSON estructurados con request ID y datos sensibles ocultos |
| Tests | Vitest + Supertest | Tests de integración contra la API y un PostgreSQL real |
| Contenedores | Docker (multi-stage) + Docker Compose | Mismo entorno en cualquier máquina |
| CI | GitHub Actions | Tests, auditoría y prueba de humo en cada push |

## Arquitectura

```
Petición HTTP
   │
   ▼
routes      → qué URL va a qué función            (task.routes.ts)
   │
   ▼
authenticate→ verifica el token JWT               (middlewares/authenticate.ts)
   │
   ▼
controller  → lee req, valida con Zod, responde   (task.controller.ts)
   │
   ▼
service     → lógica de negocio, sin HTTP         (task.service.ts)
   │
   ▼
Prisma      → habla con la base de datos          (lib/prisma.ts)

Cualquier error ─────────────▶ errorHandler → respuesta JSON uniforme
```

```
src/
├── app.ts                 # arma la app Express (sin abrir puerto → testeable)
├── server.ts              # arranca el servidor y maneja el apagado
├── config/env.ts          # valida variables de entorno al iniciar
├── lib/prisma.ts          # cliente único de base de datos (Prisma + adaptador pg)
├── lib/logger.ts          # logger Pino (JSON en producción, legible en desarrollo)
├── generated/prisma/      # cliente de Prisma generado (no se sube a git)
├── middlewares/           # autenticación, logs de peticiones, rate limiting, 404 y errores
├── utils/app-error.ts     # errores HTTP conocidos (400, 401, 404, 409...)
├── types/express.d.ts     # añade req.user al tipo Request de Express
├── docs/openapi.ts        # documento OpenAPI (generado a partir de los esquemas Zod)
└── modules/
    ├── auth/              # registro, login, emisión y verificación de JWT
    └── tasks/             # CRUD de tareas (organización por módulo)
prisma/
├── schema.prisma          # modelo de datos
└── migrations/            # historial de cambios de la base de datos (SQL)
prisma.config.ts           # configuración de Prisma 7 (esquema, migraciones, URL)
tests/                     # tests de integración
Dockerfile                 # imagen de la API (build multi-stage, usuario sin privilegios)
docker-compose.yml         # PostgreSQL + migraciones + API
docker/postgres/           # script que crea la base de tests al iniciar PostgreSQL
scripts/smoke-test.sh      # prueba de humo contra una API ya desplegada
.github/workflows/ci.yml   # pipeline de integración continua
```

## Cómo correrlo

Requisitos: **Docker Desktop**. Para desarrollar, además **Node.js 20.19+**.

```bash
cp .env.example .env         # en PowerShell: Copy-Item .env.example .env
                             # y pon un JWT_SECRET largo y aleatorio (mín. 32 caracteres)
```

### Opción A: todo con Docker (lo más rápido para probarla)

```bash
docker compose up --build -d --wait   # PostgreSQL → migraciones → API
# Abre http://localhost:4000/api/docs
docker compose down                   # apaga todo (los datos se conservan en un volumen)
```

Compose arranca los servicios en orden: `db` (espera a estar *healthy*) → `migrate` (aplica migraciones y termina) → `api` (con *healthcheck* sobre `/api/health`).

### Opción B: desarrollo local (API con recarga automática)

```bash
npm install                  # también genera el cliente de Prisma
npm run db:up                # solo PostgreSQL en Docker (puerto 5433)
npm run db:migrate           # aplica las migraciones
npm run dev                  # http://localhost:4000
```

> Si la Opción A está encendida, apaga su API antes (`docker compose stop api`), porque ambas usan el puerto 4000.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor en modo desarrollo (se reinicia al guardar) |
| `npm test` | Corre los tests contra la base `taskmanager_test` (requiere `npm run db:up`) |
| `npm run build` / `npm start` | Compila a JavaScript y corre la versión de producción |
| `npm run db:up` | Enciende solo PostgreSQL en Docker |
| `npm run db:migrate` | Crea una migración nueva a partir de cambios en `schema.prisma` y la aplica |
| `npm run db:deploy` | Aplica migraciones pendientes (lo que se usa en producción) |
| `npm run db:studio` | Abre una interfaz web para ver la base de datos |
| `npm run docker:up` / `docker:down` | Enciende / apaga todo el stack en Docker |
| `npm run docker:logs` | Muestra los logs de la API en Docker |

### Detalles de la imagen Docker

- **Multi-stage:** la etapa `build` instala todo y compila. La etapa `runtime` solo copia `dist/` y las dependencias de producción.
- Se instala con `npm ci --omit=dev --omit=optional`: `@prisma/client` declara la CLI de Prisma y TypeScript como *peer dependencies* opcionales, y sin el segundo flag terminan en la imagen (≈250 MB más y dependencias con alertas de seguridad). Con él, `npm audit` de producción reporta **0 vulnerabilidades**.
- Corre como usuario `node` (no root), con `HEALTHCHECK` y apagado ordenado ante `SIGTERM`.

## Integración continua (GitHub Actions)

Cada `push` y cada *pull request* a `main` ejecuta [`ci.yml`](.github/workflows/ci.yml) en una máquina limpia:

| Trabajo | Qué comprueba |
|---|---|
| **Typecheck, tests y auditoría** | `npm ci` → `tsc --noEmit` → tests de integración contra un PostgreSQL de servicio → `npm audit` de producción (falla si hay vulnerabilidades altas) |
| **Imagen Docker y prueba de humo** | Solo si el anterior pasó: `docker compose up --build --wait` (db → migrate → api) y [`smoke-test.sh`](scripts/smoke-test.sh): health, registro, 401 sin token, crear y listar tareas |

El pipeline corre con permisos de solo lectura y cancela ejecuciones viejas si llega un push nuevo. Para correr la prueba de humo en local (con Git Bash y el stack encendido):

```bash
sh ./scripts/smoke-test.sh http://localhost:4000
```

## Despliegue (Render + Neon)

```
git push a main
   │
   ▼
GitHub Actions: tests ─▶ Docker + prueba de humo ─▶ prisma migrate deploy (Neon)
   │                                                     │
   │                todo en verde ◀──────────────────────┘
   ▼
Render (autoDeployTrigger: checksPass): construye el Dockerfile y publica
   │
   ▼
Health check en /api/health → recibe tráfico solo si responde 200
```

| Pieza | Servicio | Detalle |
|---|---|---|
| API | **Render** (plan free, Docker) | Definida como código en [`render.yaml`](render.yaml) (Blueprint) |
| Base de datos | **Neon** (PostgreSQL 17, free) | No vence. Se suspende sin uso y despierta en la siguiente consulta |
| Migraciones | **GitHub Actions** | Job `migrate`, solo en `main` y después de tests y Docker |

**Secretos:** `DATABASE_URL` se guarda como secreto en GitHub (`PRODUCTION_DATABASE_URL`) y en el panel de Render. `JWT_SECRET` lo genera Render (`generateValue: true`) y nadie lo conoce. Ninguno de los dos está en el repositorio.

**Orden garantizado:** Render despliega solo cuando el CI completo, incluidas las migraciones, terminó en verde. Así el código nuevo nunca llega antes que las tablas que necesita.

## Documentación interactiva (Swagger)

Con el servidor encendido:

- **http://localhost:4000/api/docs**: Swagger UI para leer y probar cada endpoint desde el navegador.
- **http://localhost:4000/api/docs.json**: la especificación OpenAPI 3.1 en JSON, importable en Postman, Insomnia o generadores de clientes.

Para usar las rutas 🔒: haz `register` o `login`, copia el `token`, pulsa **Authorize** y pégalo.

> Las reglas de entrada de la documentación se generan con `z.toJSONSchema()` a partir de los **mismos esquemas Zod que validan las peticiones**, así que la documentación y la validación no pueden desincronizarse. Un test valida el documento contra el estándar OpenAPI y comprueba que cada ruta documentada exista en la API.

## Endpoints

🔒 = requiere la cabecera `Authorization: Bearer <token>`

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| GET | `/api/health` | Estado del servicio y de la base de datos | 200 / 503 |
| POST | `/api/auth/register` | Crea una cuenta y devuelve un token | 201 / 400 / 409 |
| POST | `/api/auth/login` | Inicia sesión y devuelve un token | 200 / 400 / 401 |
| GET | `/api/auth/me` 🔒 | Datos del usuario autenticado | 200 / 401 |
| GET | `/api/tasks` 🔒 | Lista **tus** tareas (filtros + paginación) | 200 / 401 |
| GET | `/api/tasks/:id` 🔒 | Obtiene una tarea | 200 / 401 / 404 |
| POST | `/api/tasks` 🔒 | Crea una tarea | 201 / 400 / 401 |
| PATCH | `/api/tasks/:id` 🔒 | Actualiza campos de una tarea | 200 / 400 / 401 / 404 |
| DELETE | `/api/tasks/:id` 🔒 | Elimina una tarea | 204 / 401 / 404 |

### Decisiones de seguridad

- **Contraseñas** guardadas con bcrypt (nunca en texto plano ni devueltas en respuestas).
- **JWT** firmado con HS256; el algoritmo se fija al verificar para evitar ataques de tipo `alg: none`.
- **Login sin pistas:** mismo mensaje y tiempo de respuesta si falla el email o la contraseña (evita enumerar usuarios).
- **Aislamiento por usuario:** cada consulta filtra por `userId`. Pedir una tarea ajena responde **404** (no 403), para no revelar que existe.
- **Configuración validada al arrancar:** la app no inicia si falta `JWT_SECRET` o es demasiado corto.
- **Rate limiting contra fuerza bruta:** login y registro permiten 10 intentos **fallidos** por IP cada 15 minutos (los exitosos no cuentan). Al superarlo, ni la contraseña correcta entra hasta que la ventana se reinicie. Toda la API tiene además un límite general de 300 peticiones por IP.

## Logs y rate limiting

### Logs estructurados (Pino)

Cada petición produce **una línea JSON** con método, URL, código, tiempo de respuesta y un **request ID**:

```json
{"level":40,"service":"task-manager-api","req":{"id":"c22b1016-...","method":"POST","url":"/api/auth/login"},"res":{"statusCode":429},"responseTime":1,"msg":"request completed"}
```

- **Request ID:** viaja en la cabecera `X-Request-Id`. Se respeta el que envíe el cliente si es seguro (`[A-Za-z0-9_-]`, máx. 64), o se genera un UUID. Los errores 500 lo devuelven en el cuerpo para poder rastrearlos.
- **Nivel según el resultado:** 5xx → `error`, 4xx → `warn`, resto → `info`. Se controla con `LOG_LEVEL`.
- **Sin secretos:** `Authorization`, cookies, `password`, `passwordHash` y `token` se reemplazan por `[OCULTO]`. Tampoco se registran cabeceras ni cuerpos de las peticiones.
- **Sin ruido:** los health checks de Docker no se registran.
- En desarrollo se usa `pino-pretty` (legible y con colores). En producción, JSON puro, listo para Datadog, Loki o CloudWatch.

### Rate limiting (express-rate-limit)

| Límite | Aplica a | Por defecto |
|---|---|---|
| General | `/api/auth/*`, `/api/tasks/*` | 300 peticiones / 15 min por IP |
| Autenticación | `POST /login`, `POST /register` | 10 intentos **fallidos** / 15 min por IP |

Las respuestas incluyen las cabeceras estándar `RateLimit` y `RateLimit-Policy` (draft-8), por ejemplo `"10-in-15min"; r=3; t=840`. Al superar el límite se responde **429** con `Retry-After`. `/api/health` y `/api/docs` no tienen límite.

**En producción hay que considerar:**
- `TRUST_PROXY` debe ser **exactamente** el número de proxies delante de la API. Si es menor, `req.ip` es la IP de un proxy: los visitantes comparten contador y un atacante obtiene más intentos. Si es mayor, un cliente puede falsificar su IP con la cabecera `X-Forwarded-For`. En Render se usa `2`. Para comprobarlo, la `pk` de la cabecera `RateLimit-Policy` (SHA-256 de la clave) debe coincidir con el hash de la IP pública del cliente y mantenerse igual entre peticiones. En Docker Desktop local todas las peticiones llegan desde la IP del gateway de Docker.
- Los contadores viven en memoria: se reinician con la API y no se comparten entre réplicas. Con varias instancias, conviene un *store* compartido como Redis (`rate-limit-redis`).

**Query params de `GET /api/tasks`:** `status` (PENDING, IN_PROGRESS, DONE), `priority` (LOW, MEDIUM, HIGH), `search` (en título y descripción, sin distinguir mayúsculas), `page`, `limit` (máx. 100), `sortBy` (createdAt, dueDate, priority, title), `order` (asc, desc). Ordenar por `priority` respeta el orden lógico LOW < MEDIUM < HIGH (enum de PostgreSQL), no el alfabético.

### Ejemplo

```bash
# 1. Registrarse (o iniciar sesión) para obtener un token
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Cristian","email":"cristian@example.com","password":"contraseña-segura"}'

# 2. Usar el token para crear una tarea
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Preparar entrevista","priority":"HIGH","dueDate":"2026-12-01T10:00:00Z"}'
```

Error de validación (formato uniforme):

```json
{
  "error": {
    "message": "Datos inválidos",
    "details": [{ "field": "title", "message": "El título es obligatorio" }]
  }
}
```

## Roadmap

- [x] CRUD de tareas con validación, filtros, búsqueda y paginación
- [x] Manejo centralizado de errores y tests de integración
- [x] Usuarios y autenticación con JWT (cada usuario ve solo sus tareas)
- [x] Documentación interactiva con Swagger / OpenAPI
- [x] PostgreSQL + Docker Compose (Prisma 7)
- [x] Logging estructurado y rate limiting
- [x] CI con GitHub Actions (tests, auditoría, build de Docker y prueba de humo)
- [x] Despliegue en la nube (Render + Neon, con migraciones automáticas desde CI)
