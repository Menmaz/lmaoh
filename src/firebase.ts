import admin from "firebase-admin";
import dotenv from "dotenv";

// Khởi tạo dotenv để đọc file .env
dotenv.config();

// Kiểm tra các biến môi trường bắt buộc
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_DATABASE_URL'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Thiếu biến môi trường ${varName}`);
  }
});

// Khởi tạo Firebase với thông tin từ env
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Xử lý ký tự xuống dòng
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();
export default db;
