import type { Metadata } from "next";
import { OrgSelectionView } from "@/modules/auth/ui/views/org-selection-view";

export const metadata: Metadata = {
  title: "Choose organization",
  description: "Pick which organization to work in.",
};

const Page = () => {
  return <OrgSelectionView />;
}
 
export default Page;
