export interface ProbeState {
  hasCompletedInitialRun(): boolean;
  markInitialRunComplete(): void;
}

export function createProbeState(): ProbeState {
  let completedInitialRun = false;

  return {
    hasCompletedInitialRun() {
      return completedInitialRun;
    },
    markInitialRunComplete() {
      completedInitialRun = true;
    },
  };
}
