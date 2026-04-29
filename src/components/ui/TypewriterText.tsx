import { useState, useEffect } from 'react';

interface TypewriterTextProps {
    text: string;
    speed?: number;
    delay?: number;
    className?: string;
    onComplete?: () => void;
}

export const TypewriterText = ({
    text,
    speed = 30,
    delay = 0,
    className = '',
    onComplete
}: TypewriterTextProps) => {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (delay > 0) {
            const delayTimer = setTimeout(() => {
                setCurrentIndex(0);
            }, delay);
            return () => clearTimeout(delayTimer);
        } else {
            setCurrentIndex(0);
        }
    }, [text, delay]);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timer = setTimeout(() => {
                setDisplayText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timer);
        } else if (currentIndex === text.length && !isComplete) {
            setIsComplete(true);
            onComplete?.();
        }
    }, [currentIndex, text, speed, isComplete, onComplete]);

    return (
        <span className={className}>
            {displayText}
            {!isComplete && <span className="animate-pulse">|</span>}
        </span>
    );
};