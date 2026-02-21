const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getVietnamDayStartUtc = (date = new Date()) => {
  const timestamp = new Date(date).getTime();
  const vietnamTimestamp = timestamp + VIETNAM_UTC_OFFSET_MS;
  const vietnamDayStart = Math.floor(vietnamTimestamp / MS_PER_DAY) * MS_PER_DAY;

  return new Date(vietnamDayStart - VIETNAM_UTC_OFFSET_MS);
};

const isSameVietnamDay = (a, b) => {
  if (!a || !b) return false;
  return getVietnamDayStartUtc(a).getTime() === getVietnamDayStartUtc(b).getTime();
};

const vietnamDayDiff = (a, b) => {
  const from = getVietnamDayStartUtc(a).getTime();
  const to = getVietnamDayStartUtc(b).getTime();
  return Math.floor((to - from) / MS_PER_DAY);
};

export const updateDirectConversationStreak = (
  conversation,
  senderId,
  sentAt = new Date()
) => {
  if (conversation.type !== "direct") return;

  const sender = senderId.toString();
  const today = getVietnamDayStartUtc(sentAt);

  if (!conversation.streak) {
    conversation.streak = {
      count: 0,
      currentDay: today,
      currentDaySenders: [senderId],
      lastCompletedDate: null,
    };
  }

  const streak = conversation.streak;
  const currentDay = streak.currentDay ? getVietnamDayStartUtc(streak.currentDay) : today;
  const sentToday = (streak.currentDaySenders || []).map((id) => id.toString());

  if (!isSameVietnamDay(currentDay, today)) {
    streak.currentDay = today;
    streak.currentDaySenders = [senderId];

    if (!streak.lastCompletedDate || vietnamDayDiff(streak.lastCompletedDate, today) > 1) {
      streak.count = 0;
      streak.lastCompletedDate = null;
    }
  } else if (!sentToday.includes(sender)) {
    streak.currentDaySenders.push(senderId);
  }

  const uniqueSenders = new Set(
    (streak.currentDaySenders || []).map((id) => id.toString())
  );

  if (
    uniqueSenders.size >= 2 &&
    !isSameVietnamDay(streak.lastCompletedDate, streak.currentDay)
  ) {
    if (!streak.lastCompletedDate) {
      streak.count = 1;
    } else {
      streak.count =
        vietnamDayDiff(streak.lastCompletedDate, streak.currentDay) === 1
          ? streak.count + 1
          : 1;
    }

    streak.lastCompletedDate = streak.currentDay;
  }
};
