# Task Manager API

API REST de gestión de tareas construida con **Node.js, TypeScript, Express 5, Prisma y Zod**, con validación de datos, manejo centralizado de errores, paginación, filtros y tests automatizados.

## Stack

| Capa | Tecnología | Para qué |
|---|---|---|
| Lenguaje | TypeScript | Tipado estático: errores detectados antes de ejecutar |
| Servidor HTTP | Express 5 | Rutas, middlewares, manejo de errores async nativo |
| Base de datos | SQLite (dev) → PostgreSQL (prod) | Persistencia |
| ORM | Prisma | Esquema declarativo, migraciones, consultas tipadas |
| Validación | Zod | Valida entradas y genera los tipos TypeScript |
| Seguridad | Helmet, CORS | Cabeceras seguras y control de orígenes |
| Tests | Vitest + Supertest | Tests de integración contra la API real |

## Arquitectura

```
Petición HTTP
   │
   ▼
routes      → qué URL va a qué función            (task.routes.ts)
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
├── lib/prisma.ts          # cliente único de base de datos
├── middlewares/           # 404 y manejador global de errores
├── utils/app-error.ts     # errores HTTP conocidos (404, 400...)
└── modules/tasks/         # todo lo de "tareas" junto (organización por módulo)
prisma/schema.prisma       # modelo de datos
tests/                     # tests de integración
```

## Cómo correrlo

```bash
npm install
cp .env.example .env         # en PowerShell: Copy-Item .env.example .env
npm run db:migrate           # crea la base de datos y las tablas
npm run dev                  # http://localhost:3000
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor en modo desarrollo (se reinicia al guardar) |
| `npm test` | Corre los tests |
| `npm run build` / `npm start` | Compila a JavaScript y corre la versión de producción |
| `npm run db:studio` | Abre una interfaz web para ver la base de datos |

## Endpoints

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| GET | `/api/health` | Estado del servicio | 200 |
| GET | `/api/tasks` | Lista tareas (filtros + paginación) | 200 |
| GET | `/api/tasks/:id` | Obtiene una tarea | 200 / 404 |
| POST | `/api/tasks` | Crea una tarea | 201 / 400 |
| PATCH | `/api/tasks/:id` | Actualiza campos de una tarea | 200 / 400 / 404 |
| DELETE | `/api/tasks/:id` | Elimina una tarea | 204 / 404 |

**Query params de `GET /api/tasks`:** `status` (PENDING, IN_PROGRESS, DONE), `priority` (LOW, MEDIUM, HIGH), `search`, `page`, `limit` (máx. 100), `sortBy` (createdAt, dueDate, priority, title), `order` (asc, desc).

### Ejemplo

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
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
- [ ] Usuarios y autenticación con JWT (cada usuario ve solo sus tareas)
- [ ] Documentación interactiva con Swagger / OpenAPI
- [ ] PostgreSQL + Docker Compose
- [ ] Logging estructurado y rate limiting
- [ ] CI con GitHub Actions
- [ ] Despliegue en la nube
