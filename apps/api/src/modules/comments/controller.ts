import { Request, Response, NextFunction } from 'express';
import { CreateCommentInput } from '@helphub/shared';
import { ForbiddenError } from '../../errors/AppError';
import * as commentService from './service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const ticketId = req.params.ticketId;
    if (!ticketId) {
      throw new Error('Missing ticket id');
    }

    const input = CreateCommentInput.parse(req.body);

    if (req.user!.role === 'customer' && input.isInternal) {
      throw new ForbiddenError('Customers cannot create internal notes');
    }

    const comment = await commentService.create(
      ticketId,
      input.content,
      input.isInternal,
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
