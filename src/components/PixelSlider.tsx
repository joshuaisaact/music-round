import { forwardRef, InputHTMLAttributes } from "react";

interface PixelSliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export const PixelSlider = forwardRef<HTMLInputElement, PixelSliderProps>(
  ({ label, value, min, max, step = 1, onChange, className = "", ...props }, ref) => {
    const sliderId = `slider-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const labelId = `${sliderId}-label`;

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex justify-between items-center">
          <label id={labelId} htmlFor={sliderId} className="pixel-text text-white text-2xl">
            {label}
          </label>
          <span
            className="pixel-text text-white text-2xl font-bold bg-sky-700 px-4 py-2 border-4 border-sky-900"
            aria-live="polite"
            aria-atomic="true"
          >
            {value}
          </span>
        </div>
        <input
          ref={ref}
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="pixel-slider w-full h-4 cursor-pointer"
          aria-labelledby={labelId}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          {...props}
        />
      </div>
    );
  }
);

PixelSlider.displayName = "PixelSlider";
