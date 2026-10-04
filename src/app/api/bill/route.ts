import Anthropic from "@anthropic-ai/sdk";
import { readBill } from "@/lib/assistant";

export const dynamic = "force-dynamic";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ error: "Add ANTHROPIC_API_KEY to .env.local and restart the dev server." }, { status: 500 });
  }
  const form = await request.formData();
  const file = form.get("bill");
  if (!(file instanceof File)) return Response.json({ error: "Upload an image as 'bill'." }, { status: 400 });
  const type = TYPES.find((t) => t === file.type);
  if (!type) return Response.json({ error: "Use a JPEG, PNG, WebP or GIF photo of the bill." }, { status: 400 });
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  try {
    return Response.json(await readBill(base64, type));
  } catch (error) {
    if (error instanceof Anthropic.AnthropicError && !(error instanceof Anthropic.APIError)) {
      return Response.json({ error: "Add ANTHROPIC_API_KEY to .env.local and restart the dev server." }, { status: 500 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Claude API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
