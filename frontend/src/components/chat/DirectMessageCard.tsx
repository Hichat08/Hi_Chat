import type { Conversation } from "@/types/chat";
import ChatCard from "./ChatCard";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { cn } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import UnreadCountBadge from "./UnreadCountBadge";
import StreakBadge from "./StreakBadge";
import { useSocketStore } from "@/stores/useSocketStore";
import { toast } from "sonner";

const DirectMessageCard = ({ convo }: { convo: Conversation }) => {
  const { user } = useAuthStore();
  const {
    activeConversationId,
    setActiveConversation,
    messages,
    fetchMessages,
    updateConversationPreference,
    deleteConversationForEveryone,
  } = useChatStore();
  const { onlineUsers } = useSocketStore();

  if (!user) return null;

  const otherUser = convo.participants.find((p) => p._id !== user._id);
  if (!otherUser) return null;

  const unreadCount = convo.unreadCounts[user._id];
  const lastMessage = convo.lastMessage?.content ?? "";

  const handleSelectConversation = async (id: string) => {
    setActiveConversation(id);
    if (!messages[id]) {
      await fetchMessages();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xoá cuộc trò chuyện cho cả 2 bên không?")) {
      return;
    }

    try {
      await deleteConversationForEveryone(convo._id);
      toast.success("Đã xoá cuộc trò chuyện cho cả 2 bên");
    } catch (error) {
      console.error(error);
      toast.error("Không thể xoá cuộc trò chuyện");
    }
  };

  return (
    <ChatCard
      convoId={convo._id}
      name={otherUser.displayName ?? ""}
      timestamp={
        convo.lastMessage?.createdAt
          ? new Date(convo.lastMessage.createdAt)
          : undefined
      }
      isActive={activeConversationId === convo._id}
      onSelect={handleSelectConversation}
      unreadCount={unreadCount}
      isDirect
      isArchived={convo.isArchived}
      isRestricted={convo.isRestricted}
      isBlocked={convo.isBlocked}
      onArchive={async (value) => {
        await updateConversationPreference(convo._id, "archive", value);
        toast.success(value ? "Đã lưu trữ" : "Đã bỏ lưu trữ");
      }}
      onRestrict={async (value) => {
        await updateConversationPreference(convo._id, "restrict", value);
        toast.success(value ? "Đã hạn chế" : "Đã bỏ hạn chế");
      }}
      onBlock={async (value) => {
        await updateConversationPreference(convo._id, "block", value);
        toast.success(value ? "Đã chặn người dùng" : "Đã bỏ chặn");
      }}
      onDelete={handleDelete}
      leftSection={
        <>
          <UserAvatar
            type="sidebar"
            name={otherUser.displayName ?? ""}
            avatarUrl={otherUser.avatarUrl ?? undefined}
          />
          <StatusBadge
            status={
              onlineUsers.includes(otherUser?._id ?? "") ? "online" : "offline"
            }
          />
          {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
        </>
      }
      subtitle={
        <div className="flex items-center gap-2 min-w-0">
          <p
            className={cn(
              "text-sm truncate",
              unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {lastMessage}
          </p>
          <StreakBadge count={convo.streak?.count} />
        </div>
      }
    />
  );
};

export default DirectMessageCard;
