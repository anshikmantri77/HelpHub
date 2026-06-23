import { Request, Response, NextFunction } from 'express';
import { CreateTicketInput, TransitionInput, ListTicketsQuery } from '@helphub/shared';
import * as ticketService from './service';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateTicketInput.parse(req.body);
    const ticket = await ticketService.create(input, req.user!);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListTicketsQuery.parse(req.query);
    const result = await ticketService.list(query, req.user!);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const ticketId = req.params.id;
    if (!ticketId) {
      throw new Error('Missing ticket id');
    }
    const ticket = await ticketService.getById(ticketId, req.user!);
    res.status(200).json(ticket);
  } catch (err) {
    next(err);
  }
}

export async function transition(req: Request, res: Response, next: NextFunction) {
  try {
    const ticketId = req.params.id;
    if (!ticketId) {
      throw new Error('Missing ticket id');
    }
    const input = TransitionInput.parse(req.body);
    const ticket = await ticketService.transition(ticketId, input, req.user!);
    res.status(200).json(ticket);
  } catch (err) {
    next(err);
  }
}

export async function assign(req: Request, res: Response, next: NextFunction) {
  try {
    const ticketId = req.params.id;
    if (!ticketId) {
      throw new Error('Missing ticket id');
    }
    const ticket = await ticketService.claim(ticketId, req.user!);
    res.status(200).json(ticket);
  } catch (err) {
    next(err);
  }
}
