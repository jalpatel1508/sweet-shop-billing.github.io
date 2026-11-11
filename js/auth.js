/* ═══════════════════════════════════════════════════════════
   Auth & Secure Storage — Firebase Google Sign-In
   + Firestore Cloud Sync
   ═══════════════════════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  browserPopupRedirectResolver
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// NEW: Import Firestore
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ── 1. YOUR FIREBASE CONFIG ────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyBAyKDC-JGUYhrpfXryBEkhsj30y8YHTqw",
  authDomain: "new-rahat-sanitary.firebaseapp.com",
  projectId: "new-rahat-sanitary",
  storageBucket: "new-rahat-sanitary.firebasestorage.app",
  messagingSenderId: "30366197365",
  appId: "1:30366197365:web:0b5a8cd1b660c79e1d7a3c",
  measurementId: "G-J92BMR956V"
};

/* ── 2. INITIALIZE ──────────────────────────────────────── */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app); // NEW: Initialize Firestore

/* ── 3. ENCRYPTION HELPERS ──────────────────────────────── */
async function deriveKey(userId) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(userId), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("rahat-billing-salt-v1"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(text, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(encoded, key) {
  try {
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/* ── 4. PUBLIC AUTH API ─────────────────────────────────── */
const STORAGE_KEY = "billing.encryptedToken.v1";

window.Auth = {
  user: null,
  token: null,

  init() {
    return new Promise(resolve => {
      onAuthStateChanged(auth, async (user) => {
        this.user = user;
        if (user) {
          // 1. Try local storage first
          let stored = localStorage.getItem(STORAGE_KEY);
          
          // 2. If not found locally, try Firestore (new device login)
          if (!stored) {
            try {
              const docRef = doc(db, "users", user.uid);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists() && docSnap.data().encryptedToken) {
                stored = docSnap.data().encryptedToken;
                localStorage.setItem(STORAGE_KEY, stored); // Cache it locally
              }
            } catch (e) { 
              console.error("Firestore fetch failed:", e); 
            }
          }

          // 3. Decrypt and load the token
          if (stored) {
            const key = await deriveKey(user.uid);
            this.token = await decryptData(stored, key);
          }
        }
        resolve(user);
      });
    });
  },

  async signIn() {
    try {
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      this.user = result.user;
      return result.user;
    } catch (err) {
      console.error("Sign-in failed:", err);
      throw err;
    }
  },

  async signOut() {
    await signOut(auth);
    this.user = null;
    this.token = null;
    localStorage.removeItem(STORAGE_KEY);
  },

  async saveToken(rawToken) {
    if (!this.user) throw new Error("Not signed in.");
    const key = await deriveKey(this.user.uid);
    const encrypted = await encryptData(rawToken, key);
    
    // 1. Save locally
    localStorage.setItem(STORAGE_KEY, encrypted);
    this.token = rawToken;

    // 2. Save to Firestore Cloud
    try {
      await setDoc(doc(db, "users", this.user.uid), { 
        encryptedToken: encrypted,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not sync token to cloud:", e);
    }
  },

  hasToken() {
    return !!this.token;
  },

  getToken() {
    return this.token;
  }
};
