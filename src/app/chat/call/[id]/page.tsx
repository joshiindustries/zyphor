import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import CallClient from "./CallClient";

export const dynamic = "force-dynamic";

export default async function CallPage(props: { params: Promise<{ id: string }> }) {
  const sessionUser = await getUser();
  if (!sessionUser) redirect("/login");

  const { id } = await props.params;

  const call = await prisma.call.findUnique({
    where: { id },
    include: {
      caller: { select: { id: true, name: true, avatar: true } },
      conversation: {
        include: {
          user1: { select: { id: true, name: true, avatar: true } },
          user2: { select: { id: true, name: true, avatar: true } }
        }
      }
    }
  });

  if (!call) redirect("/chat");

  // Ensure user is part of the conversation
  if (call.conversation.user1_id !== sessionUser.id && call.conversation.user2_id !== sessionUser.id) {
    redirect("/chat");
  }

  const isCaller = call.caller_id === sessionUser.id;
  const otherUser = call.conversation.user1_id === sessionUser.id ? call.conversation.user2 : call.conversation.user1;

  return (
    <CallClient
      callId={call.id}
      sessionUserId={sessionUser.id}
      isCaller={isCaller}
      otherUser={otherUser}
      mediaType={call.media_type === "AUDIO" ? "AUDIO" : "VIDEO"}
    />
  );
}
