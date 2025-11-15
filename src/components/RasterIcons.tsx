import { useEffect, useState } from "react";

interface RasterIconProps {
  icon: "volume2" | "volumeX";
  size?: number;
  color?: string;
}

export function RasterIcon({ icon, size = 24, color = "#ffffff" }: RasterIconProps) {
  const [IconComponent, setIconComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("raster-react").then((module) => {
      if (icon === "volume2") {
        setIconComponent(() => module.Volume2Icon);
      } else {
        setIconComponent(() => module.VolumeXIcon);
      }
    });
  }, [icon]);

  if (!IconComponent) {
    return null;
  }

  return <IconComponent size={size} color={color} />;
}
