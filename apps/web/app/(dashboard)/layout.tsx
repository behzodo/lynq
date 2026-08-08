import type { Metadata } from "next";
import { DashboardLayout } from "@/modules/dashboard/ui/layouts/dashboard-layout";

/**
 * The whole dashboard sits behind Clerk, so a crawler only ever sees a sign-in
 * redirect. Marking it noindex keeps those redirects out of search results.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const Layout = ({ children }: { children: React.ReactNode; }) => {
  return ( 
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};
 
export default Layout;
