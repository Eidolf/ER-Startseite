import { useState, useEffect } from 'react';

interface AppIconProps {
    src?: string;
    alt: string;
    className?: string;
}

export function AppIcon({ src, alt, className }: AppIconProps) {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!src) {
            setImgSrc(null);
            return;
        }

        const img = new Image();
        img.src = src;

        const handleLoad = () => {
            // "Pixel check": Ensure the image actually has dimensions
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setImgSrc(src);
                setHasError(false);
            } else {
                // Loaded, but technically invalid (e.g. 0x0 tracking pixel)
                setHasError(true);
            }
        };

        const handleError = () => {
            setHasError(true);
        };

        img.onload = handleLoad;
        img.onerror = handleError;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src]);

    // Derived state for what to show
    const showFallback = !src || hasError;

    if (showFallback) {
        return (
            <img
                src="/logo.svg"
                alt={alt}
                className={`${className} opacity-80`}
            />
        );
    }

    // While checking (imgSrc is null but src exists and no error yet), 
    // we can either show nothing or the fallback. 
    // Showing fallback instantly prevents "pop in" but might flicker if fast.
    // Let's show fallback initially until confirmed good? 
    // Or keep existing behavior. 
    // Better UX: Show fallback until successful load confirmed.

    if (!imgSrc) {
        return (
            <img
                src="/logo.svg"
                alt={alt}
                className={`${className} opacity-80`}
            />
        );
    }

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            onError={() => setHasError(true)} // Double safety
        />
    );
}
