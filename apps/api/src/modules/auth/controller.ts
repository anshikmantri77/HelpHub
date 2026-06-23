import { Request, Response, NextFunction } from 'express';
import { RegisterInput, LoginInput } from '@helphub/shared';
import * as authService from './service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RegisterInput.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = LoginInput.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export function getMe(req: Request, res: Response) {
  res.json({ user: req.user });
}
