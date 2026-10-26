/*
 * NIGHT IELTS — service worker nhận thông báo đẩy (Firebase Cloud Messaging).
 * Phải nằm ở GỐC web (nightielts.id.vn/firebase-messaging-sw.js) để nhận thông báo cả khi web đã tắt.
 * Thông báo do Apps Script "Night IELTS Thông báo" gửi; FCM tự hiện và bấm vào sẽ mở đúng link bài.
 */
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCmeN49M4oI78ZPWDhMlbisDOLaMJp2mb8",
  authDomain: "night-ielts-land.firebaseapp.com",
  projectId: "night-ielts-land",
  storageBucket: "night-ielts-land.firebasestorage.app",
  messagingSenderId: "408519436407",
  appId: "1:408519436407:web:a9f0b9ba23368b54427e72"
});

firebase.messaging();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
