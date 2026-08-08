"use client";

import Image from "next/image";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  FILENAME_BY_INTEGRATION,
  INTEGRATIONS,
  type IntegrationId,
  PLACEMENT_BY_INTEGRATION,
} from "../../constants";
import { createScript } from "../../utils";
import { CodeBlock } from "./code-block";

interface Props {
  organizationId: string;
  /** Adds data-department-id, so the page only sees that department's content */
  departmentId?: string;
  /** The where-to-paste note. Off on the departments page, which is a reference. */
  showPlacement?: boolean;
}

/**
 * The install snippet for every framework we support, pre-filled with the ids
 * the caller passes. Shared so the setup docs and the departments page can
 * never drift apart.
 */
export const SnippetTabs = ({
  organizationId,
  departmentId,
  showPlacement = true,
}: Props) => {
  return (
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
                    departmentId,
                  )
                : "// Loading your organization…"
            }
            label={FILENAME_BY_INTEGRATION[integration.id] ?? "Code"}
          />
          {showPlacement && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {PLACEMENT_BY_INTEGRATION[integration.id]}
            </p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
};
