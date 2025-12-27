import useSWR from "swr";
import type { Goal } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

export function useGoals(chatId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Goal[]>(
    chatId ? `/api/goal?chatId=${chatId}` : null,
    fetcher,
  );

  return {
    goals: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
