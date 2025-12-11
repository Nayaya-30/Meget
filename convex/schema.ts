import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - synced with auth provider
  users: defineTable({
    email: v.string(),
    name: v.string(),
    authId: v.string(), // from auth provider (Firebase/Supabase/Clerk)
    avatarUrl: v.optional(v.string()),
    plan: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    apiKey: v.string(), // for widget authentication
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_email", ["email"])
    .index("by_apiKey", ["apiKey"]),

  // Tours table - main tour configurations
  tours: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    tourType: v.union(
      v.literal("ecommerce"),
      v.literal("saas"),
      v.literal("educational"),
      v.literal("custom")
    ),
    targetUrl: v.string(), // where tour will be embedded
    targetUrlPattern: v.optional(v.string()), // regex pattern for URL matching
    isActive: v.boolean(),
    isPublished: v.boolean(),
    
    // Display settings
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("auto")),
    primaryColor: v.string(),
    position: v.union(
      v.literal("top"),
      v.literal("bottom"),
      v.literal("left"),
      v.literal("right"),
      v.literal("center")
    ),
    
    // Behavior settings
    autoStart: v.boolean(),
    showProgress: v.boolean(),
    allowSkip: v.boolean(),
    allowRestart: v.boolean(),
    enableAvatar: v.boolean(),
    avatarType: v.optional(v.string()), // "robot", "human", "custom"
    
    // Advanced settings
    triggerEvent: v.optional(v.string()), // "pageload", "click", "scroll", "custom"
    triggerDelay: v.number(), // milliseconds
    completionRedirect: v.optional(v.string()),
    
    // Metadata
    embedCode: v.string(),
    totalSteps: v.number(),
    estimatedDuration: v.number(), // seconds
    
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_isActive", ["isActive"])
    .index("by_isPublished", ["isPublished"])
    .index("by_tourType", ["tourType"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId", "isActive"],
    }),

  // Steps table - individual tour steps
  steps: defineTable({
    tourId: v.id("tours"),
    stepId: v.string(), // unique identifier within tour (e.g., "step-1", "welcome")
    order: v.number(), // 1, 2, 3, 4, 5...
    
    // Content
    title: v.string(),
    content: v.string(),
    contentType: v.union(v.literal("text"), v.literal("html"), v.literal("markdown")),
    
    // Targeting
    targetElement: v.optional(v.string()), // CSS selector
    targetDescription: v.optional(v.string()), // human-readable description
    highlightElement: v.boolean(),
    highlightPadding: v.number(), // pixels
    
    // Positioning
    position: v.union(
      v.literal("top"),
      v.literal("bottom"),
      v.literal("left"),
      v.literal("right"),
      v.literal("center"),
      v.literal("auto")
    ),
    offset: v.object({
      x: v.number(),
      y: v.number(),
    }),
    
    // Avatar configuration
    avatarConfig: v.optional(
      v.object({
        enabled: v.boolean(),
        avatarType: v.string(),
        animation: v.string(), // "wave", "point", "nod", "celebrate"
        position: v.string(), // "left", "right", "top"
      })
    ),
    
    // Media
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    
    // Interactions
    requireInteraction: v.boolean(), // must click element to proceed
    interactionElement: v.optional(v.string()), // CSS selector for required interaction
    buttonText: v.optional(v.string()), // custom button text
    showBackButton: v.boolean(),
    
    // Advanced
    customCSS: v.optional(v.string()),
    customJS: v.optional(v.string()),
    waitForElement: v.optional(v.string()), // wait for element to appear before showing
    waitTimeout: v.number(), // milliseconds
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tourId", ["tourId"])
    .index("by_tourId_order", ["tourId", "order"])
    .index("by_stepId", ["tourId", "stepId"]),

  // Analytics - Tour sessions
  sessions: defineTable({
    tourId: v.id("tours"),
    sessionId: v.string(), // unique per user session
    userId: v.optional(v.id("users")), // if user is logged in
    
    // Session metadata
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    abandonedAt: v.optional(v.number()),
    duration: v.optional(v.number()), // milliseconds
    
    // Session info
    userAgent: v.string(),
    browser: v.string(),
    device: v.string(),
    os: v.string(),
    screenResolution: v.string(),
    
    // Geographic
    ipAddress: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    
    // Behavior
    totalSteps: v.number(),
    stepsCompleted: v.number(),
    stepsSkipped: v.number(),
    currentStep: v.number(),
    
    // Status
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("abandoned"),
      v.literal("error")
    ),
    
    // Page context
    referrer: v.optional(v.string()),
    pageUrl: v.string(),
    pageTitle: v.optional(v.string()),
  })
    .index("by_tourId", ["tourId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"])
    .index("by_tourId_status", ["tourId", "status"]),

  // Analytics - Step events
  stepEvents: defineTable({
    tourId: v.id("tours"),
    sessionId: v.string(),
    stepId: v.string(),
    stepOrder: v.number(),
    
    eventType: v.union(
      v.literal("step_viewed"),
      v.literal("step_started"),
      v.literal("step_completed"),
      v.literal("step_skipped"),
      v.literal("step_back"),
      v.literal("interaction_completed"),
      v.literal("interaction_failed"),
      v.literal("element_not_found"),
      v.literal("timeout")
    ),
    
    timestamp: v.number(),
    timeOnStep: v.optional(v.number()), // milliseconds
    
    // Event metadata
    metadata: v.optional(
      v.object({
        elementFound: v.optional(v.boolean()),
        interactionSuccess: v.optional(v.boolean()),
        errorMessage: v.optional(v.string()),
        customData: v.optional(v.any()),
      })
    ),
  })
    .index("by_tourId", ["tourId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_stepId", ["tourId", "stepId"])
    .index("by_eventType", ["eventType"])
    .index("by_timestamp", ["timestamp"]),

  // Analytics - Custom events
  customEvents: defineTable({
    tourId: v.id("tours"),
    sessionId: v.string(),
    eventName: v.string(),
    eventData: v.any(),
    timestamp: v.number(),
  })
    .index("by_tourId", ["tourId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_eventName", ["eventName"]),

  // Tour templates for quick start
  templates: defineTable({
    name: v.string(),
    description: v.string(),
    tourType: v.union(
      v.literal("ecommerce"),
      v.literal("saas"),
      v.literal("educational"),
      v.literal("custom")
    ),
    category: v.string(),
    previewImage: v.optional(v.string()),
    isOfficial: v.boolean(),
    usageCount: v.number(),
    
    // Template configuration
    defaultSteps: v.array(
      v.object({
        title: v.string(),
        content: v.string(),
        targetDescription: v.string(),
        position: v.string(),
      })
    ),
    
    // Settings
    defaultSettings: v.object({
      theme: v.string(),
      primaryColor: v.string(),
      autoStart: v.boolean(),
      showProgress: v.boolean(),
      allowSkip: v.boolean(),
      enableAvatar: v.boolean(),
    }),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tourType", ["tourType"])
    .index("by_isOfficial", ["isOfficial"])
    .searchIndex("search_templates", {
      searchField: "name",
      filterFields: ["tourType", "isOfficial"],
    }),

  // User activity log
  activityLog: defineTable({
    userId: v.id("users"),
    action: v.string(), // "tour_created", "tour_published", "tour_deleted", etc.
    entityType: v.string(), // "tour", "step", "settings"
    entityId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),

  // Feedback and ratings
  feedback: defineTable({
    tourId: v.id("tours"),
    sessionId: v.string(),
    rating: v.number(), // 1-5
    comment: v.optional(v.string()),
    feedbackType: v.union(
      v.literal("helpful"),
      v.literal("confusing"),
      v.literal("too_long"),
      v.literal("too_short"),
      v.literal("technical_issue"),
      v.literal("other")
    ),
    timestamp: v.number(),
  })
    .index("by_tourId", ["tourId"])
    .index("by_rating", ["rating"]),
});