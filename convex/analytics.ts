import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { Id, Doc } from './_generated/dataModel';
import { v } from 'convex/values';

// Record when a user starts a tour
export const startTour = mutation({
	args: {
		tourId: v.string(),
		userId: v.string(),
	},
    handler: async (ctx: MutationCtx, args: { tourId: string; userId: string }) => {
		const now = Date.now();
		const analyticsId = await ctx.db.insert('tourAnalytics', {
			tourId: args.tourId,
			userId: args.userId,
			startedAt: now,
			stepProgress: [],
		});

		return analyticsId;
	},
});

// Record when a user completes a step
export const completeStep = mutation({
	args: {
		analyticsId: v.id('tourAnalytics'),
		stepId: v.string(),
	},
    handler: async (ctx: MutationCtx, args: { analyticsId: Id<'tourAnalytics'>; stepId: string }) => {
		const analyticsRecord = await ctx.db.get(args.analyticsId);
		if (!analyticsRecord) {
			throw new Error('Analytics record not found');
		}

		const now = Date.now();
		const updatedProgress = [...analyticsRecord.stepProgress];

		// Find if step already exists
		const stepIndex = updatedProgress.findIndex(
			(step) => step.stepId === args.stepId
		);

		if (stepIndex >= 0) {
			// Update existing step
			updatedProgress[stepIndex] = {
				...updatedProgress[stepIndex],
				completedAt: now,
			};
		} else {
			// Add new step
			updatedProgress.push({
				stepId: args.stepId,
				startedAt: now,
				completedAt: now,
			});
		}

		await ctx.db.patch(args.analyticsId, {
			stepProgress: updatedProgress,
		});

		return args.analyticsId;
	},
});

// Record when a user completes a tour
export const completeTour = mutation({
	args: {
		analyticsId: v.id('tourAnalytics'),
	},
    handler: async (ctx: MutationCtx, args: { analyticsId: Id<'tourAnalytics'> }) => {
		const now = Date.now();
		await ctx.db.patch(args.analyticsId, {
			completedAt: now,
		});

		return args.analyticsId;
	},
});

// Record when a user abandons a tour
export const abandonTour = mutation({
	args: {
		analyticsId: v.id('tourAnalytics'),
	},
    handler: async (ctx: MutationCtx, args: { analyticsId: Id<'tourAnalytics'> }) => {
		const now = Date.now();
		await ctx.db.patch(args.analyticsId, {
			abandonedAt: now,
		});

		return args.analyticsId;
	},
});

// Get analytics for a specific tour
export const getTourAnalytics = query({
	args: {
		tourId: v.string(),
	},
    handler: async (ctx: QueryCtx, args: { tourId: string }) => {
		const analytics = await ctx.db
			.query('tourAnalytics')
			.withIndex('by_tour', (q) => q.eq('tourId', args.tourId))
			.collect();

		// Calculate completion rate
		const totalStarted = analytics.length;
		const totalCompleted = analytics.filter((a) => a.completedAt).length;
		const completionRate =
			totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0;

		// Calculate step completion rates
		const stepCompletion: Record<
			string,
			{ started: number; completed: number }
		> = {};

		for (const record of analytics) {
			for (const step of record.stepProgress) {
				if (!stepCompletion[step.stepId]) {
					stepCompletion[step.stepId] = { started: 0, completed: 0 };
				}
				stepCompletion[step.stepId].started += 1;
				if (step.completedAt) {
					stepCompletion[step.stepId].completed += 1;
				}
			}
		}

		const stepCompletionRates = Object.entries(stepCompletion).map(
			([stepId, data]) => ({
				stepId,
				completionRate:
					data.started > 0
						? (data.completed / data.started) * 100
						: 0,
			})
		);

		return {
			totalStarted,
			totalCompleted,
			completionRate,
			stepCompletionRates,
		};
	},
});

// Get recent activity across all tours
export const getRecentActivity = query({
	args: {},
    handler: async (ctx: QueryCtx) => {
		const recentAnalytics = await ctx.db
			.query('tourAnalytics')
			.order('desc')
			.take(10);

		const activities = await Promise.all(
			recentAnalytics.map(async (record) => {
				let tourName = 'Unknown Tour';
                try {
                    const tour = await ctx.db.get(record.tourId as Id<'tours'>);
                    if (tour && typeof tour.name === 'string') {
                        tourName = tour.name;
                    }
                } catch (e) {
                    console.error('Failed to fetch tour', e);
                }

				return {
					id: record._id,
					user: record.userId || 'Anonymous',
					action: record.completedAt ? 'completed' : 'started',
					target: tourName,
					timestamp: record._creationTime,
				};
			})
		);

        return activities;
    },
});

// Owner-wide analytics summary for charts
export const getOwnerAnalyticsSummary = query({
    args: { ownerId: v.string() },
    handler: async (ctx: QueryCtx, args: { ownerId: string }) => {
        const tours: Doc<'tours'>[] = await ctx.db
            .query('tours')
            .withIndex('by_owner', (q) => q.eq('ownerId', args.ownerId))
            .collect();

        const perTour = [] as Array<{
            tourId: Id<'tours'>;
            name: string;
            completionRate: number;
            stepsCount: number;
        }>;

        for (const tour of tours) {
            const analytics: Doc<'tourAnalytics'>[] = await ctx.db
                .query('tourAnalytics')
                .withIndex('by_tour', (q) => q.eq('tourId', tour._id as unknown as string))
                .collect();
            const totalStarted = analytics.length;
            const totalCompleted = analytics.filter((a) => !!a.completedAt).length;
            const completionRate = totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0;
            perTour.push({
                tourId: tour._id as Id<'tours'>,
                name: tour.name as string,
                completionRate,
                stepsCount: Array.isArray(tour.steps) ? tour.steps.length : 0,
            });
        }

        // Recent activity by day (started events)
        const recent: Doc<'tourAnalytics'>[] = await ctx.db
            .query('tourAnalytics')
            .order('desc')
            .take(50);
        const byDay = new Map<string, number>();
        for (const rec of recent) {
            const d = new Date(rec.startedAt);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
            byDay.set(key, (byDay.get(key) || 0) + 1);
        }

        const completionsByDay = Array.from(byDay.entries())
            .slice(0, 7)
            .reverse()
            .map(([date, count]) => ({ date, completions: count }));

        return { perTour, completionsByDay };
    },
});
