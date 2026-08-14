// moderation.js
// أوامر الإشراف: كتم / فك كتم / طرد / حظر / الغاء الحظر / تحذير
// كل الأوامر تشتغل بالرد (reply) على رسالة الشخص المستهدف

const { db } = require("./firebase");
const { canModerate } = require("./ranks");

const WARN_LIMIT = 3;

function warnDocId(chatId, userId) {
  return `${chatId}_${userId}`;
}

async function getWarnCount(chatId, userId) {
  const doc = await db.collection("warnings").doc(warnDocId(chatId, userId)).get();
  return doc.exists ? doc.data().count : 0;
}

async function setWarnCount(chatId, userId, count) {
  await db.collection("warnings").doc(warnDocId(chatId, userId)).set({
    chatId: String(chatId),
    userId: String(userId),
    count,
    updatedAt: Date.now(),
  });
}

// دالة مساعدة: تتحقق الأمر مسموح، ترجع الشخص المستهدف، أو null + رسالة خطأ
async function checkAndGetTarget(bot, msg) {
  const chatId = msg.chat.id;
  const actorId = msg.from.id;

  if (!(await canModerate(bot, chatId, actorId))) {
    await bot.sendMessage(chatId, "⛔ هذا الأمر خاص بالأدمن وما فوق برك.", {
      reply_to_message_id: msg.message_id,
    });
    return null;
  }

  if (!msg.reply_to_message) {
    await bot.sendMessage(chatId, "↩️ لازم ترد على رسالة الشخص باش يشتغل الأمر.", {
      reply_to_message_id: msg.message_id,
    });
    return null;
  }

  return msg.reply_to_message.from;
}

function registerModeration(bot) {
  // ─── كتم ───
  bot.onText(/^كتم$/, async (msg) => {
    const chatId = msg.chat.id;
    const target = await checkAndGetTarget(bot, msg);
    if (!target) return;
    try {
      await bot.restrictChatMember(chatId, target.id, {
        permissions: { can_send_messages: false },
      });
      await bot.sendMessage(chatId, `🔇 تم كتم ${target.first_name}.`);
    } catch (e) {
      await bot.sendMessage(chatId, "❌ ماقدرتش نكتمه، تأكد بلي عندي صلاحية الإشراف.");
    }
  });

  // ─── الغاء الكتم ───
  bot.onText(/^الغاء الكتم$/, async (msg) => {
    const chatId = msg.chat.id;
    const target = await checkAndGetTarget(bot, msg);
    if (!target) return;
    try {
      await bot.restrictChatMember(chatId, target.id, {
        permissions: {
          can_send_messages: true,
          can_send_media_messages: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
        },
      });
      await bot.sendMessage(chatId, `🔊 تم فك الكتم عن ${target.first_name}.`);
    } catch (e) {
      await bot.sendMessage(chatId, "❌ ماقدرتش نفك الكتم.");
    }
  });

  // ─── طرد ───
  bot.onText(/^طرد$/, async (msg) => {
    const chatId = msg.chat.id;
    const target = await checkAndGetTarget(bot, msg);
    if (!target) return;
    try {
      await bot.unbanChatMember(chatId, target.id); // طرد بلا حظر دائم = kick
      await bot.sendMessage(chatId, `👢 تم طرد ${target.first_name}.`);
    } catch (e) {
      await bot.sendMessage(chatId, "❌ ماقدرتش نطردو.");
    }
  });

  // ─── حظر ───
  bot.onText(/^حظر$/, async (msg) => {
    const chatId = msg.chat.id;
    const target = await checkAndGetTarget(bot, msg);
    if (!target) return;
    try {
      await bot.banChatMember(chatId, target.id);
      await bot.sendMessage(chatId, `🚫 تم حظر ${target.first_name}.`);
    } catch (e) {
      await bot.sendMessage(chatId, "❌ ماقدرتش نحظرو.");
    }
  });

  // ─── الغاء الحظر ───
  bot.onText(/^الغاء الحظر$/, async (msg) => {
    const chatId = msg.chat.id;
    const actorId = msg.from.id;
    if (!(await canModerate(bot, chatId, actorId))) return;
    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, "↩️ لازم ترد على رسالة الشخص.");
    }
    const target = msg.reply_to_message.from;
    try {
      await bot.unbanChatMember(chatId, target.id, { only_if_banned: true });
      await bot.sendMessage(chatId, `✅ تم الغاء الحظر عن ${target.first_name}.`);
    } catch (e) {
      await bot.sendMessage(chatId, "❌ ماقدرتش نلغي الحظر.");
    }
  });

  // ─── تحذير ───
  bot.onText(/^تحذير$/, async (msg) => {
    const chatId = msg.chat.id;
    const target = await checkAndGetTarget(bot, msg);
    if (!target) return;

    const current = (await getWarnCount(chatId, target.id)) + 1;
    await setWarnCount(chatId, target.id, current);

    if (current >= WARN_LIMIT) {
      try {
        await bot.restrictChatMember(chatId, target.id, {
          permissions: { can_send_messages: false },
        });
        await bot.sendMessage(
          chatId,
          `⚠️ ${target.first_name} وصل ${WARN_LIMIT} تحذيرات → تم كتمه تلقائيا.`
        );
        await setWarnCount(chatId, target.id, 0);
      } catch (e) {
        await bot.sendMessage(chatId, "❌ وصل لحد التحذيرات بصح ماقدرتش نكتمه.");
      }
    } else {
      await bot.sendMessage(
        chatId,
        `⚠️ تحذير لـ ${target.first_name} (${current}/${WARN_LIMIT})`
      );
    }
  });

  // ─── مسح تحذيراته ───
  bot.onText(/^مسح تحذيراته$/, async (msg) => {
    const chatId = msg.chat.id;
    const target = await checkAndGetTarget(bot, msg);
    if (!target) return;
    await setWarnCount(chatId, target.id, 0);
    await bot.sendMessage(chatId, `✅ تم مسح تحذيرات ${target.first_name}.`);
  });
}

module.exports = { registerModeration };
