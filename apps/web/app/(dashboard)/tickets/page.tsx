import type { Metadata } from "next";
import { TicketsView } from "@/modules/tickets/ui/views/tickets-view";

export const metadata: Metadata = {
  title: "Tickets",
  description: "Track support tickets on a kanban board or list.",
};

const Page = () => {
  return <TicketsView />;
};

export default Page;
