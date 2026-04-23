import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// 部署版本指纹：Vercel 每次新部署 sha / deploymentId 都会变；本地兜底 "dev"
const VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  "dev";

export async function GET() {
  return NextResponse.json(
    { v: VERSION },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
