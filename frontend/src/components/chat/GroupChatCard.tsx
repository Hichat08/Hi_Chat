import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";
import ChatCard from "./ChatCard";
import UnreadCountBadge from "./UnreadCountBadge";
import GroupChatAvatar from "./GroupChatAvatar";
import { toast } from "sonner";

const GroupChatCard = ({ convo }: { convo: Conversation }) => {
  const { user } = useAuthStore();
  const {
    activeConversationId,
    setActiveConversation,
    messages,
    fetchMessages,
    updateConversationPreference,
    deleteConversationForEveryone,
  } = useChatStore();

  if (!user) return null;

  const unreadCount = convo.unreadCounts[user._id];
  const name = convo.group?.name ?? "";
  const handleSelectConversation = async (id: string) => {
    setActiveConversation(id);
    if (!messages[id]) {
      await fetchMessages();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xoá nhóm chat này cho tất cả thành viên không?")) {
      return;
    }

    try {
      await deleteConversationForEveryone(convo._id);
      toast.success("Đã xoá nhóm chat");
    } catch (error) {
      console.error(error);
      toast.error("Không thể xoá nhóm chat");
    }
  };

  return (
    <ChatCard
      convoId={convo._id}
      name={name}
      timestamp={
        convo.lastMessage?.createdAt
          ? new Date(convo.lastMessage.createdAt)
          : undefined
      }
      isActive={activeConversationId === convo._id}
      onSelect={handleSelectConversation}
      unreadCount={unreadCount}
      isDirect={false}
      isArchived={convo.isArchived}
      onArchive={async (value) => {
        try {
          await updateConversationPreference(convo._id, "archive", value);
          toast.success(value ? "Đã lưu trữ" : "Đã bỏ lưu trữ");
        } catch (error) {
          console.error(error);
          toast.error("Không thể cập nhật lưu trữ");
        }
      }}
      onDelete={handleDelete}
      leftSection={
        <>
          {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
          <GroupChatAvatar
            participants={convo.participants}
            type="chat"
          />
        </>
      }
      subtitle={
        <p className="text-sm truncate text-muted-foreground">
          {convo.participants.length} thành viên
        </p>
      }
    />
  );
};

export default GroupChatCard;
