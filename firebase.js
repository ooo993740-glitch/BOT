// firebase.js
// الاتصال بقاعدة بيانات Firestore (نفس Firebase اللي تستعمله في NASR)
// خاصك تحط ملف مفتاح الخدمة (service account key) وتسميه serviceAccountKey.json
// طريقة الحصول عليه: Firebase Console -> Project Settings -> Service Accounts -> Generate new private key

const admin = require("firebase-admin");

let serviceAccount;
try {
  // في الاستضافة (Render) رح نحط المحتوى كمتغير بيئة بدل ملف
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = require("./serviceAccountKey.json");
  }
} catch (e) {
  console.error("❌ ما لقيتش مفتاح Firebase. شوف README.md خطوة 'إعداد Firebase'.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { db, admin };
