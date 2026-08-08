import type { Metadata } from "next";
import { ConversationsView } from "@/modules/dashboard/ui/views/conversations-view";

export const metadata: Metadata = {
  title: "Conversations",
  description: "Live chats from your website widget and Telegram bot.",
};

const Page = () => {
  return <ConversationsView />
};
 
export default Page;
