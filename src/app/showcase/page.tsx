import { redirect } from "next/navigation";
export default function ShowcasePage() {
  redirect("/card-search?tab=showcase");
}
