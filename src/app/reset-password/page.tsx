import { redirect } from "next/navigation";

export default function RetiredAuthPage() {
  redirect("/login");
}
