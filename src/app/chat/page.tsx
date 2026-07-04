import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const sessionUser = await getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  // Fetch conversations
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { user1_id: sessionUser.id },
        { user2_id: sessionUser.id }
      ]
    },
    include: {
      user1: { select: { id: true, name: true, username: true, avatar: true } },
      user2: { select: { id: true, name: true, username: true, avatar: true } }
    },
    orderBy: { updated_at: 'desc' }
  });

  // Ensure plain objects for passing to Client Component
  const initialConversations = conversations.map(conv => ({
    id: conv.id,
    user1_id: conv.user1_id,
    user2_id: conv.user2_id,
    user1: conv.user1,
    user2: conv.user2,
    created_at: conv.created_at.toISOString(),
    updated_at: conv.updated_at.toISOString()
  }));

  return <ChatClient sessionUser={{ id: sessionUser.id }} initialConversations={initialConversations} />;
}
