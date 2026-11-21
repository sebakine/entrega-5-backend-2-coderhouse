import mongoose from 'mongoose';
import { ALL_ROLES, DEFAULT_ROLE } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false → el hash nunca sale de la base salvo que se pida explícitamente.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ALL_ROLES, default: DEFAULT_ROLE, index: true },
  },
  { timestamps: true, versionKey: false },
);

export const UserModel = mongoose.model('User', userSchema);
