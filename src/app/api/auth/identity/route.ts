import { handleIdentityRequest } from "@/lib/auth/identity-handler";
import { verifyGoogleIdentity } from "@/lib/auth/identity";
import { createSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleIdentityRequest(request, {
    origin: process.env.APP_ORIGIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    databaseSecretConfigured: (process.env.SUPABASE_JWT_SECRET?.length ?? 0) >= 32,
    verifyIdentity: verifyGoogleIdentity,
    createSession,
    async resolveIdentity(identity, projectId) {
      const { data: userId, error } = await createAdminClient().rpc("resolve_google_identity", {
        p_project_id: projectId, p_subject: identity.subject,
        p_email: identity.email, p_name: identity.name, p_can_link_legacy: identity.canLinkLegacy,
      });
      if (error?.message.includes("ACCOUNT_LINK_REQUIRED")) return { userId: null, linkRequired: true };
      if (error) throw new Error("Identity lookup failed");
      return { userId, linkRequired: false };
    },
  });
}
