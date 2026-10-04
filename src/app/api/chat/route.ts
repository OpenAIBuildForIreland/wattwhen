import Anthropic from "@anthropic-ai/sdk";
import { ask } from "@/lib/assistant";
import { getHousehold } from "@/lib/households";
import type { Household, Mode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ error: "Add ANTHROPIC_API_KEY to .env.local and restart the dev server." }, { status: 500 });
  }
  const body = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    household?: Household;
    mode?: Mode;
  };
  try {
    const result = await ask(body.messages.slice(-12), body.household ?? getHousehold("default"), body.mode ?? "both");
    return Response.json(result);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Missing or invalid ANTHROPIC_API_KEY in .env.local" }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Rate limited by the Claude API, try again in a moment." }, { status: 429 });
    }
    if (error instanceof Anthropic.AnthropicError && !(error instanceof Anthropic.APIError)) {
      return Response.json({ error: "Add ANTHROPIC_API_KEY to .env.local and restart the dev server." }, { status: 500 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Claude API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
