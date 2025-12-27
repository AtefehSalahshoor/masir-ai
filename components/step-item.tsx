"use client";

import { CheckCircle2, Circle, Pencil, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import {
  deleteStepAction,
  editStep,
  updateStepStatus,
} from "@/app/(chat)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Step } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { toast } from "./toast";

type StepItemProps = {
  step: Step;
  onUpdate?: () => void;
};

export function StepItem({ step, onUpdate }: StepItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleCompletion = async () => {
    setIsLoading(true);
    try {
      await updateStepStatus({
        stepId: step.id,
      });
      onUpdate?.();
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Failed to update step",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast({
        type: "error",
        description: "Step title cannot be empty",
      });
      return;
    }

    setIsLoading(true);
    try {
      await editStep({
        stepId: step.id,
        title: editTitle.trim(),
      });
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Failed to update step",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this step?")) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteStepAction({ stepId: step.id });
      onUpdate?.();
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Failed to delete step",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        step.isCompleted && "bg-muted/50",
      )}
    >
      <button
        type="button"
        onClick={handleToggleCompletion}
        disabled={isLoading}
        className="flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        aria-label={
          step.isCompleted ? "Mark as incomplete" : "Mark as complete"
        }
      >
        {step.isCompleted ? (
          <CheckCircle2 className="size-5 text-green-600" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>

      <div className="flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveEdit();
                } else if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditTitle(step.title);
                }
              }}
              className="h-8"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSaveEdit}
              disabled={isLoading}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setEditTitle(step.title);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "text-sm",
              step.isCompleted && "text-muted-foreground line-through",
            )}
          >
            {step.title}
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            aria-label="Edit step"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isLoading}
            aria-label="Delete step"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
