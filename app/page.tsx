import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login"); // NEW: always send root traffic to login for dev startup flow
}
