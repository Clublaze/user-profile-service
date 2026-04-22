import dotenv from 'dotenv';
dotenv.config();

const env = {
  nodeEnv:  process.env.NODE_ENV  || 'development',
  port:     process.env.PORT      || 8003,
  isDev:    (process.env.NODE_ENV || 'development') === 'development',

  mongoUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  jwtSecret: process.env.JWT_SECRET,

  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET,

  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  allowedFrontendOrigins: (process.env.FRONTEND_BASE_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  kafka: {
    brokers:  (process.env.KAFKA_BROKERS || 'localhost:9093').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'user-profile-service',
    groupId:  process.env.KAFKA_GROUP_ID  || 'user-profile-service-group',
  },

  services: {
    authServiceUrl:        process.env.AUTH_SERVICE_URL        || 'http://localhost:8001',
    clubServiceUrl:        process.env.CLUB_SERVICE_URL        || 'http://localhost:8002',
    leaderboardServiceUrl: process.env.LEADERBOARD_SERVICE_URL || 'http://localhost:8004',
  },

  aws: {
    region:          process.env.AWS_REGION,
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName:      process.env.AWS_S3_BUCKET_NAME || 'unihub-uploads',
    baseUrl:         process.env.AWS_S3_BASE_URL,
  },

  upload: {
    maxAvatarMb: parseInt(process.env.MAX_AVATAR_SIZE_MB || '5', 10),
    maxCoverMb:  parseInt(process.env.MAX_COVER_SIZE_MB  || '10', 10),
  },
};

// Hard fail on startup if critical secrets are missing
if (!env.jwtSecret) {
  console.error('FATAL: JWT_SECRET is not set in environment variables');
  process.exit(1);
}

if (!env.internalServiceSecret) {
  console.error('FATAL: INTERNAL_SERVICE_SECRET is not set in environment variables');
  process.exit(1);
}

if (!env.mongoUri) {
  console.error('FATAL: MONGODB_URI is not set in environment variables');
  process.exit(1);
}

export default env;
