"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useGoal } from "@/hooks/use-goal";
import type { GoalPriority, GoalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StepItem } from "./step-item";

type GoalCardProps = {
  goalId: string;
  compact?: boolean;
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

export function GoalCard({ goalId, compact = false }: GoalCardProps) {
  const { goal, isLoading, refresh } = useGoal(goalId);
  const [isOpen, setIsOpen] = useState(!compact);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
        </CardHeader>
      </Card>
    );
  }

  if (!goal) {
    return null;
  }

  const progress =
    goal.steps.length > 0
      ? Math.round(
          (goal.steps.filter((s) => s.isCompleted).length / goal.steps.length) *
            100,
        )
      : 0;

  const handleStepUpdate = () => {
    refresh();
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <CardTitle className="text-base">{goal.title}</CardTitle>
                {goal.description && !compact && (
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {goal.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn(statusColors[goal.status])}>
                  {goal.status.replace("_", " ")}
                </Badge>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </div>
            </div>
            {!compact && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {goal.description && compact && (
              <p className="text-muted-foreground text-sm">
                {goal.description}
              </p>
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
              <div className="text-muted-foreground text-sm font-medium">
                Steps
              </div>
              <div className="space-y-1">
                {goal.steps.length === 0 ? (
                  <div className="text-muted-foreground py-4 text-center text-sm">
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
