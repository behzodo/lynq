import { SignIn } from "@clerk/nextjs";

export const SignInView = () => {
  return (
    // Relative redirect keeps the user on the current origin. Without it Clerk
    // falls back to the instance Home URL, which on a dev instance is localhost.
    <SignIn fallbackRedirectUrl="/" routing="hash" signUpUrl="/sign-up" />
  );
};
