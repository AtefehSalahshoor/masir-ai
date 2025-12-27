import useSWR from "swr";
import type { GoalWithSteps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export function useGoal(goalId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<GoalWithSteps>(
    goalId ? `/api/goal?id=${goalId}&withSteps=true` : null,
    fetcher,
  );

  return {
    goal: data ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}
