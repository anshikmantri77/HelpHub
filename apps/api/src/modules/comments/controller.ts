import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../errors/AppError';
import * as commentService from './service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const ticketId = req.params.ticketId;
    if (!ticketId) {
      throw new Error('Missing ticket id');
    }

    const { content, isInternal } = req.body;

    if (req.user!.role === 'customer' && isInternal) {
      throw new ForbiddenError('Customers cannot create internal notes');
    }

    const comment = await commentService.create(
      ticketId,
      content,
      isInternal ?? false,
      req.user!,
    );

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const ticketId = req.params.ticketId;
    if (!ticketId) {
      throw new Error('Missing ticket id');
    }

    const result = await commentService.list(ticketId, req.user!);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
