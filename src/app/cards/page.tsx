import { redirect } from "next/navigation";
export default function CardsPage() {
  redirect("/card-search?tab=database");
}
