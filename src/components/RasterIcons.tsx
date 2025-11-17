interface RasterIconProps {
  icon: "volume2" | "volumeX" | "music" | "music2" | "music4";
  size?: number;
  color?: string;
}

// Pixel art icons extracted from raster-react for SSR compatibility
// Uses exact same SVG paths as the original library
export function RasterIcon({ icon, size = 24, color = "#ffffff" }: RasterIconProps) {
  const radius = 1;

  if (icon === "volume2") {
    return (
      <svg width={size} height={size} viewBox="0 0 256 256" fill={color} xmlns="http://www.w3.org/2000/svg" stroke={color} strokeWidth="0">
        <rect x="112" y="40" width="14" height="14" rx={radius} />
        <rect x="112" y="56" width="14" height="14" rx={radius} />
        <rect x="112" y="88" width="14" height="14" rx={radius} />
        <rect x="112" y="72" width="14" height="14" rx={radius} />
        <rect x="112" y="136" width="14" height="14" rx={radius} />
        <rect x="112" y="104" width="14" height="14" rx={radius} />
        <rect x="32" y="136" width="14" height="14" rx={radius} />
        <rect x="112" y="120" width="14" height="14" rx={radius} />
        <rect x="32" y="120" width="14" height="14" rx={radius} />
        <rect x="32" y="104" width="14" height="14" rx={radius} />
        <rect x="80" y="168" width="14" height="14" rx={radius} />
        <rect x="96" y="184" width="14" height="14" rx={radius} />
        <rect x="80" y="72" width="14" height="14" rx={radius} />
        <rect x="96" y="56" width="14" height="14" rx={radius} />
        <rect x="112" y="168" width="14" height="14" rx={radius} />
        <rect x="112" y="152" width="14" height="14" rx={radius} />
        <rect x="144" y="88" width="14" height="14" rx={radius} />
        <rect x="160" y="136" width="14" height="14" rx={radius} />
        <rect x="160" y="104" width="14" height="14" rx={radius} />
        <rect x="160" y="120" width="14" height="14" rx={radius} />
        <rect x="144" y="152" width="14" height="14" rx={radius} />
        <rect x="200" y="88" width="14" height="14" rx={radius} />
        <rect x="184" y="72" width="14" height="14" rx={radius} />
        <rect x="184" y="168" width="14" height="14" rx={radius} />
        <rect x="200" y="136" width="14" height="14" rx={radius} />
        <rect x="200" y="104" width="14" height="14" rx={radius} />
        <rect x="200" y="120" width="14" height="14" rx={radius} />
        <rect x="200" y="152" width="14" height="14" rx={radius} />
        <rect x="64" y="152" width="14" height="14" rx={radius} />
        <rect x="64" y="88" width="14" height="14" rx={radius} />
        <rect x="32" y="88" width="14" height="14" rx={radius} />
        <rect x="48" y="88" width="14" height="14" rx={radius} />
        <rect x="48" y="152" width="14" height="14" rx={radius} />
        <rect x="32" y="152" width="14" height="14" rx={radius} />
        <rect x="112" y="184" width="14" height="14" rx={radius} />
        <rect x="112" y="200" width="14" height="14" rx={radius} />
      </svg>
    );
  }

  if (icon === "volumeX") {
    return (
      <svg width={size} height={size} viewBox="0 0 256 256" fill={color} xmlns="http://www.w3.org/2000/svg" stroke={color} strokeWidth="0">
        <rect x="112" y="40" width="14" height="14" rx={radius} />
        <rect x="112" y="56" width="14" height="14" rx={radius} />
        <rect x="112" y="88" width="14" height="14" rx={radius} />
        <rect x="112" y="72" width="14" height="14" rx={radius} />
        <rect x="112" y="136" width="14" height="14" rx={radius} />
        <rect x="112" y="104" width="14" height="14" rx={radius} />
        <rect x="32" y="136" width="14" height="14" rx={radius} />
        <rect x="112" y="120" width="14" height="14" rx={radius} />
        <rect x="32" y="120" width="14" height="14" rx={radius} />
        <rect x="32" y="104" width="14" height="14" rx={radius} />
        <rect x="80" y="168" width="14" height="14" rx={radius} />
        <rect x="96" y="184" width="14" height="14" rx={radius} />
        <rect x="80" y="72" width="14" height="14" rx={radius} />
        <rect x="96" y="56" width="14" height="14" rx={radius} />
        <rect x="112" y="168" width="14" height="14" rx={radius} />
        <rect x="112" y="152" width="14" height="14" rx={radius} />
        <rect x="144" y="88" width="14" height="14" rx={radius} />
        <rect x="160" y="136" width="14" height="14" rx={radius} />
        <rect x="160" y="104" width="14" height="14" rx={radius} />
        <rect x="192" y="136" width="14" height="14" rx={radius} />
        <rect x="208" y="152" width="14" height="14" rx={radius} />
        <rect x="176" y="120" width="14" height="14" rx={radius} />
        <rect x="144" y="152" width="14" height="14" rx={radius} />
        <rect x="192" y="104" width="14" height="14" rx={radius} />
        <rect x="208" y="88" width="14" height="14" rx={radius} />
        <rect x="64" y="152" width="14" height="14" rx={radius} />
        <rect x="64" y="88" width="14" height="14" rx={radius} />
        <rect x="32" y="88" width="14" height="14" rx={radius} />
        <rect x="48" y="88" width="14" height="14" rx={radius} />
        <rect x="48" y="152" width="14" height="14" rx={radius} />
        <rect x="32" y="152" width="14" height="14" rx={radius} />
        <rect x="112" y="184" width="14" height="14" rx={radius} />
        <rect x="112" y="200" width="14" height="14" rx={radius} />
      </svg>
    );
  }

  if (icon === "music") {
    return (
      <svg width={size} height={size} viewBox="0 0 256 256" fill={color} xmlns="http://www.w3.org/2000/svg" stroke={color} strokeWidth="0">
        <rect x="76" y="128" width="14" height="14" rx={radius} />
        <rect x="76" y="144" width="14" height="14" rx={radius} />
        <rect x="172" y="168" width="14" height="14" rx={radius} />
        <rect x="156" y="168" width="14" height="14" rx={radius} />
        <rect x="156" y="184" width="14" height="14" rx={radius} />
        <rect x="140" y="184" width="14" height="14" rx={radius} />
        <rect x="172" y="200" width="14" height="14" rx={radius} />
        <rect x="156" y="200" width="14" height="14" rx={radius} />
        <rect x="76" y="112" width="14" height="14" rx={radius} />
        <rect x="188" y="152" width="14" height="14" rx={radius} />
        <rect x="140" y="64" width="14" height="14" rx={radius} />
        <rect x="188" y="136" width="14" height="14" rx={radius} />
        <rect x="188" y="120" width="14" height="14" rx={radius} />
        <rect x="188" y="168" width="14" height="14" rx={radius} />
        <rect x="108" y="56" width="14" height="14" rx={radius} />
        <rect x="124" y="60" width="14" height="14" rx={radius} />
        <rect x="172" y="73" width="14" height="14" rx={radius} />
        <rect x="76" y="96" width="14" height="14" rx={radius} />
        <rect x="188" y="104" width="14" height="14" rx={radius} />
        <rect x="76" y="80" width="14" height="14" rx={radius} />
        <rect x="188" y="88" width="14" height="14" rx={radius} />
        <rect x="188" y="76" width="14" height="14" rx={radius} />
        <rect x="76" y="64" width="14" height="14" rx={radius} />
        <rect x="156" y="68" width="14" height="14" rx={radius} />
        <rect x="188" y="184" width="14" height="14" rx={radius} />
        <rect x="172" y="184" width="14" height="14" rx={radius} />
        <rect x="60" y="144" width="14" height="14" rx={radius} />
        <rect x="44" y="144" width="14" height="14" rx={radius} />
        <rect x="44" y="160" width="14" height="14" rx={radius} />
        <rect x="28" y="160" width="14" height="14" rx={radius} />
        <rect x="60" y="176" width="14" height="14" rx={radius} />
        <rect x="44" y="176" width="14" height="14" rx={radius} />
        <rect x="60" y="160" width="14" height="14" rx={radius} />
        <rect x="76" y="160" width="14" height="14" rx={radius} />
        <rect x="76" y="48" width="14" height="14" rx={radius} />
        <rect x="92" y="52" width="14" height="14" rx={radius} />
        <rect x="140" y="96" width="14" height="14" rx={radius} />
        <rect x="108" y="88" width="14" height="14" rx={radius} />
      </svg>
    );
  }

  if (icon === "music2") {
    return (
      <svg width={size} height={size} viewBox="0 0 256 256" fill={color} xmlns="http://www.w3.org/2000/svg" stroke={color} strokeWidth="0">
        <rect x="112" y="136" width="14" height="14" rx={radius} />
        <rect x="112" y="152" width="14" height="14" rx={radius} />
        <rect x="112" y="120" width="14" height="14" rx={radius} />
        <rect x="176" y="72" width="14" height="14" rx={radius} />
        <rect x="144" y="64" width="14" height="14" rx={radius} />
        <rect x="160" y="68" width="14" height="14" rx={radius} />
        <rect x="112" y="104" width="14" height="14" rx={radius} />
        <rect x="112" y="88" width="14" height="14" rx={radius} />
        <rect x="112" y="72" width="14" height="14" rx={radius} />
        <rect x="112" y="168" width="14" height="14" rx={radius} />
        <rect x="96" y="152" width="14" height="14" rx={radius} />
        <rect x="80" y="152" width="14" height="14" rx={radius} />
        <rect x="80" y="168" width="14" height="14" rx={radius} />
        <rect x="64" y="168" width="14" height="14" rx={radius} />
        <rect x="96" y="184" width="14" height="14" rx={radius} />
        <rect x="80" y="184" width="14" height="14" rx={radius} />
        <rect x="96" y="168" width="14" height="14" rx={radius} />
        <rect x="112" y="56" width="14" height="14" rx={radius} />
        <rect x="128" y="60" width="14" height="14" rx={radius} />
      </svg>
    );
  }

  if (icon === "music4") {
    return (
      <svg width={size} height={size} viewBox="0 0 256 256" fill={color} xmlns="http://www.w3.org/2000/svg" stroke={color} strokeWidth="0">
        <rect x="76" y="128" width="14" height="14" rx={radius} />
        <rect x="76" y="144" width="14" height="14" rx={radius} />
        <rect x="172" y="168" width="14" height="14" rx={radius} />
        <rect x="156" y="168" width="14" height="14" rx={radius} />
        <rect x="156" y="184" width="14" height="14" rx={radius} />
        <rect x="140" y="184" width="14" height="14" rx={radius} />
        <rect x="172" y="200" width="14" height="14" rx={radius} />
        <rect x="156" y="200" width="14" height="14" rx={radius} />
        <rect x="76" y="112" width="14" height="14" rx={radius} />
        <rect x="188" y="152" width="14" height="14" rx={radius} />
        <rect x="140" y="64" width="14" height="14" rx={radius} />
        <rect x="188" y="136" width="14" height="14" rx={radius} />
        <rect x="188" y="120" width="14" height="14" rx={radius} />
        <rect x="188" y="168" width="14" height="14" rx={radius} />
        <rect x="108" y="56" width="14" height="14" rx={radius} />
        <rect x="124" y="60" width="14" height="14" rx={radius} />
        <rect x="172" y="73" width="14" height="14" rx={radius} />
        <rect x="76" y="96" width="14" height="14" rx={radius} />
        <rect x="188" y="104" width="14" height="14" rx={radius} />
        <rect x="76" y="80" width="14" height="14" rx={radius} />
        <rect x="188" y="88" width="14" height="14" rx={radius} />
        <rect x="188" y="76" width="14" height="14" rx={radius} />
        <rect x="76" y="64" width="14" height="14" rx={radius} />
        <rect x="156" y="68" width="14" height="14" rx={radius} />
        <rect x="188" y="184" width="14" height="14" rx={radius} />
        <rect x="172" y="184" width="14" height="14" rx={radius} />
        <rect x="60" y="144" width="14" height="14" rx={radius} />
        <rect x="44" y="144" width="14" height="14" rx={radius} />
        <rect x="44" y="160" width="14" height="14" rx={radius} />
        <rect x="28" y="160" width="14" height="14" rx={radius} />
        <rect x="60" y="176" width="14" height="14" rx={radius} />
        <rect x="44" y="176" width="14" height="14" rx={radius} />
        <rect x="60" y="160" width="14" height="14" rx={radius} />
        <rect x="76" y="160" width="14" height="14" rx={radius} />
        <rect x="76" y="48" width="14" height="14" rx={radius} />
        <rect x="92" y="52" width="14" height="14" rx={radius} />
        <rect x="140" y="96" width="14" height="14" rx={radius} />
        <rect x="108" y="88" width="14" height="14" rx={radius} />
      </svg>
    );
  }

  return null;
}
