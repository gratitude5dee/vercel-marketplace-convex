import { v } from "convex/values";

export type ManagerActionType =
  | "ASSIGN"
  | "UPDATE"
  | "SPEAK"
  | "NONE"
  | "INVOKE_HUMAN"
  | "DECOMPOSE";

export type InvocationTrigger =
  | "capability"
  | "information"
  | "authority"
  | "workflow"
  | "none";

export type BehaviorTag =
  | "prime"
  | "configure"
  | "probe"
  | "cue"
  | "elicit"
  | "augment"
  | "guide"
  | "critique"
  | "explain"
  | "correct"
  | "reflect"
  | "approve";

export type TaskStatus =
  | "pending"
  | "ready"
  | "in_progress"
  | "completed"
  | "failed";

export type ConstitutionRule = {
  text: string;
  source: "seed" | "evolved" | "manual";
  confidence: number;
};

export type VapiEventEnvelope = {
  eventId?: string;
  timestamp?: number;
  sessionId?: string;
  message: {
    type: string;
    transcriptType?: string;
    transcript?: {
      text?: string;
      speaker?: string;
      role?: string;
    };
    call?: {
      id?: string;
    };
    recordingUrl?: string;
    summary?: string;
    durationMs?: number;
  };
};

export const workspaceRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer"),
);

export const sessionStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("failed"),
);

export const taskStatusValidator = v.union(
  v.literal("pending"),
  v.literal("ready"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("failed"),
);

export const invocationTriggerValidator = v.union(
  v.literal("capability"),
  v.literal("information"),
  v.literal("authority"),
  v.literal("workflow"),
  v.literal("none"),
);

export const managerActionTypeValidator = v.union(
  v.literal("ASSIGN"),
  v.literal("UPDATE"),
  v.literal("SPEAK"),
  v.literal("NONE"),
  v.literal("INVOKE_HUMAN"),
  v.literal("DECOMPOSE"),
);

export const behaviorTagValidator = v.union(
  v.literal("prime"),
  v.literal("configure"),
  v.literal("probe"),
  v.literal("cue"),
  v.literal("elicit"),
  v.literal("augment"),
  v.literal("guide"),
  v.literal("critique"),
  v.literal("explain"),
  v.literal("correct"),
  v.literal("reflect"),
  v.literal("approve"),
);

export const constitutionRuleValidator = v.object({
  text: v.string(),
  source: v.union(v.literal("seed"), v.literal("evolved"), v.literal("manual")),
  confidence: v.number(),
});

export const participantCapabilitiesValidator = v.object({
  cognitiveJudgment: v.number(),
  creativity: v.number(),
  externalInteraction: v.number(),
});

export const participantInformationValidator = v.object({
  domainExpertise: v.array(v.string()),
  privateKnowledge: v.number(),
  preferenceClarity: v.number(),
});

export const participantAuthorityValidator = v.object({
  responsibilityScope: v.union(
    v.literal("full"),
    v.literal("shared"),
    v.literal("delegated"),
  ),
  authorizableContent: v.array(v.string()),
});

export const participantStyleValidator = v.union(
  v.literal("concise"),
  v.literal("detailed"),
  v.literal("analytical"),
  v.literal("facilitative"),
);

export const managerDecisionValidator = v.object({
  actionType: managerActionTypeValidator,
  trigger: invocationTriggerValidator,
  taskKey: v.optional(v.string()),
  assigneeUserId: v.optional(v.string()),
  message: v.optional(v.string()),
});

export const vapiEventEnvelopeValidator = v.object({
  eventId: v.optional(v.string()),
  timestamp: v.optional(v.number()),
  sessionId: v.optional(v.id("sessions")),
  message: v.object({
    type: v.string(),
    transcriptType: v.optional(v.string()),
    transcript: v.optional(
      v.object({
        text: v.optional(v.string()),
        speaker: v.optional(v.string()),
        role: v.optional(v.string()),
      }),
    ),
    call: v.optional(
      v.object({
        id: v.optional(v.string()),
      }),
    ),
    recordingUrl: v.optional(v.string()),
    summary: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  }),
});

export const sessionGraphNodeValidator = v.object({
  _id: v.id("tasks"),
  _creationTime: v.number(),
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
});

export const sessionGraphEdgeValidator = v.object({
  _id: v.id("taskDependencies"),
  _creationTime: v.number(),
  sessionId: v.id("sessions"),
  fromTaskKey: v.string(),
  toTaskKey: v.string(),
});

export const dashboardMetricsValidator = v.object({
  sessionId: v.id("sessions"),
  goalAchievement: v.number(),
  constraintAdherence: v.number(),
  alignmentScore: v.number(),
  stakeholderMgmt: v.number(),
  runtimeHours: v.number(),
  totalTasks: v.number(),
  completedTasks: v.number(),
  updatedAt: v.number(),
});

export function buildGraphDto(input: {
  tasks: Array<{
    _id: string;
    _creationTime: number;
    sessionId: string;
    taskKey: string;
    label: string;
    description?: string;
    status: TaskStatus;
    assigneeUserId?: string;
    estimatedHours?: number;
    priority: number;
    outputs?: string[];
    updatedAt: number;
  }>;
  dependencies: Array<{
    _id: string;
    _creationTime: number;
    sessionId: string;
    fromTaskKey: string;
    toTaskKey: string;
  }>;
}) {
  return {
    tasks: input.tasks,
    dependencies: input.dependencies,
  };
}

export function buildMetricsDto(input: {
  sessionId: string;
  goalAchievement: number;
  constraintAdherence: number;
  alignmentScore: number;
  stakeholderMgmt: number;
  runtimeHours: number;
  totalTasks: number;
  completedTasks: number;
  updatedAt: number;
}) {
  return {
    sessionId: input.sessionId,
    goalAchievement: Number(input.goalAchievement.toFixed(3)),
    constraintAdherence: Number(input.constraintAdherence.toFixed(3)),
    alignmentScore: Number(input.alignmentScore.toFixed(3)),
    stakeholderMgmt: Number(input.stakeholderMgmt.toFixed(3)),
    runtimeHours: Number(input.runtimeHours.toFixed(2)),
    totalTasks: input.totalTasks,
    completedTasks: input.completedTasks,
    updatedAt: input.updatedAt,
  };
}
