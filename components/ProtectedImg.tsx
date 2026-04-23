import type { ImgHTMLAttributes } from "react";
import { wm, wmDownload } from "@/lib/watermark";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | undefined | null;
};

/**
 * 显示原图无水印；长按/右键命中的是叠在上面的 opacity:0 水印版，
 * 所以用户通过原生"保存图片"拿到的是带水印的 webp。
 *
 * 调用约束：父容器必须是 `position: relative`（或其它 positioned），
 * 因为覆盖层用 absolute inset-0 填满。
 */
export function ProtectedImg({ src, alt, className, loading, ...rest }: Props) {
  const clean = wm(src);
  if (!clean) return null;
  const marked = wmDownload(src);
  const sameUrl = marked === clean || !marked;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={clean}
        alt={alt ?? ""}
        className={className}
        loading={loading}
        draggable={false}
        {...rest}
      />
      {!sameUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={marked}
          alt=""
          aria-hidden
          tabIndex={-1}
          loading="lazy"
          draggable={false}
          className="absolute inset-0 w-full h-full opacity-0 select-none"
        />
      )}
    </>
  );
}
