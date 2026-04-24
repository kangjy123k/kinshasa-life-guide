import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "刚果金华人生活服务指南 · 商家免费入驻中";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadCJKFont(weight: 700 | 900, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@${weight}&text=${encodeURIComponent(
    text,
  )}&display=swap`;
  // 老 UA 让 Google Fonts 回 TTF（satori 不支持 woff2）
  const css = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  }).then((r) => r.text());
  const m = css.match(/src:\s*url\((.+?)\)\s*format\('(?:truetype|opentype)'\)/);
  if (!m) throw new Error("cannot resolve Noto Sans SC TTF url");
  const buf = await fetch(m[1]).then((r) => r.arrayBuffer());
  return buf;
}

export default async function OG() {
  const text =
    "刚果金华人生活服务指南金沙萨商家免费入驻中随便逛逛有惊喜买商品找餐厅找住宿找服务租赁设备二手专区需求大厅帮助华人更快找到本地";
  const [black, bold] = await Promise.all([
    loadCJKFont(900, text),
    loadCJKFont(700, text),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 96px",
          background:
            "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #3b82f6 100%)",
          color: "white",
          fontFamily: "Noto",
          position: "relative",
        }}
      >
        {/* 装饰圆 */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            width: 220,
            height: 220,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.10)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 80,
            width: 300,
            height: 300,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.10)",
          }}
        />

        {/* 金沙萨 chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 28px",
            background: "rgba(255,255,255,0.22)",
            borderRadius: 9999,
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: "#fde047",
              boxShadow: "0 0 0 4px rgba(253,224,71,0.25)",
            }}
          />
          金沙萨
        </div>

        {/* 主标题 */}
        <div
          style={{
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 1.1,
            textAlign: "center",
            whiteSpace: "nowrap",
            textShadow: "0 4px 24px rgba(0,0,0,0.25)",
          }}
        >
          刚果金华人生活服务指南
        </div>

        {/* 副标题（用户指定）*/}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "20px 48px",
            background: "rgba(255,255,255,0.18)",
            borderRadius: 32,
            border: "2px solid rgba(253, 224, 71, 0.55)",
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: "#fef08a",
              textShadow: "0 2px 12px rgba(0,0,0,0.25)",
            }}
          >
            商家免费入驻中
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
            }}
          >
            随便逛逛有惊喜
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Noto", data: black, weight: 900, style: "normal" },
        { name: "Noto", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
