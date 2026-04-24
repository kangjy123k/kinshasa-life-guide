import type { ImgHTMLAttributes, CSSProperties } from "react";
import { wm, wmDownload } from "@/lib/watermark";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | undefined | null;
};

/**
 * 显示原图无水印；长按/右键命中的是叠在上面的 opacity:0 水印版，
 * 所以用户通过原生"保存图片"拿到的是带水印的 webp。
 *
 * 组件自带 `<span class="relative block overflow-hidden">` wrapper，
 * 把水印覆盖层牢牢关在容器内 — 即使调用方忘记给外层套 relative，
 * 也不会让水印 absolute 贴到 viewport 吞掉整页点击。
 *
 * className / style 会应用到 wrapper（尺寸/定位/圆角/边框），内部
 * img 固定 w-full h-full object-cover。无水印的图走单 img 快路径，
 * 保持最小 DOM。
 */
export function ProtectedImg({
  src,
  alt,
  className,
  style,
  loading,
  ...rest
}: Props) {
  const clean = wm(src);
  if (!clean) return null;
  const marked = wmDownload(src);
  const sameUrl = marked === clean || !marked;

  if (sameUrl) {
    // 无水印 → 单 img 原样，不改布局语义
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={clean}
        alt={alt ?? ""}
        className={className}
        style={style}
        loading={loading}
        draggable={false}
        {...rest}
      />
    );
  }

  // 有水印 → 自带 relative wrapper，水印层 absolute 只能撑满 wrapper，不逃逸
  return (
    <span
      className={`relative block overflow-hidden ${className ?? ""}`}
      style={style as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={clean}
        alt={alt ?? ""}
        loading={loading}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
        {...rest}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={marked}
        alt=""
        aria-hidden
        tabIndex={-1}
        loading="lazy"
        draggable={false}
        className="absolute inset-0 w-full h-full opacity-0 select-none"
      />
    </span>
  );
}
