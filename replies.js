// replies.js
// "اضف رد" — أدمن وما فوق برك يقدر يضيف كلمة مفتاحية + رد تلقائي
// كل مرة عضو يكتب الكلمة، ناصر يرد تلقائيا

const { db } = require("./firebase");
const { canModerate } = require("./ranks");

function repliesCollection(chatId) {
  return db.collection("groupSettings").doc(String(chatId)).collection("autoReplies");
}

function registerReplies(bot) {
  // ─── اضف رد [كلمة] = [الرد] ───
  bot.onText(/^اضف رد\s+(.+?)\s*=\s*([\s\S]+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!(await canModerate(bot, chatId, msg.from.id))) {
      return bot.sendMessage(chatId, "⛔ هذا الأمر خاص بالأدمن وما فوق.");
    }
    const keyword = match[1].trim();
    const reply = match[2].trim();

    await repliesCollection(chatId).doc(keyword).set({
      keyword,
      reply,
      addedBy: msg.from.id,
      updatedAt: Date.now(),
    });

    await bot.sendMessage(chatId, `✅ تم إضافة رد للكلمة: "${keyword}"`);
  });

  // ─── حذف رد [كلمة] ───
  bot.onText(/^حذف رد\s+(.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!(await canModerate(bot, chatId, msg.from.id))) {
      return bot.sendMessage(chatId, "⛔ هذا الأمر خاص بالأدمن وما فوق.");
    }
    const keyword = match[1].trim();
    await repliesCollection(chatId).doc(keyword).delete();
    await bot.sendMessage(chatId, `✅ تم حذف الرد الخاص بـ "${keyword}"`);
  });

  // ─── الردود المضافة (عرض) ───
  bot.onText(/^الردود المضافه?$/, async (msg) => {
    const chatId = msg.chat.id;
    const snap = await repliesCollection(chatId).get();
    if (snap.empty) return bot.sendMessage(chatId, "ما كاين حتى رد مضاف حاليا.");
    const list = snap.docs.map((d) => `• ${d.data().keyword}`).join("\n");
    await bot.sendMessage(chatId, `💬 الردود المضافة:\n${list}`);
  });

  // ─── التفعيل التلقائي: أي رسالة تطابق كلمة مفتاحية ───
  bot.on("message", async (msg) => {
    if (!msg.text || msg.chat.type === "private") return;
    if (msg.text.startsWith("اضف رد") || msg.text.startsWith("حذف رد")) return; // تفادي التعارض

    const chatId = msg.chat.id;
    const doc = await repliesCollection(chatId).doc(msg.text.trim()).get();
    if (doc.exists) {
      await bot.sendMessage(chatId, doc.data().reply, { reply_to_message_id: msg.message_id });
    }
  });
}

module.exports = { registerReplies };
