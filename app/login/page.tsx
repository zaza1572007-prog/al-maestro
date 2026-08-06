'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ToastProvider';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Users,
  Sparkles
} from 'lucide-react';
import TeacherOverlay from '@/components/TeacherOverlay';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') || 'TEACHER';
  const { info } = useToast();

  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Branding states
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState<number>(1.0);
  const [motivationQuote, setMotivationQuote] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [contactWhatsapp, setContactWhatsapp] = useState<string | null>(null);

  // Load identity branding configs from DB on mount
  useEffect(() => {
    const loadIdentity = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setMotivationQuote(data.settings.motivationQuote || null);
          setContactPhone(data.settings.contactPhone || null);
          setContactWhatsapp(data.settings.contactWhatsapp || null);
          if (data.settings.logoScale !== undefined) {
            setLogoScale(data.settings.logoScale);
          }
        }

        // Check if custom logo exists
        const logoRes = await fetch('/api/settings/branding?type=logo', { method: 'HEAD' });
        if (logoRes.ok) {
          setLogoUrl('/api/settings/branding?type=logo&t=' + Date.now());
        }
      } catch (e) {
        console.error('Failed to load branding in login page', e);
      }
    };
    loadIdentity();
  }, []);

  let roleTitle = "المدرس والإدارة";
  let redirectTarget = "/dashboard";
  let RoleIcon = ShieldCheck;

  if (roleParam === 'STUDENT') {
    roleTitle = "الطالب";
    redirectTarget = "/student-portal";
    RoleIcon = GraduationCap;
  } else if (roleParam === 'PARENT') {
    roleTitle = "ولي الأمر";
    redirectTarget = "/parent-portal";
    RoleIcon = Users;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Ensure phone is populated with studentName for students to satisfy API requirement
    const payloadPhone = roleParam === 'STUDENT' ? (phone || studentName) : phone;
    const payloadStudentName = roleParam === 'STUDENT' ? studentName : undefined;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentName: payloadStudentName, 
          phone: payloadPhone, 
          password, 
          role: roleParam 
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = redirectTarget;
      } else {
        setError(data.error || 'فشل تسجيل الدخول. يرجى التحقق من البيانات.');
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/15 shadow-2xl z-10 text-right backdrop-blur-2xl">
      {/* Back button */}
      <Link href="/select-role" className="inline-flex items-center gap-1.5 text-xs hover:underline mb-6 font-semibold transition-colors" style={{ color: 'rgb(var(--p))' }}>
        <ArrowRight className="w-4 h-4" />
        <span>تغيير نوع الحساب</span>
      </Link>

      {/* Brand Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 mx-auto mb-4 rounded-3xl p-0.5 shadow-2xl flex items-center justify-center border border-white/20 overflow-hidden bg-slate-900"
          style={{
            borderColor: 'rgb(var(--p) / 0.3)',
            boxShadow: '0 8px 25px rgb(var(--p) / 0.25)'
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={logoUrl} 
              alt="اللوجو" 
              className="w-full h-full object-contain p-1.5 transition-transform duration-300"
              style={{ transform: `scale(${logoScale})` }} 
            />
          ) : (
            <div className="w-full h-full rounded-[22px] flex items-center justify-center font-black text-2xl text-white">
              <RoleIcon className="w-10 h-10" style={{ color: 'rgb(var(--p))' }} />
            </div>
          )}
        </motion.div>

        <h1 className="text-2xl font-black text-white tracking-tight">تسجيل الدخول - {roleTitle}</h1>
        
        {motivationQuote ? (
          <p className="text-slate-300 text-xs mt-2 px-3 py-1.5 rounded-xl border border-dashed border-white/10 bg-white/5 inline-block font-medium">
            {motivationQuote}
          </p>
        ) : (
          <p className="text-slate-400 text-xs mt-1 font-medium">
            {roleParam === 'STUDENT' ? 'أدخل اسم الطالب أو الكود أو رقم الهاتف للمتابعة' : 'أدخل رقم الهاتف وكلمة المرور للمتابعة'}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {roleParam === 'STUDENT' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">اسم الطالب الرباعي أو كود الطالب *</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="أدخل اسم الطالب أو كوده..."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full glass-input py-3.5 px-4 pr-11 text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <User className="w-5 h-5 absolute right-3.5 top-3.5 text-slate-400" />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">رقم الهاتف / رمز الحساب *</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="01000000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full glass-input py-3.5 px-4 pr-11 text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <Phone className="w-5 h-5 absolute right-3.5 top-3.5 text-slate-400" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">كلمة المرور / الرقم السري</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input py-3.5 px-4 pr-11 pl-11 text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <Lock className="w-5 h-5 absolute right-3.5 top-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded w-4 h-4 bg-slate-900 border-white/20"
              style={{ accentColor: 'rgb(var(--p))' }}
            />
            <span>تذكرني على هذا الجهاز</span>
          </label>
          <Link 
            href="/forgot-password"
            className="hover:underline font-bold"
            style={{ color: 'rgb(var(--p))' }}
          >
            نسيت كلمة المرور؟
          </Link>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full py-4 glass-button-primary font-bold text-sm rounded-2xl shadow-xl transition duration-200 mt-4 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Submitting...
            </span>
          ) : (
            <span>دخول المنصة</span>
          )}
        </motion.button>
      </form>

      {/* Dynamic contact numbers display */}
      {(contactPhone || contactWhatsapp) && (
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-xs text-slate-400">
          {contactPhone && (
            <span className="flex items-center gap-1">
              📞 للتواصل: <strong className="text-slate-200">{contactPhone}</strong>
            </span>
          )}
          {contactWhatsapp && (
            <a 
              href={`https://wa.me/${contactWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
            >
              💬 واتساب: <strong className="text-slate-200">{contactWhatsapp}</strong>
            </a>
          )}
        </div>
      )}

      <div className="mt-4 text-center text-[10px] text-slate-600">
        منصة المايسترو الإلكترونية الفاخرة © {new Date().getFullYear()}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-transparent p-4 relative overflow-hidden">
      {/* Teacher Overlay in background */}
      <TeacherOverlay />

      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>
      <Suspense fallback={<div className="text-white text-sm">جارٍ التحميل...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
