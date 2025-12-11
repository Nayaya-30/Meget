import { mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { v } from 'convex/values';

export const signUp = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { name: string; email: string }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .collect();

    if (existing.length > 0) {
      throw new Error('An account with this email already exists');
    }

    const id = await ctx.db.insert('users', {
      name: args.name,
      email: args.email,
      createdAt: Date.now(),
    });

    return id;
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { email: string }) => {
    const users = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .collect();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    return users[0]._id;
  },
});

export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { email: string }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .collect();
    void existing;
    return { ok: true };
  },
});

