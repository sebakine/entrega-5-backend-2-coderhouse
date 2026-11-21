// Tests de integración de autenticación (401), autorización por rol (403)
// y propiedad de recursos. Ejecutar con: npm test
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { app, loginAs, PASSWORD, startDatabase, stopDatabase } from './setup.js';

const FORBIDDEN = { status: 'error', message: 'No tenés permisos para realizar esta acción' };
const UNAUTHENTICATED = { status: 'error', message: 'No autenticado' };

const inDays = (days) => new Date(Date.now() + days * 86_400_000).toISOString();
const newEvent = (overrides = {}) => ({
  title: 'Congreso Tech 2026',
  location: 'Buenos Aires',
  startsAt: inDays(30),
  capacity: 300,
  ...overrides,
});

let user;
let organizer;
let otherOrganizer;
let admin;

before(async () => {
  await startDatabase();
  user = await loginAs('user');
  organizer = await loginAs('organizer');
  otherOrganizer = await loginAs('organizer', 'otro-organizer@test.com');
  admin = await loginAs('admin');
});

after(stopDatabase);

describe('Registro público y roles', () => {
  it('asigna rol "user" por defecto', async () => {
    const res = await request(app).post('/api/sessions/register').send({
      first_name: 'Ana',
      last_name: 'Pérez',
      email: 'ana@test.com',
      password: PASSWORD,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.payload.role, 'user');
    assert.equal(res.body.payload.password, undefined);
  });

  for (const role of ['admin', 'organizer']) {
    it(`ignora role="${role}" enviado en el body`, async () => {
      const res = await request(app)
        .post('/api/sessions/register')
        .send({
          first_name: 'Intento',
          last_name: 'Escalada',
          email: `escalada-${role}@test.com`,
          password: PASSWORD,
          role,
        });
      assert.equal(res.status, 201);
      assert.equal(res.body.payload.role, 'user');
    });
  }

  it('rechaza emails duplicados con 409', async () => {
    const res = await request(app).post('/api/sessions/register').send({
      first_name: 'Ana',
      last_name: 'Pérez',
      email: 'ana@test.com',
      password: PASSWORD,
    });
    assert.equal(res.status, 409);
  });

  it('login con credenciales inválidas → 401 sin cookie', async () => {
    const res = await request(app)
      .post('/api/sessions/login')
      .send({ email: 'ana@test.com', password: 'incorrecta' });
    assert.equal(res.status, 401);
    assert.equal(res.headers['set-cookie'], undefined);
  });

  it('la cookie de sesión es httpOnly y SameSite=Strict', async () => {
    const res = await request(app)
      .post('/api/sessions/login')
      .send({ email: 'ana@test.com', password: PASSWORD });
    assert.equal(res.status, 200);
    const cookie = res.headers['set-cookie'][0];
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
  });
});

describe('Autenticación (401): sin sesión válida', () => {
  const privateRoutes = [
    ['get', '/api/sessions/current'],
    ['get', '/api/events/mine'],
    ['post', '/api/events'],
    ['patch', '/api/events/665f2a000000000000000000'],
    ['patch', '/api/events/665f2a000000000000000000/cancel'],
    ['get', '/api/users'],
    ['get', '/api/users/665f2a000000000000000000'],
    ['patch', '/api/users/665f2a000000000000000000/role'],
  ];

  for (const [method, url] of privateRoutes) {
    it(`${method.toUpperCase()} ${url} sin cookie → 401`, async () => {
      const res = await request(app)[method](url).send({});
      assert.equal(res.status, 401);
      assert.deepEqual(res.body, UNAUTHENTICATED);
    });
  }

  it('token alterado → 401', async () => {
    const res = await request(app)
      .get('/api/sessions/current')
      .set('Cookie', 'accessToken=eyJhbGciOiJIUzI1NiJ9.e30.firma-falsa');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Sesión inválida');
  });

  it('GET /api/sessions/current con sesión → 200 con el usuario sin password', async () => {
    const res = await organizer.agent.get('/api/sessions/current');
    assert.equal(res.status, 200);
    assert.equal(res.body.payload.role, 'organizer');
    assert.equal(res.body.payload.password, undefined);
  });

  it('logout borra la cookie y la ruta privada vuelve a dar 401', async () => {
    const { agent } = await loginAs('user', 'logout@test.com');
    assert.equal((await agent.post('/api/sessions/logout')).status, 200);
    assert.equal((await agent.get('/api/sessions/current')).status, 401);
  });
});

describe('Eventos: matriz de permisos', () => {
  let organizerEventId;

  it('POST /api/events con rol user → 403', async () => {
    const res = await user.agent.post('/api/events').send(newEvent());
    assert.equal(res.status, 403);
    assert.deepEqual(res.body, FORBIDDEN);
  });

  it('POST /api/events con rol organizer → 201 y el organizer sale de la sesión', async () => {
    const res = await organizer.agent
      .post('/api/events')
      .send(newEvent({ organizer: String(admin.user._id) }));
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.payload.title, 'Congreso Tech 2026');
    assert.equal(res.body.payload.organizer, String(organizer.user._id));
    organizerEventId = res.body.payload.id;
  });

  it('POST /api/events con rol admin → 201', async () => {
    const res = await admin.agent.post('/api/events').send(newEvent({ title: 'Evento del admin' }));
    assert.equal(res.status, 201);
  });

  it('POST /api/events con datos inválidos (organizer) → 400 con detalle', async () => {
    const res = await organizer.agent.post('/api/events').send({ title: 'x', startsAt: '2000-01-01' });
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.details));
  });

  it('GET /api/events es público y lista solo eventos publicados', async () => {
    await organizer.agent.post('/api/events').send(newEvent({ title: 'Borrador', status: 'draft' }));
    const res = await request(app).get('/api/events');
    assert.equal(res.status, 200);
    assert.ok(res.body.payload.length >= 2);
    assert.ok(res.body.payload.every((e) => e.status === 'published'));
    assert.equal(res.body.pagination.page, 1);
  });

  for (const role of ['user', 'organizer', 'admin']) {
    it(`GET /api/events/:eid con rol ${role} → 200`, async () => {
      const agent = { user, organizer, admin }[role].agent;
      const res = await agent.get(`/api/events/${organizerEventId}`);
      assert.equal(res.status, 200);
    });
  }

  it('GET /api/events/mine con rol user → 403', async () => {
    const res = await user.agent.get('/api/events/mine');
    assert.equal(res.status, 403);
  });

  it('GET /api/events/mine con organizer → solo sus eventos (incluye borradores)', async () => {
    const res = await organizer.agent.get('/api/events/mine');
    assert.equal(res.status, 200);
    assert.ok(res.body.payload.some((e) => e.status === 'draft'));
    assert.ok(res.body.payload.every((e) => e.organizer === String(organizer.user._id)));
  });

  describe('Propiedad de recursos', () => {
    it('organizer modifica su propio evento → 200', async () => {
      const res = await organizer.agent.patch(`/api/events/${organizerEventId}`).send({ capacity: 400 });
      assert.equal(res.status, 200);
      assert.equal(res.body.payload.capacity, 400);
    });

    it('organizer intentando modificar evento ajeno → 403', async () => {
      const res = await otherOrganizer.agent
        .patch(`/api/events/${organizerEventId}`)
        .send({ title: 'Hackeado' });
      assert.equal(res.status, 403);
      assert.equal(res.body.message, 'Solo podés modificar eventos que organizás');
    });

    it('organizer intentando cancelar evento ajeno → 403', async () => {
      const res = await otherOrganizer.agent.patch(`/api/events/${organizerEventId}/cancel`);
      assert.equal(res.status, 403);
    });

    it('user intentando modificar un evento → 403 (antes de evaluar propiedad)', async () => {
      const res = await user.agent.patch(`/api/events/${organizerEventId}`).send({ title: 'Nope' });
      assert.equal(res.status, 403);
      assert.deepEqual(res.body, FORBIDDEN);
    });

    it('admin modifica cualquier evento → 200', async () => {
      const res = await admin.agent
        .patch(`/api/events/${organizerEventId}`)
        .send({ title: 'Congreso Tech 2026 (editado por admin)' });
      assert.equal(res.status, 200);
      assert.equal(res.body.payload.organizer, String(organizer.user._id));
    });

    it('evento inexistente → 404', async () => {
      const res = await admin.agent.patch('/api/events/665f2a000000000000000000').send({ capacity: 10 });
      assert.equal(res.status, 404);
    });

    it('id mal formado → 400', async () => {
      const res = await organizer.agent.patch('/api/events/no-es-un-id').send({ capacity: 10 });
      assert.equal(res.status, 400);
    });

    it('organizer cancela su evento → 200 y ya no se puede editar (409)', async () => {
      const cancel = await organizer.agent.patch(`/api/events/${organizerEventId}/cancel`);
      assert.equal(cancel.status, 200);
      assert.equal(cancel.body.payload.status, 'cancelled');

      const edit = await organizer.agent.patch(`/api/events/${organizerEventId}`).send({ capacity: 1 });
      assert.equal(edit.status, 409);
    });
  });
});

describe('Rutas administrativas (/api/users)', () => {
  it('GET /api/users con rol user → 403', async () => {
    const res = await user.agent.get('/api/users');
    assert.equal(res.status, 403);
    assert.deepEqual(res.body, FORBIDDEN);
  });

  it('GET /api/users con rol organizer → 403', async () => {
    const res = await organizer.agent.get('/api/users');
    assert.equal(res.status, 403);
    assert.deepEqual(res.body, FORBIDDEN);
  });

  it('GET /api/users con rol admin → 200 sin exponer passwords', async () => {
    const res = await admin.agent.get('/api/users');
    assert.equal(res.status, 200);
    assert.ok(res.body.payload.length > 0);
    assert.ok(res.body.payload.every((u) => u.password === undefined));
  });

  it('GET /api/users?role=organizer filtra por rol', async () => {
    const res = await admin.agent.get('/api/users?role=organizer');
    assert.equal(res.status, 200);
    assert.ok(res.body.payload.every((u) => u.role === 'organizer'));
  });

  it('PATCH /api/users/:uid/role con organizer → 403', async () => {
    const res = await organizer.agent.patch(`/api/users/${organizer.user._id}/role`).send({ role: 'admin' });
    assert.equal(res.status, 403);
  });

  it('admin promueve a un user a organizer y el cambio aplica en el siguiente request', async () => {
    const promoted = await loginAs('user', 'promovido@test.com');
    assert.equal((await promoted.agent.post('/api/events').send(newEvent())).status, 403);

    const res = await admin.agent.patch(`/api/users/${promoted.user._id}/role`).send({ role: 'organizer' });
    assert.equal(res.status, 200);
    assert.equal(res.body.payload.role, 'organizer');

    // Misma cookie: el rol se lee de la base en cada request.
    assert.equal((await promoted.agent.post('/api/events').send(newEvent())).status, 201);
  });

  it('admin no puede cambiar su propio rol → 409', async () => {
    const res = await admin.agent.patch(`/api/users/${admin.user._id}/role`).send({ role: 'user' });
    assert.equal(res.status, 409);
  });

  it('rol inválido → 400', async () => {
    const res = await admin.agent.patch(`/api/users/${user.user._id}/role`).send({ role: 'superadmin' });
    assert.equal(res.status, 400);
  });
});
