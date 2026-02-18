import { Hexagon } from "lucide-react";

const PulseGridLogo = ({ size = "default" }: { size?: "default" | "small" | "large" }) => {
  const sizes = {
    small: { icon: 18, text: "text-base" },
    default: { icon: 22, text: "text-lg" },
    large: { icon: 28, text: "text-2xl" },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <Hexagon size={s.icon} className="text-primary fill-primary/20" />
      <span className={`${s.text} font-bold tracking-tight text-foreground`}>
        Pulse<span className="gradient-primary-text">Grid</span>
      </span>
    </div>
  );
};

export default PulseGridLogo;
