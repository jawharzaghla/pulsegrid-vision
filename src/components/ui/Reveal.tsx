import { useRef, ReactNode } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { cn } from "@/lib/utils";

interface RevealProps {
    children: ReactNode;
    className?: string;
    animation?: "fade-in" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "zoom-in";
    delay?: number;
    duration?: number;
    threshold?: number;
    once?: boolean;
}

const Reveal = ({
    children,
    className,
    animation = "slide-up",
    delay = 0,
    duration = 500,
    threshold = 0.1,
    once = true,
}: RevealProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const entry = useIntersectionObserver(ref, { threshold, freezeOnceVisible: once });
    const isVisible = !!entry?.isIntersecting;

    const animationClasses = {
        "fade-in": "animate-in fade-in fill-mode-both",
        "slide-up": "animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
        "slide-down": "animate-in fade-in slide-in-from-top-8 fill-mode-both",
        "slide-left": "animate-in fade-in slide-in-from-right-8 fill-mode-both",
        "slide-right": "animate-in fade-in slide-in-from-left-8 fill-mode-both",
        "zoom-in": "animate-in fade-in zoom-in-95 fill-mode-both",
    };

    return (
        <div
            ref={ref}
            className={cn(
                "opacity-0", // Start hidden
                isVisible && animationClasses[animation],
                className
            )}
            style={{
                animationDelay: `${delay}ms`,
                animationDuration: `${duration}ms`,
                animationFillMode: "both", // Ensures it stays visible after animation
            }}
        >
            {children}
        </div>
    );
};

export default Reveal;
