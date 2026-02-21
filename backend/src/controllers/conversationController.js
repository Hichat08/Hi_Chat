import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { io } from "../socket/index.js";

const isParticipant = (conversation, userId) => {
  return conversation.participants.some(
    (p) => p.userId.toString() === userId.toString()
  );
};

const mapConversationForUser = (convo, userId) => {
  const participants = (convo.participants || []).map((p) => ({
    _id: p.userId?._id,
    displayName: p.userId?.displayName,
    avatarUrl: p.userId?.avatarUrl ?? null,
    joinedAt: p.joinedAt,
  }));

  const uid = userId.toString();
  const data = convo.toObject();

  return {
    ...data,
    unreadCounts: convo.unreadCounts || {},
    participants,
    isArchived: (convo.archivedBy || []).some((id) => id.toString() === uid),
    isRestricted: (convo.restrictedBy || []).some((id) => id.toString() === uid),
    isBlocked: (convo.blockedBy || []).some((id) => id.toString() === uid),
  };
};

export const createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;
    const userId = req.user._id;

    if (
      !type ||
      (type === "group" && !name) ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Tên nhóm và danh sách thành viên là bắt buộc" });
    }

    let conversation;

    if (type === "direct") {
      const participantId = memberIds[0];

      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [userId, participantId] },
      });

      if (!conversation) {
        conversation = new Conversation({
          type: "direct",
          participants: [{ userId }, { userId: participantId }],
          lastMessageAt: new Date(),
        });

        await conversation.save();
      }
    }

    if (type === "group") {
      conversation = new Conversation({
        type: "group",
        participants: [{ userId }, ...memberIds.map((id) => ({ userId: id }))],
        group: {
          name,
          createdBy: userId,
        },
        lastMessageAt: new Date(),
      });

      await conversation.save();
    }

    if (!conversation) {
      return res.status(400).json({ message: "Conversation type không hợp lệ" });
    }

    await conversation.populate([
      { path: "participants.userId", select: "displayName avatarUrl" },
      {
        path: "seenBy",
        select: "displayName avatarUrl",
      },
      { path: "lastMessage.senderId", select: "displayName avatarUrl" },
    ]);

    const formatted = mapConversationForUser(conversation, userId);

    if (type === "group") {
      memberIds.forEach((memberId) => {
        io.to(memberId).emit("new-group", formatted);
      });
    }

    return res.status(201).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi tạo conversation", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      "participants.userId": userId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate({
        path: "participants.userId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "seenBy",
        select: "displayName avatarUrl",
      });

    const formatted = conversations.map((convo) => mapConversationForUser(convo, userId));

    return res.status(200).json({ conversations: formatted });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy conversations", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, cursor } = req.query;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const query = { conversationId };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    let messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1);

    let nextCursor = null;

    if (messages.length > Number(limit)) {
      const nextMessage = messages[messages.length - 1];
      nextCursor = nextMessage.createdAt.toISOString();
      messages.pop();
    }

    messages = messages.reverse();

    return res.status(200).json({
      messages,
      nextCursor,
    });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy messages", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find(
      { "participants.userId": userId },
      { _id: 1 }
    );

    return conversations.map((c) => c._id.toString());
  } catch (error) {
    console.error("Lỗi khi fetch conversations: ", error);
    return [];
  }
};

export const markAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId).lean();

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const last = conversation.lastMessage;

    if (!last) {
      return res.status(200).json({ message: "Không có tin nhắn để mark as seen" });
    }

    if (last.senderId.toString() === userId) {
      return res.status(200).json({ message: "Sender không cần mark as seen" });
    }

    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { seenBy: userId },
        $set: { [`unreadCounts.${userId}`]: 0 },
      },
      {
        new: true,
      }
    );

    io.to(conversationId).emit("read-message", {
      conversation: updated,
      lastMessage: {
        _id: updated?.lastMessage._id,
        content: updated?.lastMessage.content,
        createdAt: updated?.lastMessage.createdAt,
        sender: {
          _id: updated?.lastMessage.senderId,
        },
      },
    });

    return res.status(200).json({
      message: "Marked as seen",
      seenBy: updated?.sennBy || [],
      myUnreadCount: updated?.unreadCounts[userId] || 0,
    });
  } catch (error) {
    console.error("Lỗi khi mark as seen", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const updateConversationPreference = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { action, value } = req.body;
    const userId = req.user._id.toString();

    const fieldMap = {
      archive: "archivedBy",
      restrict: "restrictedBy",
      block: "blockedBy",
    };

    if (!fieldMap[action]) {
      return res.status(400).json({ message: "Action không hợp lệ" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    if (conversation.type !== "direct" && ["restrict", "block"].includes(action)) {
      return res.status(400).json({ message: "Chỉ hỗ trợ cho chat trực tiếp" });
    }

    const field = fieldMap[action];
    const shouldEnable = typeof value === "boolean" ? value : true;
    const curr = new Set((conversation[field] || []).map((id) => id.toString()));

    if (shouldEnable) {
      curr.add(userId);
    } else {
      curr.delete(userId);
    }

    conversation[field] = Array.from(curr);
    await conversation.save();

    return res.status(200).json({
      conversationId: conversation._id,
      action,
      value: shouldEnable,
    });
  } catch (error) {
    console.error("Lỗi updateConversationPreference", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const deleteConversationForEveryone = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không có quyền xoá conversation này" });
    }

    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    io.to(conversationId).emit("conversation-deleted", { conversationId });

    (conversation.participants || []).forEach((p) => {
      io.to(p.userId.toString()).emit("conversation-deleted", { conversationId });
    });

    return res.status(200).json({ message: "Đã xoá cuộc trò chuyện cho cả 2 bên" });
  } catch (error) {
    console.error("Lỗi deleteConversationForEveryone", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
