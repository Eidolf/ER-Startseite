

export function AnimatedLogo() {
    return (
        <div className="w-64 h-64 select-none pointer-events-none">
            <img
                src="/logo.svg"
                alt="Logo"
                className="w-full h-full object-contain animate-subtle-pulse"
            />
        </div>
    );
}
