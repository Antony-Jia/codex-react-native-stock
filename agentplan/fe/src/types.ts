export type PlanStep = {
  id: string;
  action: string;
  depends_on?: string[];
  args?: Record<string, unknown>;
};

export type Plan = {
  steps: PlanStep[];
  description?: string | null;
  version?: string | null;
  meta?: Record<string, unknown>;
};

export type RunRequest = {
  user_input: string;
  tenant: string;
  options: Record<string, unknown>;
};

export type RunResponse = {
  run_id: string;
  status: string;
};

export type RunStatus = {
  run_id: string;
  status: string;
  graph_json?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
};

export type VfsObject = {
  tenant: string;
  path: string;
  payload: Record<string, unknown>;
};

