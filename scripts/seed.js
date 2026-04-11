// Seed script — creates profiles for users who registered in auth-service
// before profile-service was built.
//
// Usage: node scripts/seed.js
//
// What it does:
// 1. Calls auth-service internal API to get all existing users
// 2. For each user, creates a profile if one does not already exist
// 3. Safe to run multiple times — skips users who already have profiles

import 'dotenv/config';
import mongoose    from 'mongoose';
import Profile     from '../src/models/Profile.model.js';
import env         from '../src/config/env.js';

const AUTH_SERVICE_URL      = env.services.authServiceUrl;
const INTERNAL_SECRET       = env.internalServiceSecret;

const connectDB = async () => {
  await mongoose.connect(env.mongoUri);
  console.log('✅  MongoDB connected');
};

const fetchUsersFromAuthService = async (page = 1, limit = 100) => {
  const response = await fetch(
    `${AUTH_SERVICE_URL}/api/auth/admin/users?page=${page}&limit=${limit}`,
    {
      headers: {
        'x-internal-secret': INTERNAL_SECRET,
        'Content-Type':      'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Auth service returned ${response.status}`);
  }

  const body = await response.json();
  return body.data;
};

const seed = async () => {
  await connectDB();

  console.log('\n👤  Seeding profiles for existing users...\n');

  let page        = 1;
  let created     = 0;
  let skipped     = 0;
  let hasMore     = true;

  while (hasMore) {
    let result;

    try {
      result = await fetchUsersFromAuthService(page, 100);
    } catch (err) {
      console.error(`\n⚠️   Could not fetch users from auth-service: ${err.message}`);
      console.log('   Make sure auth-service is running and INTERNAL_SERVICE_SECRET matches.\n');
      console.log('   If auth-service is not available, you can skip this script.');
      console.log('   Profiles will be created automatically when users next log in via Kafka.\n');
      break;
    }

    const users = result.users || [];
    hasMore     = users.length === 100;

    for (const user of users) {
      const exists = await Profile.exists({ userId: user._id.toString() });

      if (exists) {
        skipped++;
        continue;
      }

      await Profile.create({
        userId:       user._id.toString(),
        universityId: new mongoose.Types.ObjectId(user.universityId),
        userType:     user.userType,
        email:        user.email,
        isActive:     user.status === 'ACTIVE',
        completionScore: 0,
      });

      created++;
      console.log(`   ✅  Created profile for ${user.email} (${user.userType})`);
    }

    page++;
  }

  console.log(`\n🎉  Seed complete — ${created} created, ${skipped} already existed.\n`);
};

seed()
  .catch((err) => {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  });
