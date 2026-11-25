import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { doc, Firestore, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
] as const;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let authInitError: string | null = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);

  const configWithDb = firebaseConfig as typeof firebaseConfig & {
    firestoreDatabaseId?: string;
  };

  db = configWithDb.firestoreDatabaseId
    ? getFirestore(app, configWithDb.firestoreDatabaseId)
    : getFirestore(app);
} catch (err) {
  authInitError =
    err instanceof Error ? err.message : 'Firebase services could not initialize.';
}

export { auth, db };

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

// In-memory cache + encrypted IndexedDB session cache (50-min TTL, cleared on sign-out / 401)
// Avoids localStorage/sessionStorage while preserving Workspace access across page reloads.
const TOKEN_TTL_MS = 50 * 60 * 1000;
const IDB_NAME = 'cadence_auth_cache';
const IDB_STORE = 'tokens';
const IDB_KEY_CRYPTO = 'oauth_key';
const IDB_KEY_SESSION = 'oauth_session';

interface EncryptedTokenRecord {
  uid: string;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
  expiresAt: number;
}

function openAuthCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open auth cache'));
  });
}

function idbGet<T>(dbConn: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = dbConn.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(dbConn: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = dbConn.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbClearAll(dbConn: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = dbConn.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getOrCreateSessionKey(dbConn: IDBDatabase): Promise<CryptoKey> {
  const existing = await idbGet<CryptoKey>(dbConn, IDB_KEY_CRYPTO);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  await idbPut(dbConn, IDB_KEY_CRYPTO, key);
  return key;
}

async function saveStoredToken(uid: string, token: string): Promise<void> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return;
  let dbConn: IDBDatabase | null = null;
  try {
    dbConn = await openAuthCacheDb();
    const key = await getOrCreateSessionKey(dbConn);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(token);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const record: EncryptedTokenRecord = {
      uid,
      iv,
      ciphertext,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    };
    await idbPut(dbConn, IDB_KEY_SESSION, record);
  } catch {
    // Gracefully fall back to in-memory only
  } finally {
    dbConn?.close();
  }
}

async function restoreStoredToken(uid: string): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  let dbConn: IDBDatabase | null = null;
  try {
    dbConn = await openAuthCacheDb();
    const record = await idbGet<EncryptedTokenRecord>(dbConn, IDB_KEY_SESSION);
    if (!record || record.uid !== uid || Date.now() >= record.expiresAt) {
      await idbClearAll(dbConn);
      return null;
    }
    const key = await idbGet<CryptoKey>(dbConn, IDB_KEY_CRYPTO);
    if (!key) {
      await idbClearAll(dbConn);
      return null;
    }
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(record.iv) },
      key,
      record.ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  } finally {
    dbConn?.close();
  }
}

async function clearStoredToken(): Promise<void> {
  let dbConn: IDBDatabase | null = null;
  try {
    dbConn = await openAuthCacheDb();
    await idbClearAll(dbConn);
  } catch {
    // ignore cleanup failures
  } finally {
    dbConn?.close();
  }
}

function buildGoogleProvider(loginHint?: string | null): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  for (const scope of SCOPES) {
    provider.addScope(scope);
  }
  if (loginHint) {
    provider.setCustomParameters({ login_hint: loginHint });
  }
  return provider;
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onUserChange: (user: User | null, token: string | null) => void
) => {
  if (!auth) {
    onUserChange(null, null);
    return () => {};
  }

  let disposed = false;

  const unsub = onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onUserChange(user, cachedAccessToken);
      } else if (!isSigningIn) {
        void restoreStoredToken(user.uid).then((restored) => {
          if (disposed) return;
          if (auth?.currentUser?.uid === user.uid && !cachedAccessToken) {
            cachedAccessToken = restored;
          }
          onUserChange(user, cachedAccessToken);
        });
      }
    } else {
      cachedAccessToken = null;
      void clearStoredToken();
      onUserChange(null, null);
    }
  });

  return () => {
    disposed = true;
    unsub();
  };
};

export const googleSignIn = async (loginHint?: string | null): Promise<{
  user: User;
  accessToken: string;
}> => {
  if (!auth) {
    throw new Error(authInitError || 'Google Sign-In is unavailable in this environment.');
  }

  try {
    isSigningIn = true;
    const hint = loginHint || auth.currentUser?.email || undefined;
    const result = await signInWithPopup(auth, buildGoogleProvider(hint));
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Unable to obtain Google access token. Please try again.');
    }
    cachedAccessToken = credential.accessToken;
    void saveStoredToken(result.user.uid, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        `This domain (${window.location.hostname}) is not authorized for Google Sign-In. Add it in Firebase Console → Authentication → Settings → Authorized domains.`
      );
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearAccessToken = (): void => {
  cachedAccessToken = null;
  void clearStoredToken();
};

export const getFirebaseIdToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
};

export const logout = async (): Promise<void> => {
  cachedAccessToken = null;
  await clearStoredToken();
  if (auth) {
    await signOut(auth);
  }
};
