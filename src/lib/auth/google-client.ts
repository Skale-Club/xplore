export interface FirebaseGoogleConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

type FirebaseAuthSdk = typeof import("firebase/auth");
interface PreparedAuth {
  auth: import("firebase/auth").Auth;
  sdk: FirebaseAuthSdk;
}

let authPromise: Promise<PreparedAuth> | undefined;
let preparedAuth: PreparedAuth | undefined;

/** Prepare Firebase before the user clicks so the popup opens in the click gesture. */
export function prepareGoogleAuth(config: FirebaseGoogleConfig) {
  authPromise ??= (async () => {
    const [appSdk, authSdk] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
    ]);
    const app =
      appSdk.getApps().find((candidate) => candidate.name === "xplore-auth") ??
      appSdk.initializeApp(config, "xplore-auth");
    const auth = authSdk.getAuth(app);
    auth.useDeviceLanguage();
    await authSdk.setPersistence(auth, authSdk.inMemoryPersistence);
    preparedAuth = { auth, sdk: authSdk };
    return preparedAuth;
  })().catch((error) => {
    authPromise = undefined;
    throw error;
  });
  return authPromise;
}

export function signInWithGoogle() {
  const current = preparedAuth;
  if (!current) throw new Error("Google sign-in is not ready");
  // Invoke popup synchronously from the button click to preserve browser activation.
  const popup = current.sdk.signInWithPopup(
    current.auth,
    new current.sdk.GoogleAuthProvider(),
  );
  return {
    auth: current.auth,
    idToken: popup.then((result) => result.user.getIdToken()),
  };
}

export async function signOutGoogleAuth(auth: import("firebase/auth").Auth) {
  const authSdk = await import("firebase/auth");
  await authSdk.signOut(auth);
}
