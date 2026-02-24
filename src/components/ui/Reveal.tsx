import { useRef, ReactNode, useState, useEffect } from "react";
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
    const [isTriggered, setIsTriggered] = useState(false);

    // Initial check for IntersectionObserver support
    const hasIOSupport = typeof window !== "undefined" && !!window.IntersectionObserver;

    useEffect(() => {
        if (entry?.isIntersecting) {
            setIsTriggered(true);
        }
    }, [entry?.isIntersecting]);

    // Safety fallback: if IntersectionObserver is not supported or 
    // if the element hasn't been revealed after a long enough time (e.g. 2s after delay), 
    // reveal it anyway to avoid a blank site.
    useEffect(() => {
        if (!hasIOSupport) {
            setIsTriggered(true);
            return;
        }

        const safetyTimeout = setTimeout(() => {
            setIsTriggered(true);
        }, delay + duration + 1000); // Wait until animation should have finished + buffer

        return () => clearTimeout(safetyTimeout);
    }, [hasIOSupport, delay, duration]);

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
                "transition-opacity duration-300",
                !isTriggered && "opacity-0 translate-y-4", // Start hidden with slight offset
                isTriggered && animationClasses[animation],
                className
            )}
            style={{
                animationDelay: `${delay}ms`,
                animationDuration: `${duration}ms`,
                animationFillMode: "both",
            }}
        >
            {children}
        </div>
    );
};

export default Reveal;
