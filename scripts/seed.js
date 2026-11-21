// Crea un usuario por rol y eventos de ejemplo para probar la matriz de permisos.
// Uso: npm run seed   (idempotente: no duplica datos si ya existen)
import { connectDB, disconnectDB } from '../src/config/db.js';
import { ROLES } from '../src/constants/roles.js';
import { EventModel } from '../src/models/event.model.js';
import { UserModel } from '../src/models/user.model.js';
import { hashPassword } from '../src/utils/password.js';

const SEED_PASSWORD = process.env.SEED_PASSWORD;
if (!SEED_PASSWORD || SEED_PASSWORD.length < 8) {
  console.error('[seed] Definí SEED_PASSWORD (mínimo 8 caracteres) en tu .env');
  process.exit(1);
}

const users = [
  { first_name: 'Ada', last_name: 'Admin', email: 'admin@eventos.local', role: ROLES.ADMIN },
  { first_name: 'Olga', last_name: 'Organizadora', email: 'organizer@eventos.local', role: ROLES.ORGANIZER },
  { first_name: 'Otto', last_name: 'Organizador', email: 'organizer2@eventos.local', role: ROLES.ORGANIZER },
  { first_name: 'Uma', last_name: 'Usuaria', email: 'user@eventos.local', role: ROLES.USER },
];

const inDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

try {
  await connectDB();
  const password = await hashPassword(SEED_PASSWORD);

  const byEmail = {};
  for (const data of users) {
    byEmail[data.email] = await UserModel.findOneAndUpdate(
      { email: data.email },
      { $setOnInsert: { ...data, password } },
      { upsert: true, returnDocument: 'after' },
    );
  }

  const events = [
    {
      title: 'Congreso Tech 2026',
      location: 'Buenos Aires',
      startsAt: inDays(30),
      capacity: 500,
      organizer: byEmail['organizer@eventos.local']._id,
    },
    {
      title: 'Workshop de Node.js',
      location: 'Online',
      startsAt: inDays(10),
      capacity: 50,
      organizer: byEmail['organizer@eventos.local']._id,
    },
    {
      title: 'Meetup de Seguridad Web',
      location: 'Córdoba',
      startsAt: inDays(20),
      capacity: 80,
      organizer: byEmail['organizer2@eventos.local']._id,
    },
    {
      title: 'Hackathon (borrador)',
      location: 'Rosario',
      startsAt: inDays(60),
      capacity: 120,
      status: 'draft',
      organizer: byEmail['organizer2@eventos.local']._id,
    },
  ];

  let created = 0;
  for (const event of events) {
    const result = await EventModel.updateOne(
      { title: event.title },
      { $setOnInsert: event },
      { upsert: true },
    );
    created += result.upsertedCount;
  }

  console.log('[seed] Usuarios (contraseña = SEED_PASSWORD):');
  for (const { email, role } of users) console.log(`  - ${role.padEnd(9)} ${email}`);
  console.log(`[seed] Eventos creados: ${created} (ya existentes: ${events.length - created})`);
} catch (error) {
  console.error('[seed] Error:', error.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
