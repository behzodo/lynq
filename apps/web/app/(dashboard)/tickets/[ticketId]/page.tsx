import { Id } from "@workspace/backend/_generated/dataModel";
import { TicketIdView } from "@/modules/tickets/ui/views/ticket-id-view";

interface Props {
  params: Promise<{ ticketId: string }>;
};

const Page = async ({ params }: Props) => {
  const { ticketId } = await params;

  return <TicketIdView ticketId={ticketId as Id<"tickets">} />;
};

export default Page;
