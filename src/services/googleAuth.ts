import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { AI, getAI, GoogleAIBackend } from 'firebase/ai';
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
let firebaseAI: AI | null = null;
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

  firebaseAI = getAI(app, {
    backend: new GoogleAIBackend(),
  });
} catch (err) {
  authInitError =
    err instanceof Error ? err.message : 'Firebase services could not initialize.';
}

export { auth, db, firebaseAI };

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

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
// Access token is kept strictly in memory (never persisted in localStorage/sessionStorage).
let cachedAccessToken: string | null = null;

export const initAuth = (
  onUserChange: (user: User | null, token: string | null) => void
) => {
  if (!auth) {
    onUserChange(null, null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onUserChange(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onUserChange(user, null);
      }
    } else {
      cachedAccessToken = null;
      onUserChange(null, null);
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  if (!auth) {
    throw new Error(authInitError || 'Google Sign-In is unavailable in this environment.');
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Unable to obtain Google access token. Please try again.');
    }
    cachedAccessToken = credential.accessToken;
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

export const getFirebaseIdToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
};

export const logout = async (): Promise<void> => {
  cachedAccessToken = null;
  if (auth) {
    await signOut(auth);
  }
};
