export function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-riseIn ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
