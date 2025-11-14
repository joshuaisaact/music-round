import { InputHTMLAttributes, forwardRef, KeyboardEvent } from "react";
import { playTypingSound } from "@/lib/audio";

interface PixelInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  onEnterPress?: () => void;
  className?: string;
}

/**
 * A pixel-art styled input with optional label.
 * Uses the .pixel-input CSS class for retro styling.
 *
 * @example
 * <PixelInput
 *   placeholder="ENTER CODE"
 *   maxLength={8}
 *   value={code}
 *   onChange={(e) => setCode(e.target.value)}
 * />
 *
 * @example
 * // With label
 * <PixelInput
 *   label="ARTIST NAME"
 *   placeholder="WHO IS THE ARTIST?"
 *   value={artist}
 *   onChange={(e) => setArtist(e.target.value)}
 * />
 *
 * @example
 * // With Enter key handler
 * <PixelInput
 *   placeholder="YOUR NAME"
 *   onEnterPress={handleSubmit}
 *   autoFocus
 * />
 */
export const PixelInput = forwardRef<HTMLInputElement, PixelInputProps>(
  ({ label, onEnterPress, className = "", onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      // Play typing sound for actual character input (not modifier or navigation keys)
      const isTypingKey = e.key.length === 1 || e.key === "Backspace" || e.key === "Delete";
      if (isTypingKey) {
        playTypingSound();
      }

      if (e.key === "Enter" && onEnterPress) {
        onEnterPress();
      }
      onKeyDown?.(e);
    };

    const input = (
      <input
        ref={ref}
        className={`pixel-input text-xl p-4 uppercase ${className}`}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );

    if (label) {
      return (
        <div>
          <label className="pixel-text text-sky-600 text-xs block mb-2">
            {label}
          </label>
          {input}
        </div>
      );
    }

    return input;
  }
);

PixelInput.displayName = "PixelInput";
