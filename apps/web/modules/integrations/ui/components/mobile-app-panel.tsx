"use client";

import Link from "next/link";
import { Callout, Step } from "./docs-primitives";
import { CodeBlock } from "./code-block";
import {
  REACT_NATIVE_IMAGE_PICKER,
  REACT_NATIVE_INSTALL,
  REACT_NATIVE_SCRIPT,
} from "../../constants";

interface Props {
  organizationId: string;
}

/**
 * Setup for React Native and Expo apps. Deliberately the same shape as the
 * website instructions above it - install, paste, then what to expect - since
 * the two are the same product on different surfaces.
 */
export const MobileAppPanel = ({ organizationId }: Props) => (
  <div className="space-y-5">
    <div className="space-y-4 rounded-xl border bg-background p-5">
      <Step number={1} title="Install">
        <CodeBlock code={REACT_NATIVE_INSTALL} label="Terminal" />
      </Step>

      <Step isLast number={2} title="Wrap your app once, near the root">
        <CodeBlock
          code={
            organizationId
              ? REACT_NATIVE_SCRIPT.replace(
                  /{{ORGANIZATION_ID}}/g,
                  organizationId,
                )
              : "// Loading your organization…"
          }
          label="App.tsx"
        />
        <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
          <code className="font-mono text-xs">LynqProvider</code> on its own
          shows announcements and surveys.{" "}
          <code className="font-mono text-xs">LynqWidget</code> adds chat, the
          inbox and tickets behind a floating button — pass{" "}
          <code className="font-mono text-xs">mode=&quot;inline&quot;</code> to
          give support a tab of its own instead.
        </p>
      </Step>
    </div>

    <Callout title="Keep app messages out of your website">
      An announcement or survey with no platform selected shows everywhere. Tick
      only iOS and Android on the{" "}
      <Link className="underline" href="/announcements">
        Announcements
      </Link>{" "}
      or{" "}
      <Link className="underline" href="/surveys">
        Surveys
      </Link>{" "}
      page to keep it inside the app — and untick them for anything that only
      belongs on the web, like a prompt to download the app.
    </Callout>

    <Callout title="Links can open screens inside the app">
      A button URL can be a deep link such as{" "}
      <code className="font-mono text-xs">myapp://product/123</code> rather than
      an <code className="font-mono text-xs">https://</code> address, so a
      customer lands on the right screen instead of in a browser.
    </Callout>

    <div className="space-y-3 rounded-xl border bg-background p-5">
      <p className="font-medium text-sm">Image attachments in chat</p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Optional, and off unless you wire it up. Picking an image needs a native
        module, so the SDK takes yours rather than bundling one — the attach
        button only appears once you pass it.
      </p>
      <CodeBlock code={REACT_NATIVE_IMAGE_PICKER} label="App.tsx" />
    </div>

    <Callout title="Runs in Expo Go" variant="info">
      Everything above is plain JavaScript, so there is no native module to link
      and no custom build to make. Only the optional image picker needs one.
    </Callout>

    <Callout title="Not on npm yet" variant="warning">
      <code className="font-mono text-xs">lynq-react-native</code> is still
      being published. Until it lands you can install it straight from the
      repository, and these instructions will not change when it does.
    </Callout>
  </div>
);
