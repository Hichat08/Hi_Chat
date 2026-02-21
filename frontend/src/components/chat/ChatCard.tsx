import { Card } from "@/components/ui/card";
import { formatOnlineTime, cn } from "@/lib/utils";
import { Archive, Ban, MoreHorizontal, ShieldAlert, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";

interface ChatCardProps {
  convoId: string;
  name: string;
  timestamp?: Date;
  isActive: boolean;
  onSelect: (id: string) => void;
  unreadCount?: number;
  leftSection: React.ReactNode;
  subtitle: React.ReactNode;
  isDirect: boolean;
  isArchived?: boolean;
  isRestricted?: boolean;
  isBlocked?: boolean;
  onArchive: (value: boolean) => void;
  onRestrict?: (value: boolean) => void;
  onBlock?: (value: boolean) => void;
  onDelete: () => void;
}

const ChatCard = ({
  convoId,
  name,
  timestamp,
  isActive,
  onSelect,
  unreadCount,
  leftSection,
  subtitle,
  isDirect,
  isArchived = false,
  isRestricted = false,
  isBlocked = false,
  onArchive,
  onRestrict,
  onBlock,
  onDelete,
}: ChatCardProps) => {
  return (
    <Card
      key={convoId}
      className={cn(
        "group border-none p-3 cursor-pointer transition-smooth glass hover:bg-muted/30",
        isActive &&
          "ring-2 ring-primary/50 bg-gradient-to-tr from-primary-glow/10 to-primary-foreground"
      )}
      onClick={() => onSelect(convoId)}
    >
      <div className="flex items-center gap-3">
        <div className="relative">{leftSection}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3
              className={cn(
                "font-semibold text-sm truncate",
                unreadCount && unreadCount > 0 && "text-foreground"
              )}
            >
              {name}
            </h3>

            <span className="text-xs text-muted-foreground">
              {timestamp ? formatOnlineTime(timestamp) : ""}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1 min-w-0">{subtitle}</div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => onArchive(!isArchived)}>
                  <Archive className="size-4" />
                  {isArchived ? "Bỏ lưu trữ" : "Lưu trữ"}
                </DropdownMenuItem>

                {isDirect && (
                  <>
                    <DropdownMenuItem onClick={() => onRestrict?.(!isRestricted)}>
                      <ShieldAlert className="size-4" />
                      {isRestricted ? "Bỏ hạn chế" : "Hạn chế"}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onBlock?.(!isBlocked)}>
                      <Ban className="size-4" />
                      {isBlocked ? "Bỏ chặn" : "Chặn"}
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                  Xoá cho cả 2 bên
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ChatCard;
