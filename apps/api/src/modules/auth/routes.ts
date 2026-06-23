import { Router, type IRouter } from 'express';
import * as authController from './controller';
import { verifyJWT } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router: IRouter = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/me', verifyJWT, authController.getMe);
router.get('/admin', verifyJWT, requireRole('admin'), (_req, res) => {
  res.json({ ok: true });
});

export default router;
