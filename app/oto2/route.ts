import { htmlResponse, loadHtmlPage } from "@/lib/serve-html";

export const dynamic = "force-static";

export function GET() {
  return htmlResponse(loadHtmlPage("oto2.html", "fiches", { sticky: true }));
}
