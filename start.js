// start.js
// رسالة الترحيب اللي تبان كي حد يبدا خاص مع البوت (/start)

const BOT_USERNAME = process.env.BOT_USERNAME || "NasrBot"; // بدون @

function registerStart(bot) {
  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const text =
      "🦅 اهلين، انا *ناصر*\n\n" +
      "اختصاصي ادارة وحماية المجموعات من السبام، الرتب، الاشتراك الاجباري، " +
      "الكتم والطرد والحظر، وتحميل يوتيوب، وأشياء كثير.\n\n" +
      "➤ ضيفني للمجموعة، وفعلني *اشراف* (Admin)، وبعدها ارسل كلمة *تفعيل*.";

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "➕ ضيفني لمجموعتك",
            url: `https://t.me/${BOT_USERNAME}?startgroup=true`,
          },
        ],
        [{ text: "📜 الأوامر", callback_data: "help_menu" }],
      ],
    };

    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  });

  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    const text =
      "📜 *أهم أوامر ناصر:*\n\n" +
      "🛡️ *الإدارة (بالرد على رسالة الشخص):*\n" +
      "كتم / الغاء الكتم / طرد / حظر / الغاء الحظر / تحذير / مسح تحذيراته\n\n" +
      "👑 *الرتب:*\n" +
      "رفع [الرتبة] بالرد / تنزيل [الرتبة] بالرد / عرض الرتب\n\n" +
      "💬 *الردود التلقائية:*\n" +
      "اضف رد بالرد على رسالة (النص اللي تحب يرد بيه ناصر)\n\n" +
      "🎵 *التحميل:*\n" +
      "يوت + اسم الأغنية\n\n" +
      "⚙️ *الإعدادات:*\n" +
      "ضع الترحيب / ضع قوانين / تفعيل / تعطيل";

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });
}

module.exports = { registerStart };
