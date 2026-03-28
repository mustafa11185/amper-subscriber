import { Zap } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 animate-fade-in"
        style={{ background: "var(--bg-base)", boxShadow: "var(--shadow-card)" }}
      >
        <Zap className="w-10 h-10" style={{ color: "var(--brand-primary)" }} />
      </div>
      <h1 className="text-2xl font-black mb-2 animate-fade-in-1">لم نجد حسابك</h1>
      <p className="text-sm mb-8 animate-fade-in-2" style={{ color: "var(--text-muted)" }}>
        تأكد من الرابط أو تواصل مع صاحب المولدة
      </p>
      <Link
        href="/"
        className="h-14 px-8 rounded-[16px] text-white font-bold flex items-center justify-center animate-fade-in-3"
        style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-button)" }}
      >
        البحث برقم الهاتف
      </Link>
    </div>
  );
}
