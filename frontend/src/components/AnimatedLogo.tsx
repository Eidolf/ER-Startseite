

interface AnimatedLogoProps {
    className?: string;
}

export function AnimatedLogo({ className = "w-64 h-64" }: AnimatedLogoProps) {
    return (
        <div className={`${className} select-none pointer-events-none`}>
            <img
                src="/logo.svg"
                alt="Logo"
                className="w-full h-full object-contain animate-subtle-pulse"
            />
        </div>
    );
}
