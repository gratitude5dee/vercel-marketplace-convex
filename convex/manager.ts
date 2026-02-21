"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  invocationTriggerValidator,
  managerActionTypeValidator,
} from "./lib/contracts";

type Graph = {
  tasks: Array<{
    taskKey: string;
    status: "pending" | "ready" | "in_progress" | "completed" | "failed";
    priority: number;
    assigneeUserId?: string;
  }>;
  dependencies: Array<{ fromTaskKey: string; toTaskKey: string }>;
};

type Persona = {
  userId: string;
  displayName?: string;
  capabilities: {
    cognitiveJudgment: number;
    creativity: number;
    externalInteraction: number;
  };
  information: {
    domainExpertise: string[];
    privateKnowledge: number;
    preferenceClarity: number;
  };
  authority: {
    responsibilityScope: "full" | "shared" | "delegated";
    authorizableContent: string[];
  };
  style: "concise" | "detailed" | "analytical" | "facilitative";
};

const internalApi = internal as any;
const env = (globalThis as any).process?.env ?? {};

function getPriorityTask(graph: Graph) {
  const openTasks = graph.tasks.filter(
    (task) => task.status === "ready" || task.status === "pending" || task.status === "in_progress",
  );
  if (openTasks.length === 0) {
    return null;
  }

  return openTasks.sort((a, b) => a.priority - b.priority)[0];
}

async function callAnthropicDecision(prompt: string) {
  const apiKey = env.ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: (env.MORPHICFIELDS_MANAGER_MODEL as string | undefined) ?? "claude-3-5-haiku-latest",
      max_tokens: 180,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return body.content?.find((item) => item.type === "text")?.text ?? null;
}

function fallbackDecision(chunk: string, graph: Graph, personas: Persona[]) {
  const lower = chunk.toLowerCase();
  const focusTask = getPriorityTask(graph);

  if ((lower.includes("done") || lower.includes("completed")) && focusTask) {
    return {
      actionType: "UPDATE" as const,
      trigger: "workflow" as const,
      taskKey: focusTask.taskKey,
      message: `Updating ${focusTask.taskKey} to completed.`,
    };
  }

  if ((lower.includes("assign") || lower.includes("owner")) && focusTask && personas[0]) {
    return {
      actionType: "ASSIGN" as const,
      trigger: "workflow" as const,
      taskKey: focusTask.taskKey,
      assigneeUserId: personas[0].userId,
      message: `Assigning ${focusTask.taskKey} to ${personas[0].displayName ?? personas[0].userId}.`,
    };
  }

  if (focusTask) {
    return {
      actionType: "SPEAK" as const,
      trigger: "workflow" as const,
      taskKey: focusTask.taskKey,
      message: `Next critical task is ${focusTask.taskKey}. Please confirm who can take it.`,
    };
  }

  return {
    actionType: "NONE" as const,
    trigger: "none" as const,
    message: "No open tasks remain. Ready to finalize the session.",
  };
}

function parseDecision(text: string | null, fallback: ReturnType<typeof fallbackDecision>) {
  if (!text) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(text) as {
      actionType?: string;
      trigger?: string;
      taskKey?: string;
      assigneeUserId?: string;
      message?: string;
    };

    const normalizedAction = ["ASSIGN", "UPDATE", "SPEAK", "NONE", "INVOKE_HUMAN", "DECOMPOSE"].includes(
      parsed.actionType ?? "",
    )
      ? (parsed.actionType as
          | "ASSIGN"
          | "UPDATE"
          | "SPEAK"
          | "NONE"
          | "INVOKE_HUMAN"
          | "DECOMPOSE")
      : fallback.actionType;

    const normalizedTrigger = ["capability", "information", "authority", "workflow", "none"].includes(
      parsed.trigger ?? "",
    )
      ? (parsed.trigger as "capability" | "information" | "authority" | "workflow" | "none")
      : fallback.trigger;

    return {
      actionType: normalizedAction,
      trigger: normalizedTrigger,
      taskKey: parsed.taskKey ?? fallback.taskKey,
      assigneeUserId: parsed.assigneeUserId ?? fallback.assigneeUserId,
      message: parsed.message ?? fallback.message,
    };
  } catch {
    return fallback;
  }
}

function inferHumanInvocation(chunk: string, personas: Persona[]) {
  const lower = chunk.toLowerCase();

  const authorityKeywords = ["approve", "permission", "authorize", "consent"];
  const creativityKeywords = ["brainstorm", "idea", "creative", "novel", "innovative"];
  const infoKeywords = ["prefer", "choose", "constraint", "decision", "priority", "timeline"];

  let trigger: "capability" | "information" | "authority" | null = null;
  if (authorityKeywords.some((keyword) => lower.includes(keyword))) {
    trigger = "authority";
  } else if (creativityKeywords.some((keyword) => lower.includes(keyword))) {
    trigger = "capability";
  } else if (infoKeywords.some((keyword) => lower.includes(keyword))) {
    trigger = "information";
  }

  if (!trigger || personas.length === 0) {
    return null;
  }

  const ranked = [...personas].sort((a, b) => {
    if (trigger === "capability") {
      return (
        b.capabilities.cognitiveJudgment + b.capabilities.creativity -
        (a.capabilities.cognitiveJudgment + a.capabilities.creativity)
      );
    }
    if (trigger === "information") {
      return (
        b.information.preferenceClarity + b.information.privateKnowledge -
        (a.information.preferenceClarity + a.information.privateKnowledge)
      );
    }
    return (
      (b.authority.responsibilityScope === "full" ? 1 : 0) -
      (a.authority.responsibilityScope === "full" ? 1 : 0)
    );
  });

  const participant = ranked[0];
  const promptByTrigger = {
    capability: `This task needs creative judgment. ${participant.displayName ?? participant.userId}, what approach should we take?`,
    information: `I need preference and constraints input. ${participant.displayName ?? participant.userId}, what should we optimize for next?`,
    authority: `This change requires authorization. ${participant.displayName ?? participant.userId}, do you approve this direction?`,
  };

  return {
    invoke: true,
    participant: participant.displayName ?? participant.userId,
    participantUserId: participant.userId,
    trigger,
    question: promptByTrigger[trigger],
  };
}

export const shouldInvokeHuman = internalAction({
  args: {
    sessionId: v.id("sessions"),
    taskDescription: v.string(),
    latestChunk: v.string(),
  },
  returns: v.object({
    invoke: v.boolean(),
    participant: v.optional(v.string()),
    participantUserId: v.optional(v.string()),
    trigger: v.optional(invocationTriggerValidator),
    question: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const personas = (await ctx.runQuery(internalApi.personas.getBySessionInternal, {
      sessionId: args.sessionId,
    })) as Persona[];

    const heuristic = inferHumanInvocation(`${args.taskDescription}\n${args.latestChunk}`, personas);
    if (!heuristic) {
      return { invoke: false };
    }

    return heuristic;
  },
});

export const processFinalTranscript = internalAction({
  args: {
    sessionId: v.id("sessions"),
    sourceEventId: v.optional(v.string()),
    speakerId: v.string(),
    text: v.string(),
    transcriptChunkId: v.optional(v.id("transcriptChunks")),
  },
  returns: v.object({
    actionType: managerActionTypeValidator,
    trigger: invocationTriggerValidator,
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const [graph, personas, constitution, recentTranscript] = await Promise.all([
      ctx.runQuery(internalApi.tasks.listGraphInternal, { sessionId: args.sessionId }) as Promise<Graph>,
      ctx.runQuery(internalApi.personas.getBySessionInternal, {
        sessionId: args.sessionId,
      }) as Promise<Persona[]>,
      ctx.runQuery(internalApi.constitutions.getLatestInternal, {
        sessionId: args.sessionId,
      }) as Promise<null | { rules: Array<{ text: string }>; stabilityScore: number }>,
      ctx.runQuery(internalApi.transcripts.getRecent, {
        sessionId: args.sessionId,
        limit: 10,
      }) as Promise<Array<{ text: string }>>,
    ]);

    const focusTask = getPriorityTask(graph);
    const invocation = inferHumanInvocation(args.text, personas);
    if (invocation) {
      await ctx.runMutation(internalApi.managerActions.log, {
        sessionId: args.sessionId,
        actionType: "INVOKE_HUMAN",
        trigger: invocation.trigger,
        taskKey: focusTask?.taskKey,
        assigneeUserId: invocation.participantUserId,
        message: invocation.question,
        meta: {
          sourceEventId: args.sourceEventId,
          transcriptChunkId: args.transcriptChunkId,
        },
      });

      await ctx.runMutation(internalApi.transcripts.appendFromWebhook, {
        sessionId: args.sessionId,
        role: "manager",
        speakerId: "manager",
        text: invocation.question,
        behaviorTag: "probe",
      });

      await ctx.runMutation(internalApi.metrics.recompute, {
        sessionId: args.sessionId,
      });

      return {
        actionType: "INVOKE_HUMAN",
        trigger: invocation.trigger,
        message: invocation.question,
      };
    }

    const prompt = `You are the MorphicFields manager agent.
Latest transcript from ${args.speakerId}: ${args.text}
Open tasks: ${JSON.stringify(graph.tasks)}
Dependencies: ${JSON.stringify(graph.dependencies)}
Norms: ${JSON.stringify(constitution?.rules ?? [])}
Recent discussion:
${recentTranscript.map((line) => `- ${line.text}`).join("\n")}

Return JSON with keys: actionType, trigger, taskKey, assigneeUserId, message.
Use one action only: ASSIGN | UPDATE | SPEAK | NONE.
Use trigger: workflow or none.`;

    const fallback = fallbackDecision(args.text, graph, personas);
    const llmRaw = await callAnthropicDecision(prompt);
    const decision = parseDecision(llmRaw, fallback);

    if (decision.actionType === "ASSIGN" && decision.taskKey && decision.assigneeUserId) {
      await ctx.runMutation(internalApi.tasks.assignTaskInternal, {
        sessionId: args.sessionId,
        taskKey: decision.taskKey,
        assigneeUserId: decision.assigneeUserId,
      });
    }

    if (decision.actionType === "UPDATE" && decision.taskKey) {
      const nextStatus = args.text.toLowerCase().includes("done") ? "completed" : "in_progress";
      await ctx.runMutation(internalApi.tasks.updateTaskStatusInternal, {
        sessionId: args.sessionId,
        taskKey: decision.taskKey,
        status: nextStatus,
      });
    }

    await ctx.runMutation(internalApi.managerActions.log, {
      sessionId: args.sessionId,
      actionType: decision.actionType,
      trigger: decision.trigger,
      taskKey: decision.taskKey,
      assigneeUserId: decision.assigneeUserId,
      message: decision.message,
      meta: {
        sourceEventId: args.sourceEventId,
        transcriptChunkId: args.transcriptChunkId,
        llmUsed: llmRaw !== null,
      },
    });

    if (decision.message) {
      await ctx.runMutation(internalApi.transcripts.appendFromWebhook, {
        sessionId: args.sessionId,
        role: "manager",
        speakerId: "manager",
        text: decision.message,
        behaviorTag: decision.actionType === "SPEAK" ? "guide" : "augment",
      });
    }

    if (
      args.text.toLowerCase().includes("prefer") ||
      args.text.toLowerCase().includes("should") ||
      args.text.toLowerCase().includes("must")
    ) {
      await ctx.runMutation(internalApi.constitutions.evolve, {
        sessionId: args.sessionId,
        latestTranscriptText: args.text,
      });
    }

    await Promise.all([
      ctx.runMutation(internalApi.metrics.recompute, { sessionId: args.sessionId }),
      ctx.runMutation(internalApi.sessions.incrementTimestep, { sessionId: args.sessionId }),
    ]);

    return {
      actionType: decision.actionType,
      trigger: decision.trigger,
      message: decision.message,
    };
  },
});
