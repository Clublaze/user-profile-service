import mongoose from 'mongoose';

// ── Badge sub-schema ──────────────────────────────────────────────────────────
const badgeSchema = new mongoose.Schema(
  {
    code:      { type: String, required: true },   // e.g. 'FIRST_EVENT', 'CLUB_LEAD'
    label:     { type: String, required: true },   // e.g. 'First Event Organized'
    awardedAt: { type: Date,   default: Date.now },
  },
  { _id: false }
);

// ── Activity feed item sub-schema ─────────────────────────────────────────────
const activityItemSchema = new mongoose.Schema(
  {
    type:      { type: String, required: true }, // 'EVENT_CREATED', 'ROLE_ASSIGNED' etc.
    title:     { type: String, required: true }, // 'Organized AI Workshop 2025'
    entityId:  { type: String, default: null },  // eventId or roleId
    timestamp: { type: Date,   default: Date.now },
  },
  { _id: false }
);

// ── Pinned highlight sub-schema ───────────────────────────────────────────────
const pinnedHighlightSchema = new mongoose.Schema(
  {
    type:        { type: String, enum: ['EVENT', 'ROLE', 'ACHIEVEMENT'] },
    entityId:    { type: String },
    title:       { type: String },
    description: { type: String },
  },
  { _id: false }
);

// ── Stats sub-schema (incremented by Kafka consumers) ────────────────────────
const statsSchema = new mongoose.Schema(
  {
    eventsOrganized: { type: Number, default: 0 },
    clubsJoined:     { type: Number, default: 0 },
    rolesHeld:       { type: Number, default: 0 },
    // xp and rank NOT stored here — fetched live from leaderboard-service
  },
  { _id: false }
);

// ── Notification settings sub-schema ─────────────────────────────────────────
const notificationSettingsSchema = new mongoose.Schema(
  {
    emailOnRoleAssigned:  { type: Boolean, default: true },
    emailOnEventApproved: { type: Boolean, default: true },
    emailOnEventRejected: { type: Boolean, default: true },
    emailOnMembership:    { type: Boolean, default: true },
    emailOnEcrReminder:   { type: Boolean, default: true },
    emailOnStepAssigned:  { type: Boolean, default: true },
  },
  { _id: false }
);

// ── Privacy settings sub-schema ───────────────────────────────────────────────
const privacySettingsSchema = new mongoose.Schema(
  {
    showProfile:      { type: Boolean, default: true  },
    showEmail:        { type: Boolean, default: false },
    showActivityFeed: { type: Boolean, default: true  },
  },
  { _id: false }
);

// ── Main Profile schema ───────────────────────────────────────────────────────
const profileSchema = new mongoose.Schema(
  {
    // ── Identity (synced from auth-service via Kafka user.registered) ──────
    userId: {
      type:     String,
      required: true,
      unique:   true,
      // Same as auth-service user._id and JWT sub field
    },

    universityId: {
      type:     mongoose.Schema.Types.ObjectId,
      required: true,
      index:    true,
    },

    userType: {
      type:     String,
      enum:     ['STUDENT', 'FACULTY', 'UNIVERSITY_ADMIN', 'ADMIN', 'SUPER_ADMIN'],
      required: true,
    },

    email: {
      type:     String,
      required: true,
      // Synced from auth-service — never editable by user here
    },

    // ── Basic info (user editable via PATCH /profiles/me) ────────────────
    name: {
      type:      String,
      trim:      true,
      maxlength: 100,
      default:   null,
      // null until user fills it — drives completionScore up
    },

    department: {
      type:      String,
      trim:      true,
      maxlength: 100,
      default:   null,
    },

    graduationYear: {
      type:    Number,
      default: null,
      // STUDENT only — faculty leave this null
    },

    bio: {
      type:      String,
      maxlength: 300,
      default:   null,
    },

    // ── Visual (Instagram-style) ──────────────────────────────────────────
    photoUrl: {
      type:    String,
      default: null,
      // S3 URL in production, placeholder URL in dev
    },

    coverPhotoUrl: {
      type:    String,
      default: null,
    },

    // ── Social links ──────────────────────────────────────────────────────
    linkedinUrl:  { type: String, default: null },
    githubUrl:    { type: String, default: null },
    portfolioUrl: { type: String, default: null },

    // ── Pinned highlight ──────────────────────────────────────────────────
    pinnedHighlight: {
      type:    pinnedHighlightSchema,
      default: null,
    },

    // ── Achievement badges (awarded by Kafka consumers) ───────────────────
    badges: {
      type:    [badgeSchema],
      default: [],
    },

    // ── Stats cache (atomically incremented by Kafka consumers) ──────────
    stats: {
      type:    statsSchema,
      default: () => ({}),
    },

    // ── Activity feed (last 20 items, capped with $slice in repo) ────────
    activityFeed: {
      type:    [activityItemSchema],
      default: [],
    },

    // ── Profile completion score (0–100, recalculated on every update) ───
    completionScore: {
      type:    Number,
      default: 0,
      min:     0,
      max:     100,
    },

    // ── Settings ──────────────────────────────────────────────────────────
    settings: {
      notifications: {
        type:    notificationSettingsSchema,
        default: () => ({}),
      },
      privacy: {
        type:    privacySettingsSchema,
        default: () => ({}),
      },
    },

    // ── Status ────────────────────────────────────────────────────────────
    isActive: {
      type:    Boolean,
      default: true,
      // Set to false when auth-service fires user.blocked Kafka event
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
profileSchema.index({ userId: 1 },                  { unique: true });
profileSchema.index({ universityId: 1 });
profileSchema.index({ universityId: 1, userType: 1 });

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
