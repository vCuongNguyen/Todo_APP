/**
 * Cấu hình Firebase - dùng cho Đăng nhập Google và lưu data Firestore.
 *
 * Cách lấy config:
 * 1. Vào https://console.firebase.google.com/ → Tạo project (hoặc chọn project)
 * 2. Project settings (bánh răng) → General → Your apps → Thêm app Web (</>)
 * 3. Copy object firebaseConfig bên dưới và dán vào.
 * 4. Trong Authentication → Sign-in method → Bật "Google"
 * 5. Trong Firestore Database → Tạo database (chế độ test hoặc production, nhớ set rules)
 * 6. Firestore Rules (data lưu tại users/{uid}/data/app):
 *
 *    rules_version = '2';
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /users/{userId}/data/{document} {
 *          allow read, write: if request.auth != null && request.auth.uid == userId;
 *        }
 *      }
 *    }
 */

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Nếu chưa cấu hình thì Auth sẽ không khởi tạo (app vẫn chạy bằng localStorage)
const FIREBASE_ENABLED = !!(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID"
);
