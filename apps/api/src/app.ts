import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/routes';
import ticketRoutes from './modules/tickets/routes';
import commentRoutes from './modules/comments/routes';
import { errorHandler } from './middleware/errorHandler';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);
app.use('/tickets', commentRoutes);
app.use(errorHandler);

export default app;
