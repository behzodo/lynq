import type { Metadata } from "next";
import { SignInView } from "@/modules/auth/ui/views/sign-in-view";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Lynq dashboard.",
};

const Page = () => {
  return <SignInView />
};
 
export default Page;
