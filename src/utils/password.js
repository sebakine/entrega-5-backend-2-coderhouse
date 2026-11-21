import bcrypt from 'bcrypt';
import { env } from '../config/env.js';

export const hashPassword = (plain) => bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);

export const verifyPassword = (plain, hashed) => bcrypt.compare(plain, hashed);
