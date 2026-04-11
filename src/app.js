import express     from 'express';
import cors        from 'cors';
import helmet      from 'helmet';
import morgan      from 'morgan';
import rateLimit   from 'express-rate-limit';

import responseUtil    from './utils/response.util.js';
import errorMiddleware from './middleware/error.middleware.js';

import profileRoutes  from './routes/profile.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import internalRoutes from './routes/internal.routes.js';

import env from './config/env.js';

const app = express();

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  message:  { success: false, message: 'Too many requests, please try again later' },
}));

app.use(cors({
  origin:      env.frontendBaseUrl,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Attaches res.success() and res.error() helpers to every response
app.use(responseUtil);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-profile-service' });
});

// ── Public & JWT-protected routes ─────────────────────────────────────────────
app.use('/api/v1/profiles',  profileRoutes);
app.use('/api/v1/settings',  settingsRoutes);

// ── Internal routes (service-to-service only, x-internal-secret protected) ───
app.use('/api/v1/internal',  internalRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use(errorMiddleware);

export default app;
