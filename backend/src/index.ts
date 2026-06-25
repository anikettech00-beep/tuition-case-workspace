import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { ensureUploadDir } from './services/file.service';
import authRoutes from './routes/auth.routes';
import casesRoutes from './routes/cases.routes';
import documentsRoutes from './routes/documents.routes';
import tutorsRoutes from './routes/tutors.routes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = [
  env.FRONTEND_URL,
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:3001','https://tuition-case-workspace-1r21cyiif-anikettech00-8570s-projects.vercel.app/']
    : []),
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api', documentsRoutes);
app.use('/api/tutors', tutorsRoutes);

app.use(errorHandler);

async function start() {
  await ensureUploadDir();
  app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
    console.log(`Swagger UI: http://localhost:${env.PORT}/api/docs`);
  });
}

start().catch(console.error);

export default app;
