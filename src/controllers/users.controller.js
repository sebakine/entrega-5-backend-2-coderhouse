import { toUserDTO } from '../dto/user.dto.js';
import { userService } from '../services/user.service.js';
import { toPaginatedResponse } from '../utils/pagination.js';

export const list = async (req, res) => {
  const result = await userService.list(req.validated.query);
  res.json(toPaginatedResponse(result, toUserDTO));
};

export const getById = async (req, res) => {
  const user = await userService.getById(req.validated.params.uid);
  res.json({ status: 'success', payload: toUserDTO(user) });
};

export const updateRole = async (req, res) => {
  const user = await userService.updateRole({
    targetId: req.validated.params.uid,
    role: req.validated.body.role,
    actorId: req.user.id,
  });
  res.json({ status: 'success', payload: toUserDTO(user) });
};
