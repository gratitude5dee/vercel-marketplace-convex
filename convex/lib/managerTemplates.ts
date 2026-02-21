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
};
