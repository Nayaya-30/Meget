import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { nanoid } from "nanoid";

// Create or update user from auth provider
export const upsertUser = mutation({
  args: {
    authId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (
    ctx: MutationCtx,
    args: { authId: string; email: string; name: string; avatarUrl?: string }
  ) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    }

    // Create new user with API key
    const apiKey = `pk_live_${nanoid(32)}`;
    
    const userId = await ctx.db.insert("users", {
      authId: args.authId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      plan: "free",
      apiKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      userId,
      action: "user_created",
      entityType: "user",
      entityId: userId,
      timestamp: Date.now(),
    });

    return userId;
  },
});

// Get user by auth ID
export const getUserByAuthId = query({
  args: { authId: v.string() },
  handler: async (ctx: QueryCtx, args: { authId: string }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();
    
    return user;
  },
});

// Get user by API key (for widget authentication)
export const getUserByApiKey = query({
  args: { apiKey: v.string() },
  handler: async (ctx: QueryCtx, args: { apiKey: string }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", args.apiKey))
      .first();
    
    return user;
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (
    ctx: MutationCtx,
    args: { userId: Id<'users'>; name?: string; avatarUrl?: string }
  ) => {
    const { userId, ...updates } = args;
    
    await ctx.db.patch(userId, {
      ...updates,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      userId,
      action: "profile_updated",
      entityType: "user",
      entityId: userId,
      timestamp: Date.now(),
    });

    return userId;
  },
});

// Regenerate API key
export const regenerateApiKey = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx: MutationCtx, args: { userId: Id<'users'> }) => {
    const newApiKey = `pk_live_${nanoid(32)}`;
    
    await ctx.db.patch(args.userId, {
      apiKey: newApiKey,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      userId: args.userId,
      action: "api_key_regenerated",
      entityType: "user",
      entityId: args.userId,
      timestamp: Date.now(),
    });

    return newApiKey;
  },
});

// Get user statistics
export const getUserStats = query({
  args: { ownerId: v.string() },
  handler: async (ctx: QueryCtx, args: { ownerId: string }) => {
    // Get all user's tours
    const tours = await ctx.db
      .query("tours")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    const activeTours = tours.filter((t) => t.isActive).length;
    const publishedTours = tours.filter((t) => t.isPublished).length;

    // Get total sessions across all tours
    let totalSessions = 0;
    let completedSessions = 0;
    let totalViews = 0;

    for (const tour of tours) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_tourId", (q) => q.eq("tourId", tour._id))
        .collect();

      totalSessions += sessions.length;
      completedSessions += sessions.filter((s) => s.status === "completed").length;
      
      const events = await ctx.db
        .query("stepEvents")
        .withIndex("by_tourId", (q) => q.eq("tourId", tour._id))
        .collect();
      
      totalViews += events.filter((e) => e.eventType === "step_viewed").length;
    }

    const completionRate = totalSessions > 0 
      ? (completedSessions / totalSessions) * 100 
      : 0;

    return {
      totalTours: tours.length,
      activeTours,
      publishedTours,
      totalSessions,
      completedSessions,
      completionRate: Math.round(completionRate * 10) / 10,
      totalViews,
    };
  },
});

// Get user activity log
export const getUserActivity = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: QueryCtx, args: { userId: Id<'users'>; limit?: number }) => {
    const limit = args.limit || 50;
    
    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return activities;
  },
});
