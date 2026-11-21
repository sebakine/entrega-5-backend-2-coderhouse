import { toUserDTO } from '../dto/user.dto.js';
import { authService } from '../services/auth.service.js';
import { clearAuthCookie, setAuthCookie } from '../utils/cookies.js';

export const register = async (req, res) => {
  const user = await authService.register(req.validated.body);
  res.status(201).json({ status: 'success', payload: toUserDTO(user) });
};

export const login = async (req, res) => {
  const { user, token } = await authService.login(req.validated.body);
  setAuthCookie(res, token);
  res.json({ status: 'success', payload: toUserDTO(user) });
};

export const current = (req, res) => {
  res.json({ status: 'success', payload: req.user });
};

export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ status: 'success', message: 'Sesión cerrada' });
};
