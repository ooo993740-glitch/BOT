// ownerCommands.js
// أوامر خاصة بمالك البوت *فقط* — تشتغل في الخاص مع البوت، ماشي في القروبات
// حتى أدمنية القروبات ما يقدروش يستعملوها

const OWNER_ID = Number(process.env.OWNER_ID); // آيدي تيليغرام ديالك (رقم)
const {
  getForceSubChannels,
  addForceSubChannel,
  removeForceSubChannel,
} = require("./forceSub");

function isOwner(userId) {
  return OWNER_ID && userId === OWNER_ID;
}

function registerOwnerCommands(bot) {
  // ─── اضف قناة @channel ───
  bot.onText(/^اضف قناة (@?\S+)$/, async (msg, match) => {
    if (msg.chat.type !== "private") return; // خاص برك
    if (!isOwner(msg.from.id)) return; // نتجاهل بصمت لأي شخص آخر

    let channel = match[1].trim();
    if (!channel.startsWith("@")) channel = "@" + channel;

    const updated = await addForceSubChannel(channel);
    await bot.sendMessage(
      msg.chat.id,
      `✅ تمت إضافة ${channel}.\n\n📋 القنوات الحالية:\n${updated.join("\n") || "لا شيء"}\n\n` +
        `⚠️ تذكر: خاص "ناصر" يكون أدمن في ${channel} باش يقدر يتحقق من الاشتراك.`
    );
  });

  // ─── احذف قناة @channel ───
  bot.onText(/^احذف قناة (@?\S+)$/, async (msg, match) => {
    if (msg.chat.type !== "private") return;
    if (!isOwner(msg.from.id)) return;

    let channel = match[1].trim();
    if (!channel.startsWith("@")) channel = "@" + channel;

    const updated = await removeForceSubChannel(channel);
    await bot.sendMessage(
      msg.chat.id,
      `✅ تم حذف ${channel}.\n\n📋 القنوات الحالية:\n${updated.join("\n") || "لا شيء"}`
    );
  });

  // ─── قنوات الاشتراك (عرض) ───
  bot.onText(/^قنوات الاشتراك$/, async (msg) => {
    if (msg.chat.type !== "private") return;
    if (!isOwner(msg.from.id)) return;

    const channels = await getForceSubChannels();
    await bot.sendMessage(
      msg.chat.id,
      channels.length
        ? `📋 قنوات الاشتراك الإجباري الحالية:\n${channels.join("\n")}`
        : "ما كاين حتى قناة مضافة حاليا."
    );
  });
}

module.exports = { registerOwnerCommands, isOwner };
