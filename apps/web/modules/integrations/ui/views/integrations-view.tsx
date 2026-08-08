"use client";

import { useOrganization } from "@clerk/nextjs";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Separator } from "@workspace/ui/components/separator";
import Image from "next/image";
import { INTEGRATIONS, IntegrationId } from "../../constants";
import { createScript } from "../../utils";
import { CodeBlock } from "../components/code-block";
import {
  Callout,
  CopyField,
  DocsSection,
  Step,
} from "../components/docs-primitives";
import { GithubPanel } from "../components/github-panel";
import { McpPanel } from "../components/mcp-panel";
import { TelegramPanel } from "@/modules/telegram/ui/components/telegram-panel";

const SECTIONS = [
  { id: "quickstart", label: "Quickstart" },
  { id: "install", label: "Install the widget" },
  { id: "verify", label: "Verify" },
  { id: "messaging", label: "Messaging apps" },
  { id: "github", label: "GitHub" },
  { id: "ai-agents", label: "AI agents" },
];

const FILENAME_BY_INTEGRATION: Record<string, string> = {
  html: "index.html",
  react: "ChatWidget.tsx",
  nextjs: "app/layout.tsx",
  javascript: "index.html",
};

const PLACEMENT_BY_INTEGRATION: Record<string, string> = {
  html: "Paste this just before the closing </body> tag on every page that should show the widget.",
  react:
    "Render <ChatWidget /> once, high in your tree — in your root layout or App component.",
  nextjs:
    "Add it to your root layout so the widget is present on every route.",
  javascript:
    "Paste this anywhere after the page has a <body>, or inside your existing bundle.",
};

export const IntegrationsView = () => {
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? "";

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_200px] lg:px-8">
        <div className="min-w-0 space-y-10">
          <header className="space-y-3">
            <Badge className="font-mono text-[11px]" variant="secondary">
              Documentation
            </Badge>
            <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">
              Setup &amp; Integrations
            </h1>
            <p className="max-w-2xl text-muted-foreground leading-relaxed">
              Add the Lynq widget to your site, connect the channels your
              customers already use, and let an AI agent run your announcements.
              Most people are live in under two minutes.
            </p>
          </header>

          <Separator />

          <DocsSection
            description="Every request from your site is tied to this organization. Keep it handy — the snippets below already include it."
            eyebrow="Step 1"
            id="quickstart"
            title="Your organization ID"
          >
            <div className="space-y-4 rounded-xl border bg-background p-5">
              <CopyField
                hint="Safe to expose publicly"
                label="Organization ID"
                value={organizationId}
              />
              <Callout>
                This ID identifies your workspace, not a secret. It is visible in
                your site&apos;s HTML by design — it cannot be used to read your
                conversations.
              </Callout>
            </div>
          </DocsSection>

          <Separator />

          <DocsSection
            description="Pick your stack. The snippet is filled in with your organization ID, ready to paste."
            eyebrow="Step 2"
            id="install"
            title="Install the widget"
          >
            <Tabs className="w-full" defaultValue={INTEGRATIONS[0]?.id}>
              <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                {INTEGRATIONS.map((integration) => (
                  <TabsTrigger
                    className="gap-2 rounded-lg border bg-background px-3 py-2 data-[state=active]:border-primary/40 data-[state=active]:bg-primary/5 data-[state=active]:shadow-none"
                    key={integration.id}
                    value={integration.id}
                  >
                    <Image
                      alt=""
                      className="size-4"
                      height={16}
                      src={integration.icon}
                      width={16}
                    />
                    {integration.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {INTEGRATIONS.map((integration) => (
                <TabsContent
                  className="mt-5 space-y-4"
                  key={integration.id}
                  value={integration.id}
                >
                  <CodeBlock
                    code={
                      organizationId
                        ? createScript(
                            integration.id as IntegrationId,
                            organizationId,
                          )
                        : "// Loading your organization…"
                    }
                    label={FILENAME_BY_INTEGRATION[integration.id] ?? "Code"}
                  />
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {PLACEMENT_BY_INTEGRATION[integration.id]}
                  </p>
                </TabsContent>
              ))}
            </Tabs>
          </DocsSection>

          <Separator />

          <DocsSection
            description="Three checks that catch almost every setup problem."
            eyebrow="Step 3"
            id="verify"
            title="Verify it works"
          >
            <div className="rounded-xl border bg-background p-5 pb-0">
              <Step number={1} title="Load your site and look bottom-right">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A blue chat bubble should appear. You can drag it anywhere —
                  its position is remembered per visitor.
                </p>
              </Step>
              <Step number={2} title="Open it and send a message">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The conversation appears in your Conversations inbox straight
                  away. You can reply from there.
                </p>
              </Step>
              <Step
                isLast
                number={3}
                title="Nothing showing? Check the browser console"
              >
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A missing or mistyped organization ID logs an error there.
                  Confirm the ID in the snippet matches the one above.
                </p>
              </Step>
            </div>
          </DocsSection>

          <Separator />

          <DocsSection
            description="Answer customers where they already are. The same AI agent handles the conversation, and it lands in the same inbox."
            eyebrow="Optional"
            id="messaging"
            title="Messaging apps"
          >
            <TelegramPanel />
          </DocsSection>

          <Separator />

          <DocsSection
            description="Turn a customer report into a tracked GitHub issue on your project board, and tell the customer when it ships."
            eyebrow="Optional"
            id="github"
            title="GitHub issue tracking"
          >
            <GithubPanel />
          </DocsSection>

          <Separator />

          <DocsSection
            description="Connect Claude or Codex and ask it to write your banners, popups and surveys. It signs in with your Lynq account — no keys to copy."
            eyebrow="Optional"
            id="ai-agents"
            title="AI agents (MCP)"
          >
            <McpPanel />
          </DocsSection>
        </div>

        {/* On-page nav, the way API docs do it */}
        <aside className="hidden lg:block">
          <nav className="sticky top-10 space-y-2">
            <p className="font-medium font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
              On this page
            </p>
            <ul className="space-y-1 border-l">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    className="-ml-px block border-transparent border-l py-1 pl-3 text-muted-foreground text-sm transition-colors hover:border-primary hover:text-foreground"
                    href={`#${section.id}`}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
};
