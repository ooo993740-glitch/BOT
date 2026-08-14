// index.js
// نقطة الدخول الرئيسية لبوت "ناصر"

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ خاصك تحط BOT_TOKEN في متغيرات البيئة (.env أو إعدادات Render).");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ─── ربط كل الوحدات ───
const { registerStart } = require("./start");
const { registerModeration } = require("./moderation");
const { registerRankCommands } = require("./ranksCommands");
const { registerForceSub } = require("./forceSub");
const { registerOwnerCommands } = require("./ownerCommands");
const { registerWelcome } = require("./welcome");
const { registerReplies } = require("./replies");
const { registerYoutube } = require("./youtube");

registerStart(bot);
registerOwnerCommands(bot);
registerForceSub(bot); // خاصها تكون قبل باقي أوامر القروب باش تحجب الرسائل الأولى
registerModeration(bot);
registerRankCommands(bot);
registerWelcome(bot);
registerReplies(bot);
registerYoutube(bot);

bot.on("polling_error", (err) => {
  console.error("⚠️ polling error:", err.message);
});

console.log("✅ ناصر يخدم الآن...");

// ─── سيرفر خفيف باش Render يعرف البوت حي (health check) ───
const app = express();
app.get("/", (req, res) => res.send("ناصر شغال ✅"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 health check listening on port ${PORT}`));
