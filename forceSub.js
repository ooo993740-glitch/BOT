// forceSub.js
// اشتراك اجباري: أي عضو يكتب أول رسالة في أي قروب فيه البوت، لازم يكون مشترك
// في *كل* القنوات المضافة، وإلا يتحذف كلامه ويتبعتلو أزرار اشتراك + تحقق
//
// القنوات تتضبط من طرف مالك البوت برك (شوف ownerCommands.js: اضف قناة / احذف قناة)
// وتتطبق تلقائيا على كل القروبات — أدمنية القروبات ما يقدروش يبدلوها

const { db } = require("./firebase");

let cachedChannels = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // نعاود نقرا من Firestore كل دقيقة، تفاديا لقراءات زايدة

async function getForceSubChannels() {
  const now = Date.now();
  if (cachedChannels !== null && now - cacheTime < CACHE_TTL_MS) return cachedChannels;

  const doc = await db.collection("config").doc("global").get();
  cachedChannels = doc.exists ? doc.data().forceSubChannels || [] : [];
  cacheTime = now;
  return cachedChannels;
}

async function addForceSubChannel(channelUsername) {
  const channels = await getForceSubChannels();
  if (channels.includes(channelUsername)) return channels;
  const updated = [...channels, channelUsername];
  await db.collection("config").doc("global").set(
    { forceSubChannels: updated, updatedAt: Date.now() },
    { merge: true }
  );
  cachedChannels = updated;
  cacheTime = Date.now();
  return updated;
}

async function removeForceSubChannel(channelUsername) {
  const channels = await getForceSubChannels();
  const updated = channels.filter((c) => c !== channelUsername);
  await db.collection("config").doc("global").set(
    { forceSubChannels: updated, updatedAt: Date.now() },
    { merge: true }
  );
  cachedChannels = updated;
  cacheTime = Date.now();
  return updated;
}

// ترجع قائمة القنوات اللي العضو ماشي مشترك فيها (فارغة = مشترك في الكل)
async function getUnsubscribedChannels(bot, userId) {
  const channels = await getForceSubChannels();
  if (channels.length === 0) return [];

  const results = await Promise.all(
    channels.map(async (channel) => {
      try {
        const member = await bot.getChatMember(channel, userId);
        const isMember = ["member", "administrator", "creator"].includes(member.status);
        return { channel, isMember };
      } catch (e) {
        console.error(`⚠️ تحقق فشل للقناة ${channel}، تأكد بلي ناصر أدمن فيها:`, e.message);
        return { channel, isMember: true };
      }
    })
  );

  return results.filter((r) => !r.isMember).map((r) => r.channel);
}

function registerForceSub(bot) {
  bot.on("message", async (msg) => {
    if (msg.chat.type === "private") return;
    if (!msg.from || msg.from.is_bot) return;

    const channels = await getForceSubChannels();
    if (channels.length === 0) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const member = await bot.getChatMember(chatId, userId);
      if (["creator", "administrator"].includes(member.status)) return;
    } catch (e) {
      /* تجاهل */
    }

    const missing = await getUnsubscribedChannels(bot, userId);
    if (missing.length === 0) return;

    try {
      await bot.deleteMessage(chatId, msg.message_id);
    } catch (e) {
      /* البوت ربما مايقدرش يحذف، نكمل نبعث التنبيه */
    }

    const keyboard = {
      inline_keyboard: [
        ...missing.map((channel) => [
          { text: `📢 اشترك: ${channel}`, url: `https://t.me/${channel.replace("@", "")}` },
        ]),
        [{ text: "✅ تحققت، كملت الاشتراك", callback_data: `checksub_${userId}` }],
      ],
    };

    await bot.sendMessage(
      chatId,
      `👋 ${msg.from.first_name}، خاصك تشترك في القنوات هاذو باش تقدر تهضر هنا.`,
      { reply_markup: keyboard }
    );
  });

  bot.on("callback_query", async (query) => {
    if (!query.data.startsWith("checksub_")) return;
    const targetUserId = Number(query.data.split("_")[1]);

    if (query.from.id !== targetUserId) {
      return bot.answerCallbackQuery(query.id, {
        text: "هذا الزر ماشي ليك 🙂",
        show_alert: true,
      });
    }

    const missing = await getUnsubscribedChannels(bot, query.from.id);
    if (missing.length === 0) {
      await bot.answerCallbackQuery(query.id, { text: "✅ تم التحقق، مرحبا بيك!" });
      await bot.deleteMessage(query.message.chat.id, query.message.message_id).catch(() => {});
    } else {
      await bot.answerCallbackQuery(query.id, {
        text: `❌ مازلتش مشترك في: ${missing.join("، ")}`,
        show_alert: true,
      });
    }
  });
}

module.exports = {
  registerForceSub,
  getForceSubChannels,
  addForceSubChannel,
  removeForceSubChannel,
  getUnsubscribedChannels,
};
