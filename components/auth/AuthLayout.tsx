interface AuthLayoutProps {
  mosque: { name: string; logo_url: string | null; secondary_color: string | null };
  leftContent: React.ReactNode;
  children: React.ReactNode;
}

export function AuthLayout({ mosque, leftContent, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10"
        style={{
          backgroundColor: mosque.secondary_color
            ? `${mosque.secondary_color}15`
            : "oklch(0.96 0.005 80)",
        }}
      >
        {leftContent}
      </div>
      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-[55%]">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
