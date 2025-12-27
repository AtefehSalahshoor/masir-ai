"use client";

import { useState } from "react";
import { createGoalFromPlan } from "@/app/(chat)/actions";
import { Button } from "@/components/ui/button";
import { toast } from "./toast";

type PlanActionButtonProps = {
  chatId: string;
  messageId: string;
  messageText: string;
  onSuccess?: () => void;
};

export function PlanActionButton({
  chatId,
  messageId,
  messageText,
  onSuccess,
}: PlanActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const extractPlanFromText = (text: string) => {
    // Extract goal title - look for "Goal:" or "**Goal:**" pattern
    const goalMatch = text.match(/(?:\*\*)?Goal(?:\*\*)?:\s*(.+?)(?:\n|$)/i);
    const goalTitle = goalMatch?.[1]?.trim() ?? "New Goal";

    // Extract description - between Goal and Steps
    const descriptionMatch = text.match(
      /(?:\*\*)?Description(?:\*\*)?:\s*(.+?)(?:\n(?:\*\*)?(?:Daily\s+)?Steps|$)/is,
    );
    const description = descriptionMatch?.[1]?.trim() ?? null;

    // Find the steps section - look for "Steps:" or "Daily Steps:" marker
    const stepsSectionMatch = text.match(
      /(?:\*\*)?(?:Daily\s+)?Steps(?:\*\*)?:?\s*\n(.+)/is,
    );

    let steps: Array<{ title: string }> = [];

    if (stepsSectionMatch) {
      // Only extract from text AFTER the steps marker
      const stepsText = stepsSectionMatch[1];
      const stepLines = stepsText
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => {
          // Only include lines that start with number or bullet
          const numbered = /^\d+\.\s*(.+)/.exec(line);
          const bulleted = /^[-*]\s*(.+)/.exec(line);
          return numbered || bulleted;
        })
        .map((line) => {
          const numbered = /^\d+\.\s*(.+)/.exec(line);
          const bulleted = /^[-*]\s*(.+)/.exec(line);
          return numbered?.[1]?.trim() ?? bulleted?.[1]?.trim() ?? "";
        })
        .filter((title) => title.length > 0)
        // Filter out steps that match goal title or description
        .filter((title) => {
          const titleLower = title.toLowerCase();
          const goalTitleLower = goalTitle.toLowerCase();
          const descriptionLower = description?.toLowerCase() ?? "";

          // Exclude if step matches goal title or description
          if (
            titleLower === goalTitleLower ||
            titleLower === descriptionLower
          ) {
            return false;
          }

          // Exclude if step contains goal title or description (to avoid partial matches)
          if (
            goalTitleLower.length > 5 &&
            titleLower.includes(goalTitleLower)
          ) {
            return false;
          }

          if (
            descriptionLower.length > 5 &&
            titleLower.includes(descriptionLower)
          ) {
            return false;
          }

          return true;
        });

      steps = stepLines.map((title) => ({ title }));
    }

    // Ensure we have at least one step
    if (steps.length === 0) {
      steps = [{ title: "Start working on your goal" }];
    }

    return {
      goalTitle,
      description,
      steps,
    };
  };

  const handleCreateGoal = async () => {
    if (isLoading || isCreated) return;

    setIsLoading(true);

    try {
      const { goalTitle, description, steps } =
        extractPlanFromText(messageText);

      await createGoalFromPlan({
        chatId,
        messageId,
        goalTitle,
        goalDescription: description ?? undefined,
        steps,
      });

      setIsCreated(true);
      toast({
        type: "success",
        description: "Goal created successfully!",
      });

      onSuccess?.();
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Failed to create goal",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCreated) {
    return (
      <Button disabled variant="outline" size="sm">
        Goal Created
      </Button>
    );
  }

  return (
    <Button
      onClick={handleCreateGoal}
      disabled={isLoading}
      variant="default"
      size="sm"
    >
      {isLoading ? "Creating..." : "Make the Plan"}
    </Button>
  );
}
