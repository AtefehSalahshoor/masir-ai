import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import { generateUUID } from "../utils";
import {
  type Chat,
  chat,
  type DBMessage,
  document,
  goal,
  message,
  type Suggestion,
  step,
  stream,
  suggestion,
  type User,
  user,
  vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email",
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user",
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id",
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id",
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id",
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await db.update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id",
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id",
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id",
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id",
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp",
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions",
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id",
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id",
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id,
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp",
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id",
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update title for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user"),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id",
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id",
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id",
    );
  }
}

// Goal CRUD operations

export async function createGoal({
  chatId,
  userId,
  title,
  description,
  status,
  priority,
  deadline,
  createdFromMessageId,
}: {
  chatId: string;
  userId: string;
  title: string;
  description?: string | null;
  status?: "not_started" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  deadline?: Date | null;
  createdFromMessageId?: string | null;
}) {
  try {
    if (!title.trim()) {
      throw new ChatSDKError("bad_request:goal", "Title cannot be empty");
    }

    if (
      status !== undefined &&
      !["not_started", "in_progress", "completed"].includes(status)
    ) {
      throw new ChatSDKError("bad_request:goal", "Invalid status value");
    }

    if (
      priority !== undefined &&
      !["low", "medium", "high"].includes(priority)
    ) {
      throw new ChatSDKError("bad_request:goal", "Invalid priority value");
    }

    const [createdGoal] = await db
      .insert(goal)
      .values({
        chatId,
        userId,
        title,
        description: description ?? null,
        status: status ?? "not_started",
        priority: priority ?? "medium",
        deadline: deadline ?? null,
        createdFromMessageId: createdFromMessageId ?? null,
        createdAt: new Date(),
      })
      .returning();

    return createdGoal;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to create goal");
  }
}

export async function getGoalsByUserId({
  userId,
  status: statusFilter,
}: {
  userId: string;
  status?: "not_started" | "in_progress" | "completed";
}) {
  try {
    const whereCondition = statusFilter
      ? and(eq(goal.userId, userId), eq(goal.status, statusFilter))
      : eq(goal.userId, userId);

    return await db
      .select()
      .from(goal)
      .where(whereCondition)
      .orderBy(desc(goal.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get goals by user id",
    );
  }
}

export async function getGoalsByChatId({ chatId }: { chatId: string }) {
  try {
    return await db
      .select()
      .from(goal)
      .where(eq(goal.chatId, chatId))
      .orderBy(desc(goal.createdAt));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Database error in getGoalsByChatId:", errorMessage);
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to get goals by chat id: ${errorMessage}`,
    );
  }
}

export async function getGoalById({ id }: { id: string }) {
  try {
    const [selectedGoal] = await db
      .select()
      .from(goal)
      .where(eq(goal.id, id))
      .limit(1);

    return selectedGoal ?? null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get goal by id");
  }
}

export async function updateGoal({
  id,
  title,
  description,
  status,
  priority,
  deadline,
}: {
  id: string;
  title?: string;
  description?: string | null;
  status?: "not_started" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  deadline?: Date | null;
}) {
  try {
    const existingGoal = await getGoalById({ id });

    if (!existingGoal) {
      throw new ChatSDKError("not_found:goal", "Goal not found");
    }

    if (title !== undefined && !title.trim()) {
      throw new ChatSDKError("bad_request:goal", "Title cannot be empty");
    }

    if (
      status !== undefined &&
      !["not_started", "in_progress", "completed"].includes(status)
    ) {
      throw new ChatSDKError("bad_request:goal", "Invalid status value");
    }

    if (
      priority !== undefined &&
      !["low", "medium", "high"].includes(priority)
    ) {
      throw new ChatSDKError("bad_request:goal", "Invalid priority value");
    }

    const updateData: {
      title?: string;
      description?: string | null;
      status?: "not_started" | "in_progress" | "completed";
      priority?: "low" | "medium" | "high";
      deadline?: Date | null;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (deadline !== undefined) updateData.deadline = deadline;

    return await db.update(goal).set(updateData).where(eq(goal.id, id));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to update goal");
  }
}

export async function deleteGoal({ id }: { id: string }) {
  try {
    const [deletedGoal] = await db
      .delete(goal)
      .where(eq(goal.id, id))
      .returning();

    return deletedGoal ?? null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete goal");
  }
}

// Step CRUD operations

export async function createStep({
  goalId,
  title,
  order: providedOrder,
}: {
  goalId: string;
  title: string;
  order?: number;
}) {
  try {
    if (!title.trim()) {
      throw new ChatSDKError("bad_request:goal", "Step title cannot be empty");
    }

    const goalExists = await getGoalById({ id: goalId });
    if (!goalExists) {
      throw new ChatSDKError("not_found:goal", "Goal not found");
    }

    let stepOrder = providedOrder;

    if (stepOrder === undefined) {
      const existingSteps = await db
        .select({ order: step.order })
        .from(step)
        .where(eq(step.goalId, goalId));

      const maxOrder =
        existingSteps.length > 0
          ? Math.max(...existingSteps.map((s) => s.order))
          : -1;

      stepOrder = maxOrder + 1;
    }

    const [createdStep] = await db
      .insert(step)
      .values({
        goalId,
        title,
        order: stepOrder,
        isCompleted: false,
        createdAt: new Date(),
      })
      .returning();

    return createdStep;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to create step");
  }
}

export async function createSteps({
  goalId,
  steps: stepsData,
}: {
  goalId: string;
  steps: Array<{ title: string; order?: number }>;
}) {
  try {
    const existingSteps = await db
      .select({ order: step.order })
      .from(step)
      .where(eq(step.goalId, goalId));

    const maxOrder =
      existingSteps.length > 0
        ? Math.max(...existingSteps.map((s) => s.order))
        : -1;

    let currentOrder = maxOrder + 1;

    const stepsToInsert = stepsData.map((stepData) => ({
      goalId,
      title: stepData.title,
      order: stepData.order ?? currentOrder++,
      isCompleted: false,
      createdAt: new Date(),
    }));

    return await db.insert(step).values(stepsToInsert).returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create steps");
  }
}

export async function getStepsByGoalId({ goalId }: { goalId: string }) {
  try {
    return await db
      .select()
      .from(step)
      .where(eq(step.goalId, goalId))
      .orderBy(asc(step.order));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get steps by goal id",
    );
  }
}

export async function updateStep({
  id,
  title,
  isCompleted,
}: {
  id: string;
  title?: string;
  isCompleted?: boolean;
}) {
  try {
    const [existingStep] = await db
      .select()
      .from(step)
      .where(eq(step.id, id))
      .limit(1);

    if (!existingStep) {
      throw new ChatSDKError("not_found:goal", "Step not found");
    }

    if (title !== undefined && !title.trim()) {
      throw new ChatSDKError("bad_request:goal", "Step title cannot be empty");
    }

    const updateData: {
      title?: string;
      isCompleted?: boolean;
      completedAt?: Date | null;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      updateData.completedAt = isCompleted ? new Date() : null;
    }

    return await db.update(step).set(updateData).where(eq(step.id, id));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to update step");
  }
}

export async function deleteStep({ id }: { id: string }) {
  try {
    return await db.transaction(async (tx) => {
      const [deletedStep] = await tx
        .select()
        .from(step)
        .where(eq(step.id, id))
        .limit(1);

      if (!deletedStep) {
        return null;
      }

      await tx.delete(step).where(eq(step.id, id));

      const remainingSteps = await tx
        .select()
        .from(step)
        .where(eq(step.goalId, deletedStep.goalId))
        .orderBy(asc(step.order));

      for (let i = 0; i < remainingSteps.length; i++) {
        await tx
          .update(step)
          .set({ order: i })
          .where(eq(step.id, remainingSteps[i].id));
      }

      return deletedStep;
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete step");
  }
}

export async function toggleStepCompletion({ id }: { id: string }) {
  try {
    const [currentStep] = await db
      .select()
      .from(step)
      .where(eq(step.id, id))
      .limit(1);

    if (!currentStep) {
      throw new ChatSDKError("not_found:goal", "Step not found");
    }

    const newCompletedState = !currentStep.isCompleted;

    return await db
      .update(step)
      .set({
        isCompleted: newCompletedState,
        completedAt: newCompletedState ? new Date() : null,
      })
      .where(eq(step.id, id));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to toggle step completion",
    );
  }
}

// Composite operations

export async function createGoalWithSteps({
  chatId,
  userId,
  title,
  description,
  status,
  priority,
  deadline,
  createdFromMessageId,
  steps: stepsData,
}: {
  chatId: string;
  userId: string;
  title: string;
  description?: string | null;
  status?: "not_started" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  deadline?: Date | null;
  createdFromMessageId?: string | null;
  steps: Array<{ title: string; order?: number }>;
}) {
  try {
    return await db.transaction(async (tx) => {
      const [createdGoal] = await tx
        .insert(goal)
        .values({
          chatId,
          userId,
          title,
          description: description ?? null,
          status: status ?? "not_started",
          priority: priority ?? "medium",
          deadline: deadline ?? null,
          createdFromMessageId: createdFromMessageId ?? null,
          createdAt: new Date(),
        })
        .returning();

      const stepsToInsert = stepsData.map((stepData, index) => ({
        goalId: createdGoal.id,
        title: stepData.title,
        order: stepData.order ?? index,
        isCompleted: false,
        createdAt: new Date(),
      }));

      const createdSteps = await tx
        .insert(step)
        .values(stepsToInsert)
        .returning();

      return { goal: createdGoal, steps: createdSteps };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Database error in createGoalWithSteps:", errorMessage);
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to create goal with steps: ${errorMessage}`,
    );
  }
}

export async function getGoalByIdWithSteps({ id }: { id: string }) {
  try {
    const selectedGoal = await getGoalById({ id });

    if (!selectedGoal) {
      return null;
    }

    const steps = await getStepsByGoalId({ goalId: selectedGoal.id });

    return {
      ...selectedGoal,
      steps,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get goal with steps",
    );
  }
}

// Flexibility and adaptation operations

export async function reorderSteps({
  goalId,
  stepOrders,
}: {
  goalId: string;
  stepOrders: Array<{ id: string; order: number }>;
}) {
  try {
    return await db.transaction(async (tx) => {
      for (const { id: stepId, order: newOrder } of stepOrders) {
        const [stepToUpdate] = await tx
          .select()
          .from(step)
          .where(and(eq(step.id, stepId), eq(step.goalId, goalId)))
          .limit(1);

        if (!stepToUpdate) {
          throw new ChatSDKError(
            "not_found:goal",
            `Step ${stepId} not found or does not belong to goal ${goalId}`,
          );
        }

        await tx
          .update(step)
          .set({ order: newOrder })
          .where(eq(step.id, stepId));
      }
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to reorder steps");
  }
}

export async function bulkUpdateSteps({
  goalId,
  updates,
}: {
  goalId: string;
  updates: Array<{
    id: string;
    title?: string;
    isCompleted?: boolean;
    order?: number;
  }>;
}) {
  try {
    return await db.transaction(async (tx) => {
      for (const update of updates) {
        const [stepToUpdate] = await tx
          .select()
          .from(step)
          .where(and(eq(step.id, update.id), eq(step.goalId, goalId)))
          .limit(1);

        if (!stepToUpdate) {
          throw new ChatSDKError(
            "not_found:goal",
            `Step ${update.id} not found or does not belong to goal ${goalId}`,
          );
        }

        const updateData: {
          title?: string;
          isCompleted?: boolean;
          completedAt?: Date | null;
          order?: number;
        } = {};

        if (update.title !== undefined) updateData.title = update.title;
        if (update.isCompleted !== undefined) {
          updateData.isCompleted = update.isCompleted;
          updateData.completedAt = update.isCompleted ? new Date() : null;
        }
        if (update.order !== undefined) updateData.order = update.order;

        await tx.update(step).set(updateData).where(eq(step.id, update.id));
      }
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to bulk update steps",
    );
  }
}

export async function getGoalProgress({ goalId }: { goalId: string }) {
  try {
    const steps = await getStepsByGoalId({ goalId });

    const total = steps.length;
    const completed = steps.filter((s) => s.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      total,
      percentage,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get goal progress",
    );
  }
}

export async function getMessagesForGoalAdaptation({
  goalId,
}: {
  goalId: string;
}) {
  try {
    const selectedGoal = await getGoalById({ id: goalId });

    if (!selectedGoal) {
      throw new ChatSDKError("not_found:goal", "Goal not found");
    }

    const messages = await getMessagesByChatId({ id: selectedGoal.chatId });

    return messages;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages for goal adaptation",
    );
  }
}
