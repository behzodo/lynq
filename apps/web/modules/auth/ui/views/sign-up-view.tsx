import { SignUp } from "@clerk/nextjs";

export const SignUpView = () => {
  return (
    // Relative redirect keeps the user on the current origin. Without it Clerk
    // falls back to the instance Home URL, which on a dev instance is localhost.
    <SignUp fallbackRedirectUrl="/" routing="hash" signInUrl="/sign-in" />
  );
};
