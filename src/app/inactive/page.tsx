import { Zap } from "lucide-react";

export default function InactivePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 animate-fade-in"
        style={{ background: "var(--bg-base)", boxShadow: "var(--shadow-card)" }}
      >
        <Zap className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
      </div>
      <h1 className="text-2xl font-black mb-2 animate-fade-in-1">هذا التطبيق غير مفعّل حالياً</h1>
      <p className="text-sm animate-fade-in-2" style={{ color: "var(--text-muted)" }}>
        تواصل مع صاحب المولدة لتفعيله
      </p>
    </div>
  );
}
