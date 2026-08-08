import type { Metadata } from "next";
import { DepartmentsView } from "@/modules/departments/ui/views/departments-view";

export const metadata: Metadata = {
  title: "Departments",
  description: "Separate announcements and surveys per product or site.",
};

const Page = () => {
  return <DepartmentsView />;
};

export default Page;
