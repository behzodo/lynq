"use client";

import { BellIcon, BellOffIcon } from "lucide-react";
import { useNotificationSound } from "@workspace/ui/hooks/use-notification-sound";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

export const SoundToggle = () => {
  const { muted, toggleMuted } = useNotificationSound();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={toggleMuted}
        tooltip={muted ? "Sounds off" : "Sounds on"}
      >
        {muted ? (
          <BellOffIcon className="size-4" />
        ) : (
          <BellIcon className="size-4" />
        )}
        <span>{muted ? "Sounds off" : "Sounds on"}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
