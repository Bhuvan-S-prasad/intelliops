export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <path
              d="M10 16L14 20L22 12"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            IntelliOps
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Operational intelligence, organised.
        </p>
      </div>
      {children}
    </div>
  );
}
