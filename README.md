# Task Manager API

API REST de gestión de tareas construida con **Node.js, TypeScript, Express 5, Prisma, PostgreSQL y Zod**, con autenticación JWT, aislamiento de datos por usuario, documentación OpenAPI, validación, manejo centralizado de errores, paginación, filtros, tests automatizados y despliegue con Docker.

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
| Seguridad | Helmet, CORS | Cabeceras seguras y control de orígenes |
| Tests | Vitest + Supertest | Tests de integración contra la API y un PostgreSQL real |
| Contenedores | Docker (multi-stage) + Docker Compose | Mismo entorno en cualquier máquina |

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
├── generated/prisma/      # cliente de Prisma generado (no se sube a git)
├── middlewares/           # autenticación, 404 y manejador global de errores
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
- [ ] Logging estructurado y rate limiting
- [ ] CI con GitHub Actions
- [ ] Despliegue en la nube
