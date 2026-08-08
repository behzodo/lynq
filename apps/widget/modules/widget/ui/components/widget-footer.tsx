import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useAtomValue, useSetAtom } from "jotai";
import { HomeIcon, InboxIcon } from "lucide-react"
import { screenAtom } from "../../atoms/widget-atoms";

export const WidgetFooter = () => {
  const screen = useAtomValue(screenAtom);
  const setScreen = useSetAtom(screenAtom);

  return (
    <footer className="flex items-center justify-between border-t bg-background/80 backdrop-blur-sm">
      {[
        { key: "selection", label: "Home", Icon: HomeIcon },
        { key: "inbox", label: "Inbox", Icon: InboxIcon },
      ].map(({ key, label, Icon }) => {
        const isActive = screen === key;

        return (
          <Button
            key={key}
            className="group relative h-14 flex-1 flex-col gap-y-0.5 rounded-none"
            onClick={() => setScreen(key as "selection" | "inbox")}
            variant="ghost"
          >
            <span
              className={cn(
                "absolute inset-x-0 top-0 h-0.5 bg-primary transition-transform duration-200",
                isActive ? "scale-x-100" : "scale-x-0",
              )}
            />
            <Icon
              className={cn(
                "size-5 transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground group-hover:-translate-y-0.5 group-hover:text-foreground",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </Button>
        );
      })}
    </footer>
  );
};
