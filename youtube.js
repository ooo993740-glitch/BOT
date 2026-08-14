// youtube.js
// "يوت + اسم الأغنية/الفيديو" -> بحث في يوتيوب -> تحميل أفضل نتيجة كصوت -> إرسالها
// ملاحظة: هاذ الميزة تخالف شروط استخدام يوتيوب من ناحية التحميل، استعملها بحذر

const fs = require("fs");
const os = require("os");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

function registerYoutube(bot) {
  bot.onText(/^يوت (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1].trim();

    const searching = await bot.sendMessage(chatId, `🔎 نقلب على: ${query}...`);

    let video;
    try {
      const results = await yts(query);
      video = results.videos[0];
      if (!video) {
        return bot.editMessageText("❌ ما لقيتش نتيجة.", {
          chat_id: chatId,
          message_id: searching.message_id,
        });
      }
    } catch (e) {
      console.error("yt-search error:", e);
      return bot.editMessageText("❌ صار خطأ في البحث.", {
        chat_id: chatId,
        message_id: searching.message_id,
      });
    }

    await bot.editMessageText(`⬇️ تحميل: ${video.title}...`, {
      chat_id: chatId,
      message_id: searching.message_id,
    });

    const tmpFile = path.join(os.tmpdir(), `${Date.now()}.mp3`);

    try {
      await new Promise((resolve, reject) => {
        const stream = ytdl(video.url, { filter: "audioonly", quality: "highestaudio" });
        const writeStream = fs.createWriteStream(tmpFile);
        stream.pipe(writeStream);
        stream.on("error", reject);
        writeStream.on("error", reject);
        writeStream.on("finish", resolve);
      });

      await bot.sendAudio(chatId, tmpFile, {
        title: video.title,
        performer: video.author.name,
        caption: `🎵 ${video.title}`,
      });

      await bot.deleteMessage(chatId, searching.message_id).catch(() => {});
    } catch (e) {
      console.error("ytdl download error:", e);
      await bot.editMessageText(
        "❌ فشل التحميل. ممكن الفيديو محمي أو طويل بزاف.",
        { chat_id: chatId, message_id: searching.message_id }
      );
    } finally {
      fs.unlink(tmpFile, () => {}); // نمسحو من السيرفر بعد الإرسال
    }
  });
}

module.exports = { registerYoutube };
