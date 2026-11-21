import { UserModel } from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';

export const userService = {
  findById(id) {
    return UserModel.findById(id).lean();
  },

  async list({ page, limit, role }) {
    const filter = role ? { role } : {};
    const [docs, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);
    return { docs, total, page, limit };
  },

  async getById(id) {
    const user = await UserModel.findById(id).lean();
    if (!user) throw AppError.notFound('Usuario no encontrado');
    return user;
  },

  async updateRole({ targetId, role, actorId }) {
    // Evita que un admin se quite sus propios privilegios por error y deje el sistema sin admin.
    if (String(targetId) === String(actorId)) {
      throw AppError.conflict('No podés modificar tu propio rol');
    }
    const user = await UserModel.findByIdAndUpdate(
      targetId,
      { role },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    if (!user) throw AppError.notFound('Usuario no encontrado');
    return user;
  },
};
