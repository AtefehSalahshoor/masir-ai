"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoals } from "@/hooks/use-goals";
import type { GoalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GoalViewer } from "./goal-viewer";

type GoalListProps = {
  chatId: string;
};

const statusColors: Record<GoalStatus, string> = {
  not_started: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export function GoalList({ chatId }: GoalListProps) {
  const { goals, isLoading, error } = useGoals(chatId);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        Failed to load goals
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        No goals yet. Create a goal from an AI plan!
      </div>
    );
  }

  if (selectedGoalId) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setSelectedGoalId(null)}
        >
          ← Back to goals
        </Button>
        <GoalViewer goalId={selectedGoalId} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => {
        // Calculate progress (we need steps for this, but for list view we'll show status)
        return (
          <Card
            key={goal.id}
            className="cursor-pointer transition-colors hover:bg-accent"
            onClick={() => setSelectedGoalId(goal.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-base">{goal.title}</CardTitle>
                <Badge className={cn(statusColors[goal.status])}>
                  {goal.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {goal.description && (
                <p className="text-muted-foreground mb-2 text-sm line-clamp-2">
                  {goal.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span className="capitalize">{goal.priority} priority</span>
                {goal.deadline && (
                  <>
                    <span>•</span>
                    <span>{new Date(goal.deadline).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
