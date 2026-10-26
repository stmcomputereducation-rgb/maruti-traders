import { redirect } from "next/navigation";

export default function TransfersPage() {
  redirect("/godowns?tab=transfers");
}
