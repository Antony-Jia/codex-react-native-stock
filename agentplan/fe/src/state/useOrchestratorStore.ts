import { create } from "zustand";
import {
  createRun,
  fetchPlan,
  fetchRun,
  fetchVfs,
  putVfs,
  upsertPlan,
} from "../api/orchestrator";
import { Plan, RunResponse, RunStatus } from "../types";

type OrchestratorState = {
  tenant: string;
  planId: string;
  plan: Plan | null;
  runStatus: RunStatus | null;
  vfsPath: string;
  vfsData: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  setTenant: (tenant: string) => void;
  setPlanId: (planId: string) => void;
  loadPlan: () => Promise<void>;
  savePlan: (plan: Plan) => Promise<void>;
  triggerRun: (userInput: string) => Promise<RunResponse | null>;
  refreshRun: (runId: string) => Promise<RunStatus | null>;
  loadVfs: (path: string) => Promise<void>;
  saveVfs: (path: string, payload: Record<string, unknown>) => Promise<void>;
  clearError: () => void;
};

export const useOrchestratorStore = create<OrchestratorState>((set, get) => ({
  tenant: "demo",
  planId: "default-plan",
  plan: null,
  runStatus: null,
  vfsPath: "",
  vfsData: null,
  loading: false,
  error: null,
  setTenant: (tenant) => set({ tenant }),
  setPlanId: (planId) => set({ planId }),
  clearError: () => set({ error: null }),
  loadPlan: async () => {
    const { tenant, planId } = get();
    set({ loading: true, error: null });
    try {
      const plan = await fetchPlan(tenant, planId);
      set({ plan });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load plan" });
    } finally {
      set({ loading: false });
    }
  },
  savePlan: async (plan) => {
    const { tenant, planId } = get();
    set({ loading: true, error: null });
    try {
      await upsertPlan(tenant, planId, plan);
      set({ plan });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to save plan" });
    } finally {
      set({ loading: false });
    }
  },
  triggerRun: async (userInput) => {
    const { tenant, planId } = get();
    set({ loading: true, error: null });
    try {
      const run = await createRun({ user_input: userInput, tenant, options: { plan_id: planId } });
      return run;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to create run" });
      return null;
    } finally {
      set({ loading: false });
    }
  },
  refreshRun: async (runId) => {
    set({ loading: true, error: null });
    try {
      const status = await fetchRun(runId);
      set({ runStatus: status });
      return status;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch run" });
      return null;
    } finally {
      set({ loading: false });
    }
  },
  loadVfs: async (path) => {
    const { tenant } = get();
    set({ loading: true, error: null });
    try {
      const payload = await fetchVfs(tenant, path);
      set({ vfsPath: path, vfsData: payload });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load VFS" });
    } finally {
      set({ loading: false });
    }
  },
  saveVfs: async (path, payload) => {
    const { tenant } = get();
    set({ loading: true, error: null });
    try {
      await putVfs({ tenant, path, payload });
      set({ vfsPath: path, vfsData: payload });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to save VFS" });
    } finally {
      set({ loading: false });
    }
  },
}));

