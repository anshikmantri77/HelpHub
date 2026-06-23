import { Router } from 'express';
import type { IRouter } from 'express';
import * as ticketController from './controller';
import { verifyJWT } from '../../middleware/auth';
import { ticketCreateLimiter } from '../../middleware/rateLimit';
import * as commentController from '../comments/controller';

const router: IRouter = Router();

router.post('/', verifyJWT, ticketCreateLimiter, ticketController.create);
router.get('/', verifyJWT, ticketController.list);
router.get('/:id', verifyJWT, ticketController.getById);
router.post('/:id/transitions', verifyJWT, ticketController.transition);
router.patch('/:id/assign', verifyJWT, ticketController.assign);

router.get('/:ticketId/comments', verifyJWT, commentController.list);
router.post('/:ticketId/comments', verifyJWT, commentController.create);

export default router;
