export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-amber-50/40 via-background to-orange-50/30 p-4">
      {children}
    </div>
  );
}