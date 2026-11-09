"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  prepareGoogleAuth,
  signInWithGoogle,
  signOutGoogleAuth,
  type FirebaseGoogleConfig,
} from "@/lib/auth/google-client";

interface GoogleSignInLabels {
  button: string;
  loading: string;
  unavailable: string;
  genericError: string;
  serverError: string;
  popupBlocked: string;
  cancelled: string;
  linkRequired: string;
}

export function GoogleSignIn({
  config,
  labels,
  linkRequired = false,
}: {
  config: FirebaseGoogleConfig | null;
  labels: GoogleSignInLabels;
  linkRequired?: boolean;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (config) {
      void prepareGoogleAuth(config)
        .then(() => active && setReady(true))
        .catch(() => active && setError(labels.genericError));
    }
    return () => {
      active = false;
    };
  }, [config, labels.genericError]);

  async function handleSignIn() {
    if (!config || busy || !ready) return;
    setBusy(true);
    setError(null);
    let auth: import("firebase/auth").Auth | undefined;
    try {
      const result = signInWithGoogle();
      auth = result.auth;
      const idToken = await result.idToken;
      const response = await fetch("/api/auth/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const payload: { error?: string; status?: string } = await response
        .json()
        .catch(() => ({}));
      if (!response.ok) {
        if (payload.error === "ACCOUNT_LINK_REQUIRED") {
          setError(labels.linkRequired);
        } else if (response.status >= 500) {
          setError(labels.serverError);
        } else {
          setError(labels.genericError);
        }
        return;
      }
      if (payload.status !== "active") {
        setError(labels.genericError);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      const code = (cause as { code?: string })?.code;
      setError(
        code === "auth/popup-blocked"
          ? labels.popupBlocked
          : code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
            ? labels.cancelled
            : labels.genericError,
      );
    } finally {
      if (auth) {
        try {
          await signOutGoogleAuth(auth);
        } catch {
          // The Firebase session is in-memory only; the app session is server-owned.
        }
      }
      setBusy(false);
    }
  }

  const disabled = !config || !ready || busy;

  return (
    <div className="space-y-3">
      {linkRequired && <p role="alert" className="text-sm text-destructive">{labels.linkRequired}</p>}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={disabled}
        onClick={handleSignIn}
      >
        {busy ? labels.loading : labels.button}
      </Button>
      {!config && <p className="text-center text-sm text-muted-foreground">{labels.unavailable}</p>}
      {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
