"use client";

import { format } from "date-fns";
import { Calendar, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGoal } from "@/hooks/use-goal";
import type { GoalPriority, GoalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StepItem } from "./step-item";

type GoalViewerProps = {
  goalId: string;
  onStepUpdate?: () => void;
};

const statusColors: Record<GoalStatus, string> = {
  not_started: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const priorityColors: Record<GoalPriority, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export function GoalViewer({ goalId, onStepUpdate }: GoalViewerProps) {
  const { goal, isLoading, error, refresh } = useGoal(goalId);

  const handleStepUpdate = () => {
    refresh();
    onStepUpdate?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !goal) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          {error ? "Failed to load goal" : "Goal not found"}
        </CardContent>
      </Card>
    );
  }

  const progress =
    goal.steps.length > 0
      ? Math.round(
          (goal.steps.filter((s) => s.isCompleted).length / goal.steps.length) *
            100,
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <CardTitle>{goal.title}</CardTitle>
            {goal.description && (
              <CardDescription>{goal.description}</CardDescription>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={cn(statusColors[goal.status])}>
              {goal.status.replace("_", " ")}
            </Badge>
            <Badge className={cn(priorityColors[goal.priority])}>
              {goal.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goal.deadline && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="size-4" />
            <span>
              Deadline: {format(new Date(goal.deadline), "MMM d, yyyy")}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
          <div className="text-muted-foreground text-xs">
            {goal.steps.filter((s) => s.isCompleted).length} of{" "}
            {goal.steps.length} steps completed
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <ListChecks className="size-4" />
            <span>Steps</span>
          </div>
          <div className="space-y-1">
            {goal.steps.length === 0 ? (
              <div className="text-muted-foreground text-sm py-4 text-center">
                No steps yet
              </div>
            ) : (
              goal.steps.map((step) => (
                <StepItem
                  key={step.id}
                  step={step}
                  onUpdate={handleStepUpdate}
                />
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
