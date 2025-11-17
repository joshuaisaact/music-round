import { ReactNode } from "react";

type TitleSize = "small" | "medium" | "large";

interface PixelTitleProps {
  children: ReactNode;
  size?: TitleSize;
  className?: string;
}

const sizeClasses: Record<TitleSize, string> = {
  small: "text-[2rem] sm:text-[4rem]",
  medium: "text-[3rem] sm:text-[6rem]",
  large: "text-[4rem] sm:text-[9rem]",
};

const strokeWidths: Record<TitleSize, string> = {
  small: "2px",
  medium: "3px",
  large: "3px",
};

const shadows: Record<TitleSize, string> = {
  small: `
    2px 2px 0 #0c4a6e,
    4px 4px 0 #075985,
    6px 6px 0 #0369a1
  `,
  medium: `
    3px 3px 0 #0c4a6e,
    6px 6px 0 #075985,
    9px 9px 0 #0369a1,
    12px 12px 0 #0284c7
  `,
  large: `
    3px 3px 0 #0c4a6e,
    6px 6px 0 #075985,
    9px 9px 0 #0369a1,
    12px 12px 0 #0284c7,
    15px 15px 0 #0ea5e9
  `,
};

export function PixelTitle({ children, size = "large", className = "" }: PixelTitleProps) {
  return (
    <h1
      className={`text-white max-w-[800px] mx-auto leading-[1.3] ${sizeClasses[size]} ${className}`}
      style={{
        fontFamily: '"VCR OSD Mono", monospace',
        WebkitTextStroke: `${strokeWidths[size]} #0c4a6e`,
        textShadow: shadows[size],
      }}
    >
      {children}
    </h1>
  );
}
