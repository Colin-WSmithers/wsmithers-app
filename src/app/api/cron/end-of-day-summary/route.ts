import { NextRequest, NextResponse } from "next/server";
import { generateDailySummaries } from "@/lib/data/daily-summary";
import { londonDateKey } from "@/lib/utils";

/**
 * Vercel Cron route — writes both end-of-day summaries (the operational job
 * rundown everyone reads, and the office-only money digest) and notifies
 * staff. All the real work lives in lib/data/daily-summary so this route and
 * the on-demand "Generate now" button on the dashboard can't drift apart.
 *
 * Scheduled after the working day ends via vercel.json. Protected the same
 * way as /api/cron/mark-overdue — see that route/README for CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const dateKey = londonDateKey();
  const results = await generateDailySummaries(dateKey);

  const failed = results.filter((r) => r.error);
  return NextResponse.json(
    { date: dateKey, results },
    { status: failed.length === results.length && results.length > 0 ? 500 : 200 }
  );
}
