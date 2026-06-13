import { htmlResponse, loadHtmlPage } from "@/lib/serve-html";

export const dynamic = "force-static";

export function GET() {
  return htmlResponse(loadHtmlPage("oto1.html", "outils"));
}
