import type { Metadata } from "next";
import { ConversationIdView } from "@/modules/dashboard/ui/views/conversation-id-view";
import { Id } from "@workspace/backend/_generated/dataModel";

export const metadata: Metadata = {
  title: "Conversation",
  description: "Reply to a customer conversation.",
};

const Page = async ({
  params,
}: {
  params: Promise<{
    conversationId: string;
  }>
}) => {
  const { conversationId } = await params;

  return <ConversationIdView conversationId={conversationId as Id<"conversations">} />
};
 
export default Page;
