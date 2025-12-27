CREATE TABLE IF NOT EXISTS "Goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"createdFromMessageId" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" varchar DEFAULT 'not_started' NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"deadline" timestamp,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goalId" uuid NOT NULL,
	"title" text NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Goal" ADD CONSTRAINT "Goal_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Goal" ADD CONSTRAINT "Goal_createdFromMessageId_Message_v2_id_fk" FOREIGN KEY ("createdFromMessageId") REFERENCES "public"."Message_v2"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Step" ADD CONSTRAINT "Step_goalId_Goal_id_fk" FOREIGN KEY ("goalId") REFERENCES "public"."Goal"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Goal_userId_idx" ON "Goal"("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Goal_chatId_idx" ON "Goal"("chatId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Goal_createdFromMessageId_idx" ON "Goal"("createdFromMessageId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Goal_userId_status_idx" ON "Goal"("userId", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Step_goalId_idx" ON "Step"("goalId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Step_goalId_order_idx" ON "Step"("goalId", "order");
--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "lastContext";