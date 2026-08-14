// ranks.js
// نظام الرتب الافتراضية اللي يديرها البوت (منفصل عن أدمنية تيليغرام الحقيقية)
// الترتيب من الأعلى للأقل صلاحية:
const RANKS = {
  مالك_اساسي: 1,
  مالك: 2,
  منشئ: 3,
  مدير: 4,
  ادمن: 5,
  مميز: 6, // رتبة تشريفية، بلا صلاحيات إشراف
};

const RANK_LABELS = {
  1: "مالك اساسي",
  2: "مالك",
  3: "منشئ",
  4: "مدير",
  5: "ادمن",
  6: "مميز",
};

// أقل رتبة تقدر تستعمل أوامر الإشراف (كتم/طرد/حظر/تحذير/اضف رد)
const MOD_MIN_LEVEL = 5; // ادمن وما فوق

// أقل رتبة تقدر ترفع/تنزل رتب غيرها
const PROMOTE_MIN_LEVEL = 4; // مدير وما فوق

const { db } = require("./firebase");

function rankDocId(chatId, userId) {
  return `${chatId}_${userId}`;
}

async function getUserRank(chatId, userId) {
  const doc = await db.collection("ranks").doc(rankDocId(chatId, userId)).get();
  if (!doc.exists) return null;
  return doc.data().level; // رقم من 1 إلى 6
}

async function setUserRank(chatId, userId, level) {
  await db.collection("ranks").doc(rankDocId(chatId, userId)).set({
    chatId: String(chatId),
    userId: String(userId),
    level,
    updatedAt: Date.now(),
  });
}

async function removeUserRank(chatId, userId) {
  await db.collection("ranks").doc(rankDocId(chatId, userId)).delete();
}

async function listRank(chatId, level) {
  const snap = await db
    .collection("ranks")
    .where("chatId", "==", String(chatId))
    .where("level", "==", level)
    .get();
  return snap.docs.map((d) => d.data().userId);
}

async function clearAllRanks(chatId) {
  const snap = await db.collection("ranks").where("chatId", "==", String(chatId)).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// هل صاحب الأمر يقدر يستعمل أوامر الإشراف (كتم/طرد/حظر/تحذير/اضف رد)؟
// شرطين: أدمن حقيقي في تيليغرام، أو عندو رتبة بوت >= ادمن (رقم <= 5)
async function canModerate(bot, chatId, userId) {
  try {
    const member = await bot.getChatMember(chatId, userId);
    if (["creator", "administrator"].includes(member.status)) return true;
  } catch (e) {
    /* تجاهل */
  }
  const level = await getUserRank(chatId, userId);
  return level !== null && level <= MOD_MIN_LEVEL;
}

// هل صاحب الأمر يقدر يرفع/ينزل رتبة معينة؟
async function canPromoteTo(bot, chatId, actorId, targetLevel) {
  const actorTelegramStatus = await bot
    .getChatMember(chatId, actorId)
    .then((m) => m.status)
    .catch(() => null);
  if (actorTelegramStatus === "creator") return true; // منشئ القروب الحقيقي يقدر كل شيء

  const actorLevel = await getUserRank(chatId, actorId);
  if (actorLevel === null) return false;
  // خاصو يكون رتبته أعلى (رقم أصغر) من الرتبة اللي بغا يعطيها، وعلى الأقل بمستوى "مدير"
  return actorLevel <= PROMOTE_MIN_LEVEL && actorLevel < targetLevel;
}

module.exports = {
  RANKS,
  RANK_LABELS,
  MOD_MIN_LEVEL,
  PROMOTE_MIN_LEVEL,
  getUserRank,
  setUserRank,
  removeUserRank,
  listRank,
  clearAllRanks,
  canModerate,
  canPromoteTo,
};
