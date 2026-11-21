# Entrega 5 · Backend 2 Coderhouse — Roles y autorización

API de la **Plataforma de Eventos e Inscripciones** con autenticación por JWT en cookie `httpOnly` y un sistema de **autorización por roles** (`user`, `organizer`, `admin`) basado en middlewares reutilizables, una matriz de permisos centralizada y validación de propiedad de recursos.

**Stack:** Node.js 22+ · Express 5 · MongoDB / Mongoose 9 · JSON Web Tokens · bcrypt · Zod 4 · Helmet · express-rate-limit · `node:test` + Supertest

---

## Índice

- [Puesta en marcha](#puesta-en-marcha)
- [Roles](#roles)
- [Matriz de permisos](#matriz-de-permisos)
- [Middlewares](#middlewares)
- [401 vs 403](#401-vs-403)
- [Rutas](#rutas)
- [Propiedad de recursos](#propiedad-de-recursos)
- [Formato de respuestas](#formato-de-respuestas)
- [Tests y evidencia](#tests-y-evidencia)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Decisiones de seguridad](#decisiones-de-seguridad)

---

## Puesta en marcha

Requisitos: **Node.js ≥ 22.12** y una instancia de **MongoDB** (local o Atlas).

```bash
git clone https://github.com/sebakine/entrega-5-backend-2-coderhouse.git
cd entrega-5-backend-2-coderhouse
npm install
cp .env.example .env      # completar JWT_SECRET y SEED_PASSWORD
npm run seed              # crea un usuario por rol + eventos de ejemplo
npm run dev               # http://localhost:8080
```

| Script                 | Descripción                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `npm start`            | Inicia el servidor                                             |
| `npm run dev`          | Inicia con recarga automática (`node --watch`)                 |
| `npm run seed`         | Crea usuarios `admin`, `organizer` (x2), `user` y eventos demo |
| `npm test`             | Corre los tests (MongoDB en memoria, no toca tu base)          |
| `npm run lint`         | ESLint                                                         |
| `npm run format:check` | Prettier                                                       |

Las variables de entorno se cargan con `node --env-file-if-exists=.env` (nativo de Node, sin `dotenv`) y se **validan con Zod al arrancar**: si falta `MONGO_URL` o `JWT_SECRET` es demasiado corto, el proceso no levanta y explica qué corregir. Ver [`.env.example`](.env.example).

### Usuarios del seed

Todos usan la contraseña definida en `SEED_PASSWORD`.

| Rol       | Email                      |
| --------- | -------------------------- |
| admin     | `admin@eventos.local`      |
| organizer | `organizer@eventos.local`  |
| organizer | `organizer2@eventos.local` |
| user      | `user@eventos.local`       |

---

## Roles

El modelo `User` tiene el campo `role` con valores `user`, `organizer` y `admin`, y **default `user`** ([`src/models/user.model.js`](src/models/user.model.js), [`src/constants/roles.js`](src/constants/roles.js)).

| Rol         | Descripción                                                                |
| ----------- | -------------------------------------------------------------------------- |
| `user`      | Asistente. Consulta eventos publicados.                                    |
| `organizer` | Crea eventos y gestiona (modifica/cancela) **solo los propios**.           |
| `admin`     | Gestiona cualquier evento y administra usuarios (listado y cambio de rol). |

**El registro público no permite crear `admin` ni `organizer`**, por dos barreras independientes:

1. El esquema Zod de registro no incluye `role`, así que cualquier `role` enviado en el body se descarta antes de llegar al servicio.
2. El servicio fija `role: DEFAULT_ROLE` (`user`) explícitamente al crear el usuario.

Los roles privilegiados solo se obtienen vía `npm run seed` o cuando un admin los asigna con `PATCH /api/users/:uid/role`.

---

## Matriz de permisos

Definida **en un único lugar**: [`src/constants/permissions.js`](src/constants/permissions.js). Las rutas nunca nombran roles sueltos; usan estas acciones con el middleware `authorize`.

| Acción                             | Permiso (`PERMISSIONS.*`) | user | organizer | admin |
| ---------------------------------- | ------------------------- | :--: | :-------: | :---: |
| Consultar eventos publicados       | `EVENTS_READ_PUBLISHED`   |  ✅  |    ✅     |  ✅   |
| Crear eventos                      | `EVENTS_CREATE`           |  ❌  |    ✅     |  ✅   |
| Modificar/cancelar eventos propios | `EVENTS_MANAGE_OWN`       |  ❌  |    ✅     |  ✅   |
| Modificar cualquier evento         | `EVENTS_MANAGE_ANY`       |  ❌  |    ❌     |  ✅   |
| Ver todos los usuarios             | `USERS_READ_ALL`          |  ❌  |    ❌     |  ✅   |
| Cambiar el rol de un usuario       | `USERS_MANAGE_ROLES`      |  ❌  |    ❌     |  ✅   |

```js
export const PERMISSIONS = Object.freeze({
  EVENTS_READ_PUBLISHED: [USER, ORGANIZER, ADMIN],
  EVENTS_CREATE: [ORGANIZER, ADMIN],
  EVENTS_MANAGE_OWN: [ORGANIZER, ADMIN],
  EVENTS_MANAGE_ANY: [ADMIN],
  USERS_READ_ALL: [ADMIN],
  USERS_MANAGE_ROLES: [ADMIN],
});
```

> El catálogo de eventos publicados es además **público** (también lo pueden consultar visitantes sin sesión), como corresponde a una plataforma de inscripciones.

---

## Middlewares

Separados del código de rutas, en [`src/middlewares/`](src/middlewares):

| Archivo                                                              | Pregunta que responde     | Falla con     |
| -------------------------------------------------------------------- | ------------------------- | ------------- |
| [`auth.middleware.js`](src/middlewares/auth.middleware.js)           | ¿Quién sos?               | **401**       |
| [`authorize.middleware.js`](src/middlewares/authorize.middleware.js) | ¿Tu rol puede hacer esto? | **403**       |
| [`ownership.middleware.js`](src/middlewares/ownership.middleware.js) | ¿Este recurso es tuyo?    | 404 / **403** |
| [`validate.middleware.js`](src/middlewares/validate.middleware.js)   | ¿Los datos son válidos?   | 400           |
| [`error.middleware.js`](src/middlewares/error.middleware.js)         | Traduce errores a JSON    | —             |

### `authenticate` — autenticación

1. Lee el JWT desde la cookie `httpOnly` (`COOKIE_NAME`).
2. Verifica firma, algoritmo (`HS256` fijo) y expiración.
3. **Carga el usuario desde la base**: si fue eliminado o un admin le cambió el rol, el cambio aplica en el siguiente request, sin esperar a que expire el token.
4. Puebla `req.user` con un DTO sin datos sensibles (`id`, `first_name`, `last_name`, `email`, `role`).

Sin cookie, token inválido, token expirado o usuario inexistente → **401**.

### `authorize(...roles)` — autorización

Recibe los roles permitidos como parámetro y los compara contra `req.user.role`:

```js
router.post('/', authenticate, authorize(PERMISSIONS.EVENTS_CREATE), validate(...), events.create);
```

- Con sesión pero rol no permitido → **403**.
- Sin `req.user` (si alguien olvidara `authenticate`) → 401, como defensa en profundidad.
- **Falla al arrancar** si se configura sin roles o con un rol inexistente (p. ej. un typo `"admn"`), en vez de dejar una ruta mal protegida en producción.

### Orden de la cadena

```
authenticate (401) → authorize (403) → validate (400) → ownership (404/403) → controlador
```

Primero se verifica la identidad y el permiso: un usuario sin permisos nunca recibe feedback de validación ni confirma la existencia de un recurso.

---

## 401 vs 403

|                             | **401 Unauthorized**                                                        | **403 Forbidden**                                                                   |
| --------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Significado                 | **No sé quién sos.** No hay sesión válida.                                  | **Sé quién sos, pero no podés hacer esto.**                                         |
| Causas                      | Falta la cookie · token alterado · token expirado · el usuario ya no existe | El rol no está en la matriz para esa acción · el recurso pertenece a otro organizer |
| ¿Qué debe hacer el cliente? | Iniciar sesión (de nuevo)                                                   | Nada: volver a loguearse no cambia el resultado                                     |
| Quién lo emite              | `authenticate`                                                              | `authorize` / `requireEventOwnership`                                               |

```jsonc
// 401 — POST /api/events sin cookie
{ "status": "error", "message": "No autenticado" }

// 403 — POST /api/events con rol user
{ "status": "error", "message": "No tenés permisos para realizar esta acción" }
```

Ninguno de estos casos responde 500: los errores de auth son `AppError` con su código, y el handler central solo devuelve 500 ante errores realmente inesperados.

---

## Rutas

Base: `/api`. 🔓 pública · 🔐 requiere sesión.

### Sesiones — `/api/sessions`

| Método | Ruta        | Acceso           | Descripción                                     |
| ------ | ----------- | ---------------- | ----------------------------------------------- |
| POST   | `/register` | 🔓               | Registro público (siempre rol `user`)           |
| POST   | `/login`    | 🔓               | Login; setea la cookie `httpOnly`. Rate-limited |
| POST   | `/logout`   | 🔓               | Borra la cookie                                 |
| GET    | `/current`  | 🔐 cualquier rol | Usuario de la sesión. **401 sin sesión**        |

### Eventos — `/api/events`

| Método | Ruta           | Acceso                                    | Respuestas posibles               |
| ------ | -------------- | ----------------------------------------- | --------------------------------- |
| GET    | `/`            | 🔓 (paginado: `?page=&limit=`)            | 200                               |
| GET    | `/:eid`        | 🔓 solo eventos publicados                | 200 · 400 · 404                   |
| GET    | `/mine`        | 🔐 `EVENTS_MANAGE_OWN` (organizer, admin) | 200 · 401 · 403                   |
| POST   | `/`            | 🔐 `EVENTS_CREATE` (organizer, admin)     | **201** · 400 · 401 · **403**     |
| PATCH  | `/:eid`        | 🔐 `EVENTS_MANAGE_OWN` + propiedad        | 200 · 400 · 401 · 403 · 404 · 409 |
| PATCH  | `/:eid/cancel` | 🔐 `EVENTS_MANAGE_OWN` + propiedad        | 200 · 401 · 403 · 404 · 409       |

### Usuarios (administrativas) — `/api/users`

| Método | Ruta         | Acceso                          | Respuestas posibles               |
| ------ | ------------ | ------------------------------- | --------------------------------- |
| GET    | `/`          | 🔐 `USERS_READ_ALL` (admin)     | 200 · 401 · **403**               |
| GET    | `/:uid`      | 🔐 `USERS_READ_ALL` (admin)     | 200 · 400 · 401 · 403 · 404       |
| PATCH  | `/:uid/role` | 🔐 `USERS_MANAGE_ROLES` (admin) | 200 · 400 · 401 · 403 · 404 · 409 |

`GET /api/users` admite `?role=organizer` y paginación. Un admin no puede cambiar su propio rol (409), para no dejar el sistema sin administradores por error.

### Body de un evento

```json
{
  "title": "Congreso Tech 2026",
  "description": "Opcional",
  "location": "Buenos Aires",
  "startsAt": "2027-03-10T18:00:00Z",
  "capacity": 300,
  "status": "published"
}
```

`status` acepta `draft` o `published` (default `published`). El campo `organizer` **nunca se toma del body**: sale de la sesión y es inmutable. La cancelación tiene su propio endpoint y un evento cancelado ya no puede modificarse (409).

---

## Propiedad de recursos

[`requireOwnership`](src/middlewares/ownership.middleware.js) es un middleware genérico que recibe cómo cargar el recurso, cómo obtener su dueño y qué roles pueden saltear el chequeo. Para eventos:

```js
export const requireEventOwnership = requireOwnership({
  load: (req) => eventService.getById(req.params.eid),
  getOwnerId: (event) => event.organizer,
  bypassRoles: PERMISSIONS.EVENTS_MANAGE_ANY, // admin
  message: 'Solo podés modificar eventos que organizás',
});
```

- **organizer** → solo puede modificar/cancelar eventos donde `event.organizer === req.user.id`; si no, **403**.
- **admin** → puede modificar cualquiera (permiso `EVENTS_MANAGE_ANY`).
- El recurso cargado queda en `req.resource`, así el controlador no vuelve a consultarlo.

---

## Formato de respuestas

```jsonc
// Éxito
{ "status": "success", "payload": { ... } }

// Éxito paginado
{ "status": "success", "payload": [ ... ], "pagination": { "page": 1, "limit": 10, "total": 4, "totalPages": 1 } }

// Error
{ "status": "error", "message": "Datos inválidos", "details": [{ "field": "startsAt", "message": "La fecha del evento debe ser futura" }] }
```

---

## Tests y evidencia

```bash
npm test
```

48 tests (integración con Supertest + MongoDB en memoria, y unitarios del middleware `authorize`). Cubren todos los casos pedidos en la consigna:

| Caso pedido                                            | Resultado esperado | Test |
| ------------------------------------------------------ | ------------------ | :--: |
| `POST /api/events` con rol `user`                      | 403                |  ✅  |
| `POST /api/events` con rol `organizer`                 | 201                |  ✅  |
| Ruta administrativa (`GET /api/users`) con `organizer` | 403                |  ✅  |
| Ruta administrativa (`GET /api/users`) con `admin`     | 200                |  ✅  |
| Cualquier ruta privada sin cookie (8 rutas)            | 401                |  ✅  |
| `organizer` modificando evento ajeno                   | 403                |  ✅  |

Además: registro con `role=admin`/`organizer` en el body → se crea `user`; cookie `HttpOnly` + `SameSite=Strict`; token alterado → 401; logout; admin edita evento ajeno; ids inválidos (400) e inexistentes (404); evento cancelado no editable (409); promoción de rol que aplica en el request siguiente sin re-login.

### Evidencia contra el servidor real

Salida de `curl` con el servidor levantado y la base cargada con `npm run seed`:

```text
POST /api/events          (sin cookie)  → 401  {"status":"error","message":"No autenticado"}
POST /api/events          (user)        → 403  {"status":"error","message":"No tenés permisos para realizar esta acción"}
POST /api/events          (organizer)   → 201  {"status":"success","payload":{"id":"6b02...213e","title":"Congreso Tech 2026",...,"organizer":"6b02...b514"}}
GET  /api/users           (organizer)   → 403  {"status":"error","message":"No tenés permisos para realizar esta acción"}
GET  /api/users           (admin)       → 200  {"status":"success","payload":[...],"pagination":{"page":1,"limit":2,"total":4,"totalPages":2}}
GET  /api/sessions/current (sin cookie) → 401  {"status":"error","message":"No autenticado"}
PATCH /api/events/:eid    (organizer, evento ajeno) → 403  {"status":"error","message":"Solo podés modificar eventos que organizás"}
PATCH /api/events/:eid    (admin, evento ajeno)     → 200  {"status":"success","payload":{...,"capacity":90}}
```

Para reproducirlo a mano (o sacar capturas) está [`requests.http`](requests.http), listo para la extensión REST Client de VS Code.

---

## Estructura del proyecto

```
src/
├── app.js                       # Express: helmet, json, cookies, rutas, errores
├── server.js                    # Conexión a Mongo, listen y apagado ordenado
├── config/
│   ├── env.js                   # Variables de entorno validadas con Zod
│   └── db.js
├── constants/
│   ├── roles.js                 # user | organizer | admin (default user)
│   └── permissions.js           # Matriz de permisos (fuente única de verdad)
├── middlewares/
│   ├── auth.middleware.js       # valida JWT de la cookie → 401 si no hay sesión
│   ├── authorize.middleware.js  # recibe roles permitidos → 403 si el rol no coincide
│   ├── ownership.middleware.js  # dueño del recurso o admin → 403 si no
│   ├── validate.middleware.js   # Zod → 400
│   └── error.middleware.js      # handler central de errores
├── routes/
│   ├── events.router.js         # aplica authenticate + authorize + ownership
│   ├── sessions.router.js
│   └── users.router.js          # rutas administrativas (solo admin)
├── controllers/                 # HTTP in/out, sin lógica de negocio
├── services/                    # reglas de negocio y acceso a datos
├── models/                      # esquemas Mongoose (User, Event)
├── schemas/                     # esquemas Zod de entrada
├── dto/                         # DTOs de salida (nunca exponen password)
└── utils/                       # AppError, jwt, password, cookies, paginación
scripts/seed.js                  # datos de prueba idempotentes
test/                            # node:test + Supertest + mongodb-memory-server
.github/workflows/ci.yml         # lint + formato + tests en cada push/PR
```

---

## Decisiones de seguridad

- **JWT en cookie `httpOnly` + `SameSite=Strict`** (+ `Secure` en producción): el token no es accesible desde JS (XSS) ni viaja en requests cross-site (CSRF).
- **El token solo lleva `sub` y `role`**; el rol efectivo se lee de la base en cada request.
- **Algoritmo de firma fijo** (`HS256`) al verificar, y `JWT_SECRET` de al menos 32 caracteres validado al arrancar.
- **Contraseñas con bcrypt** y campo `password` con `select: false` en el modelo: nunca sale de la base salvo en el login.
- **Login resistente a enumeración**: mismo mensaje y mismo costo de bcrypt exista o no el email.
- **Rate limiting** sobre `/api/sessions/login`.
- **Helmet** para headers de seguridad y límite de 100 kb en el body JSON.
- **Validación de entrada con Zod**: las claves desconocidas (`role`, `organizer`, etc.) se descartan.
- **Sin secretos en el repo**: `.env` está en `.gitignore`; solo se versiona `.env.example`.
