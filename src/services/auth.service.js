import { randomUUID } from 'node:crypto';
import { DEFAULT_ROLE } from '../constants/roles.js';
import { UserModel } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';
import { signAccessToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

// Hash ficticio (mismo costo que los reales) para comparar cuando el email no existe:
// el tiempo de respuesta es igual exista o no la cuenta (evita enumeración por timing).
const DUMMY_HASH = await hashPassword(randomUUID());

export const authService = {
  async register({ first_name, last_name, email, password }) {
    const exists = await UserModel.exists({ email });
    if (exists) throw AppError.conflict('El email ya está registrado');

    // El rol se fija en el servidor: el registro público nunca crea organizer ni admin.
    return UserModel.create({
      first_name,
      last_name,
      email,
      password: await hashPassword(password),
      role: DEFAULT_ROLE,
    });
  },

  async login({ email, password }) {
    const user = await UserModel.findOne({ email }).select('+password').lean();
    const valid = await verifyPassword(password, user?.password ?? DUMMY_HASH);
    if (!user || !valid) throw AppError.unauthorized('Credenciales inválidas');
    return { user, token: signAccessToken(user) };
  },
};
