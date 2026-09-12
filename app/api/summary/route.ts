import { NextResponse } from "next/server";
import { SummaryService } from "@/lib/services/summary.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!year || !month) {
    return NextResponse.json(
      { error: "Missing year or month" },
      { status: 400 }
    );
  }

  const data = await SummaryService.getMonthlySummary(year, month);

  return NextResponse.json(data);
}