"use client";

import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  GithubIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Callout, Step } from "./docs-primitives";

const APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "lynq-support";
const INSTALL_URL = `https://github.com/apps/${APP_SLUG}/installations/new`;

type Targets = {
  repos: { owner: string; name: string; fullName: string; private: boolean }[];
  projects: {
    nodeId: string;
    number: number;
    title: string;
    statusFieldId?: string;
    statusOptions: { id: string; name: string }[];
  }[];
  accountLogin: string;
  accountType: string;
  supportsProjects: boolean;
};

export const GithubPanel = () => {
  const searchParams = useSearchParams();
  const connection = useQuery(api.private.github.getConnection);
  const completeInstall = useMutation(api.private.github.completeInstall);
  const listTargets = useAction(api.private.github.listTargets);
  const saveConfig = useMutation(api.private.github.saveConfig);
  const disconnect = useMutation(api.private.github.disconnect);

  const [targets, setTargets] = useState<Targets | null>(null);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [repoFullName, setRepoFullName] = useState("");
  const [projectNodeId, setProjectNodeId] = useState("");
  const [backlogOptionId, setBacklogOptionId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // GitHub sends the user back with ?installation_id=... after the install
  const installationId = searchParams.get("installation_id");
  const setupAccount = searchParams.get("setup_account");

  useEffect(() => {
    if (!installationId) return;

    completeInstall({
      installationId: Number(installationId),
      accountLogin: setupAccount ?? "",
    })
      .then(() => toast.success("GitHub connected"))
      .catch(() => toast.error("Could not finish connecting GitHub"));
  }, [installationId, setupAccount, completeInstall]);

  const loadTargets = async () => {
    setIsLoadingTargets(true);

    try {
      const result = await listTargets({});
      setTargets(result);

      if (connection?.repoOwner && connection.repoName) {
        setRepoFullName(`${connection.repoOwner}/${connection.repoName}`);
      }
    } catch {
      toast.error("Could not read your repositories");
    } finally {
      setIsLoadingTargets(false);
    }
  };

  const selectedProject = targets?.projects.find(
    (project) => project.nodeId === projectNodeId,
  );

  const handleSave = async () => {
    const [owner, name] = repoFullName.split("/");

    if (!owner || !name) {
      toast.error("Choose a repository");
      return;
    }

    setIsSaving(true);

    try {
      await saveConfig({
        repoOwner: owner,
        repoName: name,
        projectNodeId: selectedProject?.nodeId,
        projectNumber: selectedProject?.number,
        projectTitle: selectedProject?.title,
        statusFieldId: selectedProject?.statusFieldId,
        statusOptions: selectedProject?.statusOptions,
        backlogOptionId: backlogOptionId || undefined,
      });

      toast.success("GitHub settings saved");
    } catch {
      toast.error("Could not save GitHub settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (connection === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-background p-5 text-muted-foreground text-sm">
        <Loader2Icon className="size-4 animate-spin" />
        Checking GitHub connection…
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="space-y-4 rounded-xl border bg-background p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <GithubIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-sm">Not connected</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Install the Lynq app on the repository your team works in. It asks
              only for issues and project access — never your code.
            </p>
          </div>
        </div>
        <Button asChild>
          <a href={INSTALL_URL} rel="noreferrer" target="_blank">
            <GithubIcon />
            Connect GitHub
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2Icon className="size-5 text-green-600" />
          <div>
            <p className="font-medium text-sm">
              Connected to {connection.accountLogin || "GitHub"}
            </p>
            <p className="text-muted-foreground text-xs">
              {connection.isConfigured
                ? `Issues open in ${connection.repoOwner}/${connection.repoName}${
                    connection.projectTitle
                      ? ` · board: ${connection.projectTitle}`
                      : ""
                  }`
                : "Choose a repository below to finish setup"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={isLoadingTargets}
            onClick={loadTargets}
            size="sm"
            variant="outline"
          >
            {isLoadingTargets ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <RefreshCwIcon className="size-3.5" />
            )}
            {targets ? "Refresh" : "Configure"}
          </Button>
          <Button
            onClick={() =>
              disconnect({})
                .then(() => {
                  setTargets(null);
                  toast.success("GitHub disconnected");
                })
                .catch(() => toast.error("Could not disconnect"))
            }
            size="sm"
            variant="ghost"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {targets && (
        <div className="space-y-5 rounded-xl border bg-background p-5">
          <div className="space-y-2">
            <Label>Repository for new issues</Label>
            <Select onValueChange={setRepoFullName} value={repoFullName}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a repository" />
              </SelectTrigger>
              <SelectContent>
                {targets.repos.map((repo) => (
                  <SelectItem key={repo.fullName} value={repo.fullName}>
                    <span className="flex items-center gap-2">
                      {repo.fullName}
                      <Badge
                        className="text-[10px]"
                        variant={repo.private ? "secondary" : "outline"}
                      >
                        {repo.private ? "private" : "public"}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targets.supportsProjects ? (
            <div className="space-y-2">
              <Label>Project board (optional)</Label>
              <Select onValueChange={setProjectNodeId} value={projectNodeId}>
                <SelectTrigger>
                  <SelectValue placeholder="No board — just create issues" />
                </SelectTrigger>
                <SelectContent>
                  {targets.projects.map((project) => (
                    <SelectItem key={project.nodeId} value={project.nodeId}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targets.projects.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  No Projects v2 boards found. Create one on GitHub, then
                  refresh.
                </p>
              )}
            </div>
          ) : (
            <Callout title="Board sync needs a GitHub organization">
              <p>
                <strong>{targets.accountLogin}</strong> is a personal account.
                GitHub only exposes the Projects permission for organizations, so
                an app cannot place cards on a personal board — that is a GitHub
                restriction, not a Lynq one.
              </p>
              <p className="mt-1.5">
                Issues still work fully. To get board sync, create a free
                organization, move the repository into it, and install the app
                there.
              </p>
            </Callout>
          )}

          {selectedProject && selectedProject.statusOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Column new issues land in</Label>
              <Select
                onValueChange={setBacklogOptionId}
                value={backlogOptionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a column" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProject.statusOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedProject && selectedProject.statusOptions.length === 0 && (
            <Callout variant="warning">
              This board has no <code>Status</code> field, so issues can be added
              but not placed in a column.
            </Callout>
          )}

          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving && <Loader2Icon className="animate-spin" />}
            Save settings
          </Button>
        </div>
      )}

      <div className="rounded-xl border bg-background p-5 pb-0">
        <Step number={1} title="A customer reports a problem">
          <p className="text-muted-foreground text-sm leading-relaxed">
            They open a ticket from the widget, as they do today.
          </p>
        </Step>
        <Step number={2} title="You send it to engineering">
          <p className="text-muted-foreground text-sm leading-relaxed">
            One button on the ticket creates a GitHub issue and drops it into your
            board&apos;s backlog. Nothing is pushed automatically, so the backlog
            stays clean.
          </p>
        </Step>
        <Step number={3} title="Developers work in GitHub">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Moving the card or closing the issue updates the Lynq ticket. Your
            replies to the customer also appear as comments on the issue, so the
            developer has the full picture without leaving GitHub.
          </p>
        </Step>
        <Step isLast number={4} title="You tell the customer it's fixed">
          <p className="text-muted-foreground text-sm leading-relaxed">
            When the issue closes as completed, the ticket offers a ready-written
            message. Review it and send — one click.
          </p>
        </Step>
      </div>

      <Callout title="Customer details are not sent to GitHub">
        Issues carry the subject, description, category and priority. Names and
        email addresses are stripped, and the conversation is only included if you
        tick the box — GitHub issues are often public and permanent.
      </Callout>
    </div>
  );
};
