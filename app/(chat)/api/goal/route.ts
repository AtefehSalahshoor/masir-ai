import { auth } from "@/app/(auth)/auth";
import {
  getGoalById,
  getGoalByIdWithSteps,
  getGoalsByChatId,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const chatId = searchParams.get("chatId");
  const withSteps = searchParams.get("withSteps") === "true";

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    if (id) {
      const goal = withSteps
        ? await getGoalByIdWithSteps({ id })
        : await getGoalById({ id });

      if (!goal) {
        return new ChatSDKError("not_found:goal").toResponse();
      }

      if (goal.userId !== session.user.id) {
        return new ChatSDKError("forbidden:goal").toResponse();
      }

      return Response.json(goal, { status: 200 });
    }

    if (chatId) {
      const goals = await getGoalsByChatId({ chatId });

      return Response.json(goals, { status: 200 });
    }

    return new ChatSDKError(
      "bad_request:api",
      "Either id or chatId parameter is required",
    ).toResponse();
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:database",
      "Failed to fetch goals",
    ).toResponse();
  }
}
