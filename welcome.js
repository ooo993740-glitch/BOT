// welcome.js
// ترحيب تلقائي بالأعضاء الجداد + قوانين القروب
// "ضع الترحيب" و"ضع قوانين" — خاص أدمن وما فوق

const { db } = require("./firebase");
const { canModerate } = require("./ranks");

function settingsDocId(chatId) {
  return String(chatId);
}

async function getGroupSettings(chatId) {
  const doc = await db.collection("groupSettings").doc(settingsDocId(chatId)).get();
  return doc.exists ? doc.data() : {};
}

async function updateGroupSettings(chatId, data) {
  await db.collection("groupSettings").doc(settingsDocId(chatId)).set(data, { merge: true });
}

function registerWelcome(bot) {
  // ─── ضع الترحيب (بالرد على نص، أو بعد الأمر مباشرة) ───
  bot.onText(/^ضع الترحيب(?:\s+([\s\S]+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!(await canModerate(bot, chatId, msg.from.id))) {
      return bot.sendMessage(chatId, "⛔ هذا الأمر خاص بالأدمن وما فوق.");
    }
    const text = match[1] || (msg.reply_to_message && msg.reply_to_message.text);
    if (!text) {
      return bot.sendMessage(
        chatId,
        "✍️ اكتب: ضع الترحيب ثم النص، أو رد بالأمر على رسالة فيها نص الترحيب.\n" +
          "تقدر تستعمل {name} باش يتبدل باسم العضو الجديد."
      );
    }
    await updateGroupSettings(chatId, { welcomeText: text });
    await bot.sendMessage(chatId, "✅ تم حفظ رسالة الترحيب.");
  });

  // ─── مسح الترحيب ───
  bot.onText(/^مسح الترحيب$/, async (msg) => {
    const chatId = msg.chat.id;
    if (!(await canModerate(bot, chatId, msg.from.id))) return;
    await updateGroupSettings(chatId, { welcomeText: null });
    await bot.sendMessage(chatId, "✅ تم مسح رسالة الترحيب.");
  });

  // ─── ضع قوانين ───
  bot.onText(/^ضع قوانين(?:\s+([\s\S]+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!(await canModerate(bot, chatId, msg.from.id))) {
      return bot.sendMessage(chatId, "⛔ هذا الأمر خاص بالأدمن وما فوق.");
    }
    const text = match[1] || (msg.reply_to_message && msg.reply_to_message.text);
    if (!text) {
      return bot.sendMessage(chatId, "✍️ اكتب: ضع قوانين ثم نص القوانين.");
    }
    await updateGroupSettings(chatId, { rulesText: text });
    await bot.sendMessage(chatId, "✅ تم حفظ قوانين المجموعة.");
  });

  // ─── القوانين (عرض) ───
  bot.onText(/^القوانين$/, async (msg) => {
    const chatId = msg.chat.id;
    const settings = await getGroupSettings(chatId);
    await bot.sendMessage(chatId, settings.rulesText || "ما كاين قوانين مضافة حاليا.");
  });

  // ─── الترحيب التلقائي بالأعضاء الجداد ───
  bot.on("new_chat_members", async (msg) => {
    const chatId = msg.chat.id;
    const settings = await getGroupSettings(chatId);
    if (!settings.welcomeText) return;

    for (const member of msg.new_chat_members) {
      if (member.is_bot) continue;
      const text = settings.welcomeText.replace(/{name}/g, member.first_name);
      await bot.sendMessage(chatId, text);
    }
  });
}

module.exports = { registerWelcome, getGroupSettings };
