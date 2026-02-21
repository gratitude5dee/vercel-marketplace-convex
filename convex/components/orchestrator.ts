export function managerWelcome(goalText: string) {
  return `Welcome to MorphicFields. We are working toward: ${goalText}`;
}

export function managerStatusUpdate(completed: number, total: number, blocker?: string) {
  if (blocker) {
    return `Progress ${completed}/${total}. Blocker: ${blocker}. Prioritizing unblock now.`;
  }
  return `Progress ${completed}/${total}. We are on track.`;
}

export function managerNormCitation(ruleText: string) {
  return `Per our evolving norm: ${ruleText}`;
}
