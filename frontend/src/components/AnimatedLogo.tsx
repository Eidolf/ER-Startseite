
import { useState, useEffect } from 'react';

interface AnimatedLogoProps {
    className?: string;
    src?: string | null;
}

export function AnimatedLogo({ className = "w-64 h-64", src }: AnimatedLogoProps) {
    const [imgSrc, setImgSrc] = useState(src || "/logo.svg");

    useEffect(() => {
        setImgSrc(src || "/logo.svg");
    }, [src]);

    return (
        <div className={`${className} select-none pointer-events-none`}>
            <img
                src={imgSrc}
                alt="Logo"
                className="w-full h-full object-contain animate-subtle-pulse"
                onError={() => setImgSrc("/logo.svg")}
            />
        </div>
    );
}
