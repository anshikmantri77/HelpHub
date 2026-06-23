import { Router } from 'express';
import type { IRouter } from 'express';
import * as commentController from './controller';
import { verifyJWT } from '../../middleware/auth';

const router: IRouter = Router();

router.get('/:ticketId/comments', verifyJWT, commentController.list);
router.post('/:ticketId/comments', verifyJWT, commentController.create);

export default router;
