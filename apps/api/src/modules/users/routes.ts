import { Router } from 'express';
import { z } from 'zod';
import * as repo from './repository';
import { verifyJWT } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { ValidationError } from '../../errors/AppError';

const router = Router();

const SearchAgentsQuery = z.object({
  search: z.string().min(1).max(100),
});

router.get('/agents', verifyJWT, requireRole('customer', 'agent', 'admin'), async (req, res, next) => {
  try {
    const parsed = SearchAgentsQuery.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid search query');
    }
    const agents = await repo.searchAgents(parsed.data.search);
    res.json({ data: agents });
  } catch (err) {
    next(err);
  }
});

export default router;
