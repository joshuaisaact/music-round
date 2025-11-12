import { forwardRef, InputHTMLAttributes } from "react";

interface PixelSliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export const PixelSlider = forwardRef<HTMLInputElement, PixelSliderProps>(
  ({ label, value, min, max, step = 1, onChange, className = "", ...props }, ref) => {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex justify-between items-center">
          <label className="pixel-text text-white text-xl">
            {label}
          </label>
          <span className="pixel-text text-white text-2xl font-bold bg-sky-700 px-4 py-2 border-4 border-sky-900">
            {value}
          </span>
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="pixel-slider w-full h-4 cursor-pointer"
          {...props}
        />
      </div>
    );
  }
);

PixelSlider.displayName = "PixelSlider";
