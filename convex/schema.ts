import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  behaviorTagValidator,
  managerActionTypeValidator,
  participantAuthorityValidator,
  participantCapabilitiesValidator,
  participantInformationValidator,
  participantStyleValidator,
  sessionStatusValidator,
  taskStatusValidator,
  workspaceRoleValidator,
  invocationTriggerValidator,
  constitutionRuleValidator,
  workerCallStatusValidator,
} from "./lib/contracts";

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_status", ["status"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: workspaceRoleValidator,
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  sessions: defineTable({
    workspaceId: v.id("workspaces"),
    goalText: v.string(),
    status: sessionStatusValidator,
    vapiCallId: v.optional(v.string()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    currentTimestep: v.optional(v.number()),
  })
    .index("by_workspace_and_status", ["workspaceId", "status"])
    .index("by_vapi_call_id", ["vapiCallId"]),

  participantPersonas: defineTable({
    workspaceId: v.id("workspaces"),
    sessionId: v.optional(v.id("sessions")),
    userId: v.string(),
    displayName: v.optional(v.string()),
    capabilities: participantCapabilitiesValidator,
    information: participantInformationValidator,
    authority: participantAuthorityValidator,
    style: participantStyleValidator,
    lowReturnMoments: v.optional(v.array(v.number())),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  tasks: defineTable({
    sessionId: v.id("sessions"),
    taskKey: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    status: taskStatusValidator,
    assigneeUserId: v.optional(v.string()),
    estimatedHours: v.optional(v.number()),
    priority: v.number(),
    outputs: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_status", ["sessionId", "status"])
    .index("by_session_and_assignee", ["sessionId", "assigneeUserId"])
    .index("by_session_and_key", ["sessionId", "taskKey"]),

  taskDependencies: defineTable({
    sessionId: v.id("sessions"),
    fromTaskKey: v.string(),
    toTaskKey: v.string(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_and_from", ["sessionId", "fromTaskKey"])
    .index("by_session_and_to", ["sessionId", "toTaskKey"])
    .index("by_session_and_pair", ["sessionId", "fromTaskKey", "toTaskKey"]),

  transcriptChunks: defineTable({
    sessionId: v.id("sessions"),
    sourceEventId: v.optional(v.string()),
    sequence: v.number(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("manager"),
      v.literal("system"),
    ),
    speakerId: v.string(),
    text: v.string(),
    behaviorTag: v.optional(behaviorTagValidator),
    timestamp: v.number(),
  })
    .index("by_session_and_sequence", ["sessionId", "sequence"])
    .index("by_session_and_timestamp", ["sessionId", "timestamp"])
    .index("by_source_event_id", ["sourceEventId"]),

  managerActions: defineTable({
    sessionId: v.id("sessions"),
    actionType: managerActionTypeValidator,
    trigger: invocationTriggerValidator,
    taskKey: v.optional(v.string()),
    message: v.optional(v.string()),
    assigneeUserId: v.optional(v.string()),
    meta: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_session_and_time", ["sessionId", "createdAt"])
    .index("by_session_and_action", ["sessionId", "actionType"]),

  constitutions: defineTable({
    sessionId: v.id("sessions"),
    version: v.number(),
    rules: v.array(constitutionRuleValidator),
    stabilityScore: v.number(),
    parentVersion: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_session_and_version", ["sessionId", "version"]),

  sessionMetricsCurrent: defineTable({
    sessionId: v.id("sessions"),
    goalAchievement: v.number(),
    constraintAdherence: v.number(),
    alignmentScore: v.number(),
    stakeholderMgmt: v.number(),
    runtimeHours: v.number(),
    totalTasks: v.number(),
    completedTasks: v.number(),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  sessionMetricsDaily: defineTable({
    sessionId: v.id("sessions"),
    dateKey: v.string(),
    goalAchievement: v.number(),
    constraintAdherence: v.number(),
    alignmentScore: v.number(),
    stakeholderMgmt: v.number(),
    runtimeHours: v.number(),
    samples: v.number(),
    updatedAt: v.number(),
  }).index("by_session_and_date", ["sessionId", "dateKey"]),

  mediaAssets: defineTable({
    sessionId: v.id("sessions"),
    callId: v.string(),
    storageId: v.id("_storage"),
    contentType: v.string(),
    durationMs: v.optional(v.number()),
    transcriptSnapshotStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_call_id", ["callId"]),

  workerCalls: defineTable({
    sessionId: v.id("sessions"),
    taskKey: v.string(),
    participantUserId: v.string(),
    participantName: v.optional(v.string()),
    vapiCallId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    status: workerCallStatusValidator,
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    summary: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_vapi_call_id", ["vapiCallId"])
    .index("by_session_and_participant", ["sessionId", "participantUserId"])
    .index("by_session_and_status", ["sessionId", "status"]),

  phoneChannels: defineTable({
    workspaceId: v.id("workspaces"),
    phoneNumber: v.string(),
    vapiPhoneNumberId: v.optional(v.string()),
    label: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  webhookEvents: defineTable({
    provider: v.string(),
    eventId: v.string(),
    type: v.string(),
    status: v.union(
      v.literal("received"),
      v.literal("processed"),
      v.literal("ignored"),
      v.literal("failed"),
    ),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    payloadPreview: v.optional(v.string()),
  })
    .index("by_provider_and_eventId", ["provider", "eventId"])
    .index("by_status", ["status"]),
});
