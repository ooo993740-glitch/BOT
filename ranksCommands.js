// ranksCommands.js
// أوامر: رفع [رتبة] / تنزيل [رتبة] / عرض الرتب — بالرد على رسالة الشخص

const {
  RANKS,
  RANK_LABELS,
  getUserRank,
  setUserRank,
  removeUserRank,
  listRank,
  canPromoteTo,
} = require("./ranks");

// نبني Regex ديناميكي من أسماء الرتب (مالك اساسي، مالك، منشئ، مدير، ادمن، مميز)
const RANK_NAMES = Object.keys(RANKS).map((k) => k.replace(/_/g, " "));

function findRankName(text) {
  return RANK_NAMES.find((name) => text.includes(name));
}

function registerRankCommands(bot) {
  // ─── رفع [رتبة] ───
  bot.onText(/^رفع (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const actorId = msg.from.id;
    const rankName = findRankName(match[1].trim());

    if (!rankName) {
      return bot.sendMessage(chatId, "❓ الرتبة غير معروفة. الرتب المتاحة: " + RANK_NAMES.join("، "));
    }
    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, "↩️ لازم ترد على رسالة الشخص باش نرفعه.");
    }

    const level = RANKS[rankName.replace(/ /g, "_")];
    const target = msg.reply_to_message.from;

    if (!(await canPromoteTo(bot, chatId, actorId, level))) {
      return bot.sendMessage(chatId, "⛔ ما عندكش الصلاحية باش ترفع لهذي الرتبة.");
    }

    await setUserRank(chatId, target.id, level);
    await bot.sendMessage(
      chatId,
      `👑 تم رفع ${target.first_name} إلى رتبة "${RANK_LABELS[level]}".`
    );
  });

  // ─── تنزيل [رتبة] ───
  bot.onText(/^تنزيل (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const actorId = msg.from.id;
    const rankName = findRankName(match[1].trim());

    if (!rankName) return; // ممكن يكون فيه تعارض مع أوامر أخرى، نتجاهل بصمت
    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, "↩️ لازم ترد على رسالة الشخص باش ننزلو.");
    }

    const level = RANKS[rankName.replace(/ /g, "_")];
    const target = msg.reply_to_message.from;

    if (!(await canPromoteTo(bot, chatId, actorId, level))) {
      return bot.sendMessage(chatId, "⛔ ما عندكش الصلاحية باش تنزل هذي الرتبة.");
    }

    const currentLevel = await getUserRank(chatId, target.id);
    if (currentLevel !== level) {
      return bot.sendMessage(chatId, `ℹ️ ${target.first_name} ماعندوش هاذ الرتبة أصلا.`);
    }

    await removeUserRank(chatId, target.id);
    await bot.sendMessage(chatId, `✅ تم تنزيل ${target.first_name} من رتبة "${RANK_LABELS[level]}".`);
  });

  // ─── تنزيل الكل (بالرد) ───
  bot.onText(/^تنزيل الكل$/, async (msg) => {
    const chatId = msg.chat.id;
    const actorId = msg.from.id;
    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, "↩️ لازم ترد على رسالة الشخص.");
    }
    // خاص مدير وما فوق
    const { canModerate } = require("./ranks");
    const level = await getUserRank(chatId, actorId);
    const isCreator = await bot
      .getChatMember(chatId, actorId)
      .then((m) => m.status === "creator")
      .catch(() => false);
    if (!isCreator && (level === null || level > 4)) {
      return bot.sendMessage(chatId, "⛔ هذا الأمر خاص بالمدير وما فوق.");
    }
    const target = msg.reply_to_message.from;
    await removeUserRank(chatId, target.id);
    await bot.sendMessage(chatId, `✅ تم تنزيل ${target.first_name} من جميع الرتب.`);
  });

  // ─── عرض الرتب ───
  bot.onText(/^عرض الرتب$/, async (msg) => {
    const chatId = msg.chat.id;
    let text = "👑 *رتب المجموعة:*\n\n";
    let hasAny = false;

    for (const [name, level] of Object.entries(RANKS)) {
      const userIds = await listRank(chatId, level);
      if (userIds.length === 0) continue;
      hasAny = true;
      text += `*${RANK_LABELS[level]}:*\n`;
      for (const uid of userIds) {
        text += `• [${uid}](tg://user?id=${uid})\n`;
      }
      text += "\n";
    }

    if (!hasAny) text += "ما كاين حتى رتبة مضافة حاليا.";

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });
}

module.exports = { registerRankCommands };
