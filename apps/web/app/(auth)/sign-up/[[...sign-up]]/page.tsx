import type { Metadata } from "next";
import { SignUpView } from "@/modules/auth/ui/views/sign-up-view";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Lynq account and start supporting customers.",
};

const Page = () => {
  return <SignUpView />
};
 
export default Page;
