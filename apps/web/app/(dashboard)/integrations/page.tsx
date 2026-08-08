import type { Metadata } from "next";
import { IntegrationsView } from "@/modules/integrations/ui/views/integrations-view";

export const metadata: Metadata = {
  title: "Setup & Integrations",
  description: "Install the widget and connect messaging apps.",
};

const Page = () => {
  return <IntegrationsView />
}
 
export default Page;