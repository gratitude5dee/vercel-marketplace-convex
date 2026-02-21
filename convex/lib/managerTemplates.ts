// convex/lib/managerTemplates.ts
// Human Tool prompt builders (from Tang et al., Feb 2026, arXiv:2602.12953)
// Combined with Manager Agent POSG framework (arXiv:2510.02557)

type PersonaCapabilities = {
  cognitiveJudgment: number;
  creativity: number;
  externalInteraction: number;
};

type PersonaInformation = {
  domainExpertise: string[];
  privateKnowledge: number;
  preferenceClarity: number;
};

type PersonaAuthority = {
  responsibilityScope: "full" | "shared" | "delegated";
  authorizableContent: string[];
};

type PersonaProfile = {
  userId: string;
  displayName?: string;
  capabilities: PersonaCapabilities;
  information: PersonaInformation;
  authority: PersonaAuthority;
  style: "concise" | "detailed" | "analytical" | "facilitative";
};

type ConstitutionRule = {
  text: string;
  source: "seed" | "evolved" | "manual";
  confidence: number;
};

type TaskNode = {
  taskKey: string;
  label: string;
  description?: string;
  status: "pending" | "ready" | "in_progress" | "completed" | "failed";
  assigneeUserId?: string;
  priority: number;
};

type TaskEdge = {
  fromTaskKey: string;
  toTaskKey: string;
};

// ---------------------------------------------------------------------------
// Section 1: Human Tool Profile Prompt (Paper Figure 5)
// ---------------------------------------------------------------------------

function describeCapabilities(cap: PersonaCapabilities): string {
  const judgment =
    cap.cognitiveJudgment > 0.7
      ? "Strong cognitive judgment"
      : cap.cognitiveJudgment > 0.4
        ? "Moderate cognitive judgment"
        : "Limited cognitive judgment";
  const creativity =
    cap.creativity > 0.7
      ? "highly creative"
      : cap.creativity > 0.4
        ? "moderately creative"
        : "developing creativity";
  const interaction =
    cap.externalInteraction > 0.7
      ? "strong ability to act externally"
      : cap.externalInteraction > 0.4
        ? "moderate external interaction"
        : "limited external interaction";
  return `${judgment}; ${creativity}; ${interaction}.`;
}

function describeInformation(info: PersonaInformation): string {
  const expertise =
    info.domainExpertise.length > 0
      ? `Expertise in ${info.domainExpertise.join(", ")}`
      : "No declared domain expertise";
  const knowledge =
    info.privateKnowledge > 0.7
      ? "significant private knowledge"
      : info.privateKnowledge > 0.4
        ? "moderate private knowledge"
        : "limited private knowledge";
  const clarity =
    info.preferenceClarity > 0.7
      ? "clear personal preferences"
      : info.preferenceClarity > 0.4
        ? "partially clear preferences"
        : "unclear preferences";
  return `${expertise}; ${knowledge}; ${clarity}.`;
}

function describeAuthority(auth: PersonaAuthority): string {
  const scope = {
    full: "Makes decisions independently",
    shared: "Shares decision authority with the group",
    delegated: "Delegates most decisions to the AI manager",
  }[auth.responsibilityScope];
  const content =
    auth.authorizableContent.length > 0
      ? `authorizes: ${auth.authorizableContent.join(", ")}`
      : "no specific authorizable content declared";
  return `${scope}; ${content}.`;
}

/**
 * Builds a Human Tool profile prompt for a single participant.
 * Adapted from paper Figure 5: User Customization Prompt.
 */
export function buildHumanToolPrompt(persona: PersonaProfile): string {
  return `User Profile - ${persona.displayName ?? persona.userId}:

Capabilities: ${describeCapabilities(persona.capabilities)}

Information: ${describeInformation(persona.information)}

Authority: ${describeAuthority(persona.authority)}

Communication style: ${persona.style}`;
}

// ---------------------------------------------------------------------------
// Section 2: Unified Manager Prompt (Paper Figures 5+6+7 combined)
// ---------------------------------------------------------------------------

/**
 * Builds the complete manager agent prompt combining:
 * - Human Tool profiles (Paper Fig. 5)
 * - Task decomposition with execution mode labels (Paper Fig. 6)
 * - Interaction behaviors and communication guidelines (Paper Fig. 7)
 * - Constitution/evolved norms
 */
export function buildManagerPrompt(params: {
  goalText: string;
  tasks: TaskNode[];
  dependencies: TaskEdge[];
  participants: PersonaProfile[];
  constitution: { rules: ConstitutionRule[]; stabilityScore: number } | null;
  recentTranscript: string[];
  currentTimestep: number;
}): string {
  const {
    goalText,
    tasks,
    dependencies,
    participants,
    constitution,
    recentTranscript,
    currentTimestep,
  } = params;

  const humanToolProfiles =
    participants.length > 0
      ? participants.map((p) => buildHumanToolPrompt(p)).join("\n---\n")
      : "No participants have joined yet.";

  const openTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "failed");
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const taskSummary = tasks
    .map((t) => {
      const mode =
        t.assigneeUserId || t.status === "in_progress"
          ? "[User participation]"
          : "[AI execution]";
      return `  ${mode} ${t.taskKey} (${t.status}, P${t.priority}): ${t.label}`;
    })
    .join("\n");

  const depSummary =
    dependencies.length > 0
      ? dependencies.map((d) => `  ${d.fromTaskKey} -> ${d.toTaskKey}`).join("\n")
      : "  No dependencies declared.";

  const constitutionRules =
    constitution && constitution.rules.length > 0
      ? constitution.rules.map((r) => `- [${r.source}] ${r.text}`).join("\n")
      : "No norms evolved yet.";

  const recentContext =
    recentTranscript.length > 0
      ? recentTranscript
          .slice(0, 10)
          .map((line) => `- ${line}`)
          .join("\n")
      : "No recent transcript.";

  return `You are the MorphicFields Manager Agent.
You coordinate multi-human collaborative sessions using the Human Tool paradigm.
AI leads the workflow; humans are selectively invoked as callable tools at decision-critical moments.

## HUMAN TOOL PROFILES (Paper Fig. 5)
${humanToolProfiles}

## TASK DECOMPOSITION (Paper Fig. 6)
Current goal: ${goalText}
Timestep: ${currentTimestep}
Progress: ${completedCount}/${tasks.length} tasks completed, ${openTasks.length} open.

Task graph:
${taskSummary}

Dependencies:
${depSummary}

For each task, label execution mode:
- [AI execution] for tasks AI handles independently
- [User participation] for tasks needing human input

## INVOCATION TRIGGERS (Paper Section 3.2)
Invoke Human Tool when ANY of these apply:
1. CAPABILITY: Task needs creative judgment, novel reasoning, or physical-world interaction
2. INFORMATION: Task needs domain expertise, private knowledge, or personal preferences the AI lacks
3. AUTHORITY: Task requires human responsibility or authorization

## INTERACTION BEHAVIORS (Paper Fig. 7)
Initially: Prime (set context) then Configure (explain collaboration style)
During: Probe > Cue > Elicit > Augment > Guide > Critique
When wrong: Explain > Correct > Reflect
Ending: Approve (seek final confirmation)

## COMMUNICATION GUIDELINES
- Natural conversational tone, echo participant language
- Provide encouragement and calibrated warmth
- Address participants by name, build rapport
- Be transparent about reasoning and limitations
- Never repeat yourself; never exaggerate progress
- Keep voice responses under 30 words. Be proactive.

## CONSTITUTION (evolved norms, stability: ${constitution?.stabilityScore?.toFixed(2) ?? "N/A"})
${constitutionRules}

## RECENT DISCUSSION
${recentContext}

Respond with a single JSON object:
{
  "actionType": "ASSIGN" | "UPDATE" | "SPEAK" | "NONE" | "INVOKE_HUMAN" | "DECOMPOSE",
  "trigger": "capability" | "information" | "authority" | "workflow" | "none",
  "taskKey": "optional task key",
  "assigneeUserId": "optional user id",
  "message": "what to say or do"
}`;
}

// ---------------------------------------------------------------------------
// Section 3: Voice Persona Templates (Manager Agent speech patterns)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 4: Worker Agent Prompt (Parallel Vapi calls, one task per human)
// ---------------------------------------------------------------------------

/**
 * Builds the scoped worker assistant prompt for a single parallel Vapi call.
 * Each worker agent handles exactly ONE task with ONE human participant.
 * The manager agent dispatches these calls; workers do NOT coordinate with each
 * other directly.
 */
export function buildWorkerPrompt(params: {
  taskKey: string;
  taskLabel: string;
  taskDescription: string;
  participantName: string;
  participantStyle: "concise" | "detailed" | "analytical" | "facilitative";
  dependencyStatus: Array<{ taskKey: string; label: string; status: string }>;
  constitutionRules: string[];
  sessionGoal: string;
}): string {
  const {
    taskKey,
    taskLabel,
    taskDescription,
    participantName,
    participantStyle,
    dependencyStatus,
    constitutionRules,
    sessionGoal,
  } = params;

  const depLines =
    dependencyStatus.length > 0
      ? dependencyStatus
          .map((d) => `  - ${d.label} (${d.taskKey}): ${d.status}`)
          .join("\n")
      : "  None.";

  const ruleLines =
    constitutionRules.length > 0
      ? constitutionRules.map((r) => `- ${r}`).join("\n")
      : "No evolved norms.";

  const styleGuide = {
    concise: "Keep responses brief and direct.",
    detailed: "Provide thorough explanations when asked.",
    analytical: "Use structured reasoning and data points.",
    facilitative: "Guide with open-ended questions and encouragement.",
  }[participantStyle];

  return `You are a MorphicFields Worker Agent.
You handle ONE task for ONE participant. You do NOT manage other tasks or participants.

## SESSION GOAL
${sessionGoal}

## YOUR TASK
Key: ${taskKey}
Label: ${taskLabel}
Description: ${taskDescription}

## PARTICIPANT
Name: ${participantName}
Communication style: ${styleGuide}

## DEPENDENCY STATUS
${depLines}

## RULES
${ruleLines}

## BEHAVIOR
- Stay strictly within the scope of your assigned task.
- Ask clarifying questions if blocked or uncertain.
- Report progress succinctly when asked.
- If you encounter a blocker, say: "I am blocked on [X] because [Y]."
- When the task is complete, say: "Task ${taskKey} is complete."
- Do NOT plan, assign, or discuss tasks beyond your scope.

## OUTPUT STYLE
- Under 25 words per turn unless the participant asks for detail.
- Natural conversational tone. Use the participant's name.
- Never repeat yourself. Never exaggerate progress.`;
}

export const managerTemplates = {
  assign(taskKey: string, assignee: string) {
    return `Assigning ${taskKey} to ${assignee}. Any objections before we proceed?`;
  },
  statusUpdate(completed: number, total: number, blocker?: string) {
    if (blocker) {
      return `Progress ${completed}/${total}. Blocker: ${blocker}. Prioritizing resolution now.`;
    }
    return `Progress ${completed}/${total}. We are on track.`;
  },
  normCitation(ruleText: string) {
    return `Per our evolving norm: ${ruleText}`;
  },
  dependencyAlert(blocked: string, blocker: string) {
    return `${blocked} depends on ${blocker}. We should finish ${blocker} first.`;
  },
  approvalRequest(change: string) {
    return `This change requires authorization: ${change}. Do we have approval?`;
  },
  invokeHuman(participantName: string, trigger: string, question: string) {
    return `Invoking ${participantName} (trigger: ${trigger}). ${question}`;
  },
  sessionPrime(goalText: string, taskCount: number) {
    return `Welcome to MorphicFields. Our goal: ${goalText}. We have ${taskCount} tasks in the graph. I will coordinate and invoke participants when human input is needed.`;
  },
  sessionConfigure(participantNames: string[]) {
    const names = participantNames.join(", ");
    return `Participants: ${names}. I will lead the workflow and ask targeted questions at decision points. Let us begin.`;
  },
  sessionApprove(completedTasks: number, totalTasks: number) {
    return `All ${completedTasks}/${totalTasks} tasks addressed. Seeking final confirmation before closing the session.`;
  },
};
