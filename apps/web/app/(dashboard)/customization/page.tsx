import type { Metadata } from "next";
import { CustomizationView } from "@/modules/customization/ui/views/customization-view";

export const metadata: Metadata = {
  title: "Widget Customization",
  description: "Change how your chat widget looks and behaves.",
};

const Page = () => {
  return <CustomizationView />;
};

export default Page;
