import { apiClient } from "./client";
import { Plan, RunRequest, RunResponse, RunStatus, VfsObject } from "../types";

export const upsertPlan = async (tenant: string, planId: string, plan: Plan) => {
  await apiClient.post("/plans", { tenant, plan_id: planId, plan });
};

export const fetchPlan = async (tenant: string, planId: string) => {
  const { data } = await apiClient.get<Plan>(`/plans/${tenant}/${planId}`);
  return data;
};

export const createRun = async (payload: RunRequest) => {
  const { data } = await apiClient.post<RunResponse>("/runs", payload);
  return data;
};

export const fetchRun = async (runId: string) => {
  const { data } = await apiClient.get<RunStatus>(`/runs/${runId}`);
  return data;
};

export const putVfs = async (payload: VfsObject) => {
  await apiClient.put("/vfs", payload);
};

export const fetchVfs = async (tenant: string, path: string) => {
  const { data } = await apiClient.get<Record<string, unknown>>(`/vfs/${tenant}/${encodeURIComponent(path)}`);
  return data;
};

