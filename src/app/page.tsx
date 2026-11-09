import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const claims = await getSession();

  redirect(claims ? "/dashboard" : "/login");
}
