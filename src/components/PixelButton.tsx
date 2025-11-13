import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "danger" | "warning" | "success";
type ButtonSize = "small" | "medium" | "large";

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-white",
  danger: "bg-red-500 hover:bg-red-600 !text-white",
  warning: "bg-yellow-300 text-yellow-900 border-yellow-900",
  success: "bg-green-500 hover:bg-green-600 !text-white border-green-800",
};

const sizeStyles: Record<ButtonSize, string> = {
  small: "text-sm py-3 px-6",
  medium: "text-base py-3 px-4",
  large: "text-xl py-5 px-8",
};

/**
 * A pixel-art styled button with drop shadow effect.
 * Uses the .pixel-button CSS class for retro styling.
 *
 * @example
 * <PixelButton variant="primary" size="large">
 *   JOIN GAME
 * </PixelButton>
 *
 * @example
 * <PixelButton
 *   variant="danger"
 *   size="small"
 *   onClick={handleClick}
 *   disabled={isLoading}
 * >
 *   LEAVE GAME
 * </PixelButton>
 *
 * @example
 * // Override with custom className
 * <PixelButton className="w-full max-w-md">
 *   CUSTOM BUTTON
 * </PixelButton>
 */
export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  (
    { variant = "primary", size = "large", className = "", children, ...props },
    ref,
  ) => {
    const variantClass = variantStyles[variant];
    const sizeClass = sizeStyles[size];

    return (
      <button
        ref={ref}
        className={`pixel-button ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

PixelButton.displayName = "PixelButton";
