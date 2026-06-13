import { htmlResponse, loadStaticPage } from "@/lib/serve-html";

export const dynamic = "force-static";

export function GET() {
  return htmlResponse(loadStaticPage("resume.html"));
}
