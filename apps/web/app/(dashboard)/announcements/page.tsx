import type { Metadata } from "next";
import { AnnouncementsView } from "@/modules/announcements/ui/views/announcements-view";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Show banners and popups on your website.",
};

const Page = () => {
  return <AnnouncementsView />;
};

export default Page;
