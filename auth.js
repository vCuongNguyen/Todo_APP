/**
 * Đăng nhập Google (Firebase Auth) + đồng bộ data Firestore.
 * Khi đã đăng nhập: data lưu/đọc từ Firestore theo user.
 * Khi chưa đăng nhập: dùng localStorage như cũ.
 */

const Auth = {
  _ready: false,
  _user: null,
  _onReadyCallbacks: [],

  isEnabled() {
    return typeof FIREBASE_ENABLED !== 'undefined' && FIREBASE_ENABLED;
  },

  init() {
    if (!Auth.isEnabled()) {
      Auth._ready = true;
      Auth._onReadyCallbacks.forEach(fn => fn());
      Auth._onReadyCallbacks = [];
      return Promise.resolve();
    }
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK chưa load. Auth tắt.');
      Auth._ready = true;
      Auth._onReadyCallbacks.forEach(fn => fn());
      return Promise.resolve();
    }
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
    } catch (e) {
      if (!e.code || e.code !== 'app/duplicate-app') console.warn('Firebase init:', e);
    }
    const auth = firebase.auth();
    auth.onAuthStateChanged(async (user) => {
      Auth._user = user;
      if (user) {
        await Auth._loadFromFirestore(user.uid);
        if (typeof Data.setCloudPersist === 'function') {
          Data.setCloudPersist(() => Auth._saveToFirestore(user.uid));
        }
        if (typeof Data.useCloudData === 'function') {
          Data.useCloudData(Auth._cloudCache);
        }
      } else {
        if (typeof Data.useLocalStorage === 'function') Data.useLocalStorage();
        Auth._cloudCache = null;
      }
      Auth._ready = true;
      Auth._onReadyCallbacks.forEach(fn => fn());
      Auth._onReadyCallbacks = [];
      if (typeof Auth.onStateChange === 'function') Auth.onStateChange(user);
    });
    return new Promise((resolve) => {
      Auth._onReadyCallbacks.push(resolve);
    });
  },

  _cloudCache: null,

  async _loadFromFirestore(uid) {
    const db = firebase.firestore();
    const ref = db.collection('users').doc(uid).collection('data').doc('app');
    try {
      const snap = await ref.get();
      if (snap.exists) {
        const d = snap.data();
        Auth._cloudCache = {
          tasks: Array.isArray(d.tasks) ? d.tasks : [],
          schedule: Array.isArray(d.schedule) ? d.schedule : [],
          kpi: d.kpi && typeof d.kpi === 'object' ? d.kpi : { type: 'done_ratio', target: 80, rewardCustom: '' },
          rewards: d.rewards && typeof d.rewards === 'object' ? d.rewards : { points: 0, history: [] },
          history: Array.isArray(d.history) ? d.history : [],
          projects: Array.isArray(d.projects) ? d.projects : [],
        };
      } else {
        Auth._cloudCache = {
          tasks: [],
          schedule: [],
          kpi: { type: 'done_ratio', target: 80, rewardCustom: '' },
          rewards: { points: 0, history: [] },
          history: [],
          projects: [],
        };
      }
    } catch (e) {
      console.warn('Firestore load error:', e);
      Auth._cloudCache = {
        tasks: [],
        schedule: [],
        kpi: { type: 'done_ratio', target: 80, rewardCustom: '' },
        rewards: { points: 0, history: [] },
        history: [],
      };
    }
  },

  _saveDebounce: null,
  async _saveToFirestore(uid) {
    if (!Auth._cloudCache || !Data.getCloudCache) return;
    const cache = Data.getCloudCache();
    if (!cache) return;
    if (Auth._saveDebounce) clearTimeout(Auth._saveDebounce);
    Auth._saveDebounce = setTimeout(async () => {
      Auth._saveDebounce = null;
      const db = firebase.firestore();
      const ref = db.collection('users').doc(uid).collection('data').doc('app');
      try {
        await ref.set({
          tasks: cache.tasks || [],
          schedule: cache.schedule || [],
          kpi: cache.kpi || {},
          rewards: cache.rewards || { points: 0, history: [] },
          history: cache.history || [],
          projects: cache.projects || [],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firestore save error:', e);
      }
    }, 500);
  },

  getUser() {
    return Auth._user;
  },

  isSignedIn() {
    return !!Auth._user;
  },

  async signInWithGoogle() {
    if (!Auth.isEnabled() || typeof firebase === 'undefined') {
      console.warn('Firebase chưa cấu hình. Mở firebase-config.js và thêm config.');
      return null;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    const auth = firebase.auth();
    try {
      const result = await auth.signInWithPopup(provider);
      return result.user;
    } catch (e) {
      console.warn('Google sign-in error:', e);
      throw e;
    }
  },

  async signOut() {
    if (!Auth.isEnabled() || typeof firebase === 'undefined') return;
    await firebase.auth().signOut();
  },

  whenReady(fn) {
    if (Auth._ready) {
      fn();
    } else {
      Auth._onReadyCallbacks.push(fn);
    }
  },
};
