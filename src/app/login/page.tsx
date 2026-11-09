import { GoogleSignIn } from "@/components/google-sign-in";
import { AuthShell } from "@/components/auth-shell";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const dict = getDictionary(await getLocale());
  const d = dict.auth.login;
  const params = await searchParams;
  const firebaseConfig =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ? {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        }
      : null;

  return (
    <AuthShell
      title={d.title}
      subtitle={d.subtitle}
      footer={d.googleHelp}
    >
      <GoogleSignIn
        config={firebaseConfig}
        linkRequired={params.error === "link-required"}
        labels={d.google}
      />
    </AuthShell>
  );
}
