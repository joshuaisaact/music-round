import { useEffect, useState } from "react";

interface RasterIconProps {
  icon: "volume2" | "volumeX" | "music" | "music2" | "music4";
  size?: number;
  color?: string;
}

const iconMap = {
  volume2: "Volume2Icon",
  volumeX: "VolumeXIcon",
  music: "MusicIcon",
  music2: "Music2Icon",
  music4: "Music4Icon",
} as const;

export function RasterIcon({ icon, size = 24, color = "#ffffff" }: RasterIconProps) {
  const [IconComponent, setIconComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("raster-react").then((module) => {
      const iconName = iconMap[icon];
      setIconComponent(() => module[iconName]);
    });
  }, [icon]);

  if (!IconComponent) {
    return null;
  }

  return <IconComponent size={size} color={color} />;
}
