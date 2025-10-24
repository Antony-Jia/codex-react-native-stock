export type PlanStep = {
  id: string;
  action: string;
  objective?: string | null;
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
  graph_json?: GraphSnapshot;
  metrics?: Record<string, unknown>;
};

export type VfsObject = {
  tenant: string;
  path: string;
  payload: Record<string, unknown>;
};

export type GraphNode = {
  node_id: string;
  agent_name: string;
  objective?: string | null;
  static_inputs: Record<string, unknown>;
};

export type GraphEdge = {
  src_node: string;
  dst_node: string;
  field_map: Record<string, string>;
};

export type GraphSnapshot = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type PlannerAgentConfig = {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
};

export type MemoryRecord = {
  path: string;
  payload: Record<string, unknown>;
  note?: string | null;
};

export type PlanGenerationResponse = {
  plan: Plan;
  graph_json: GraphSnapshot;
  tenant: string;
  plan_id: string;
  metadata: Record<string, unknown>;
  memory_records: MemoryRecord[];
};


