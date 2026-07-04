import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalendarClient } from "./CalendarClient";

export default async function CalendarPage() {
  const sessionUser = await getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  return <CalendarClient sessionUser={sessionUser} />;
}
