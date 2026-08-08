'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import HeroHeader from '@/components/HeroHeader';
import { ToggleLeft, ToggleRight, Upload, Image as ImageIcon, CheckCircle2, XCircle, Loader2, Palette, RefreshCw, Layout, Maximize2, Sparkles } from 'lucide-react';
import { extractDominantColors, generatePalettes, getDefaultPalettes, ThemePalette } from '@/lib/colorExtractor';
import ColorPaletteSelector from '@/components/ColorPaletteSelector';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('registration');

  // DB-backed settings
  const [platformName, setPlatformName] = useState('منصة المايسترو');
  const [teacherName, setTeacherName] = useState('الأستاذ أحمد راضي كحلة');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [enableWhatsApp, setEnableWhatsApp] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // WhatsApp Gateway settings
  const [waGatewayUrl, setWaGatewayUrl] = useState('');
  const [waApiToken, setWaApiToken] = useState('');
  const [waSenderNumber, setWaSenderNumber] = useState('');
  const [waSaving, setWaSaving] = useState(false);
  const [waTestStatus, setWaTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [waTestMsg, setWaTestMsg] = useState('');

  // WhatsApp Templates
  const [tplStudent, setTplStudent] = useState('🎓 مرحباً [student_name]\nتم إنشاء حسابك بمنصة المايسترو.\nاسم المستخدم: [username]\nكلمة المرور: [password]\nبتوفيق 🌟');
  const [tplParent, setTplParent] = useState('👨‍👩‍👦 أهلاً [parent_name]\nتم تسجيل ابنك/بنتك [student_name] بمنصة المايسترو.\nبيانات دخولك كولي أمر:\nاسم المستخدم: [username]\nكلمة المرور: [password]\nبتوفيق 🌟');
  const [tplAttendance, setTplAttendance] = useState('📅 تنبيه حضور\nالطالب: [student_name]\nالحالة: [status]\nالوقت: [time]\nمنصة المايسترو 🏫');
  const [tplAbsent, setTplAbsent] = useState('📅 تنبيه غياب\nالطالب: [student_name]\nتغيب عن حضور حصة اليوم بالمجموعة.\nيرجى المتابعة 🏫');

  // Account settings
  const [accountName, setAccountName] = useState('');
  const [accountPhone, setAccountPhone] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [accountMsg, setAccountMsg] = useState('');
  const [accountMsgOk, setAccountMsgOk] = useState(true);
  const [accountSaving, setAccountSaving] = useState(false);

  // Backup
  const [restoreMsg, setRestoreMsg] = useState('');

  // Custom Identity & Contact settings
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [motivationQuote, setMotivationQuote] = useState('');

  // Portrait layout configuration
  const [portraitOpacity, setPortraitOpacity] = useState(0.18);
  const [portraitScale, setPortraitScale] = useState(1.0);
  const [portraitPosition, setPortraitPosition] = useState('side');

  // Logo layout configuration
  const [logoScale, setLogoScale] = useState(1.0);

  // Branding uploads
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [portraitUploading, setPortraitUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [portraitMsg, setPortraitMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [logoMsg, setLogoMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Smart colour system
  const [palettes, setPalettes] = useState<ThemePalette[]>(() => getDefaultPalettes());
  const [extractingColors, setExtractingColors] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null); // object URL for instant preview

  /** Extract colours from a local File object (before uploading) */
  const extractFromFile = useCallback(async (file: File) => {
    setExtractingColors(true);
    try {
      const objUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objUrl);
      const colors = await extractDominantColors(objUrl);
      setPalettes(generatePalettes(colors));
    } finally {
      setExtractingColors(false);
    }
  }, []);

  const handleBrandingUpload = async (
    file: File,
    type: 'portrait' | 'logo'
  ) => {
    const setUploading = type === 'portrait' ? setPortraitUploading : setLogoUploading;
    const setMsg = type === 'portrait' ? setPortraitMsg : setLogoMsg;
    const setUrl = type === 'portrait' ? setPortraitUrl : setLogoUrl;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      const res = await fetch('/api/settings/branding', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setUrl(data.url + '?t=' + Date.now());
        setMsg({ text: data.message, ok: true });
        if (type === 'portrait') {
          window.dispatchEvent(new Event('maestro-portrait-updated'));
        } else if (type === 'logo') {
          window.dispatchEvent(new Event('maestro-logo-updated'));
        }
      } else {
        setMsg({ text: data.error || 'فشل الرفع', ok: false });
      }
    } catch {
      setMsg({ text: 'خطأ في الاتصال بالخادم', ok: false });
    } finally {
      setUploading(false);
    }
  };

  // Load settings from DB on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setPlatformName(data.settings.platformName || 'منصة المايسترو');
          setIsRegistrationOpen(data.settings.isRegistrationOpen ?? true);
          setEnableWhatsApp(data.settings.enableWhatsApp ?? true);
          setContactPhone(data.settings.contactPhone || '');
          setContactWhatsapp(data.settings.contactWhatsapp || '');
          setMotivationQuote(data.settings.motivationQuote || '');
          setPortraitOpacity(data.settings.portraitOpacity ?? 0.18);
          setPortraitScale(data.settings.portraitScale ?? 1.0);
          setPortraitPosition(data.settings.portraitPosition ?? 'side');
          setLogoScale(data.settings.logoScale ?? 1.0);
        }
        // Load WhatsApp gateway settings
        const waRes = await fetch('/api/settings/whatsapp');
        const waData = await waRes.json();
        if (waData.success && waData.settings) {
          setWaGatewayUrl(waData.settings.gatewayUrl || '');
          setWaApiToken(waData.settings.apiToken || '');
          setWaSenderNumber(waData.settings.senderNumber || '');
          if (waData.settings.templates) {
            if (waData.settings.templates.student) setTplStudent(waData.settings.templates.student);
            if (waData.settings.templates.parent) setTplParent(waData.settings.templates.parent);
            if (waData.settings.templates.attendance) setTplAttendance(waData.settings.templates.attendance);
            if (waData.settings.templates.absent) setTplAbsent(waData.settings.templates.absent);
          }
        }

        // Fetch custom portrait presence
        const portRes = await fetch('/api/settings/branding?type=portrait', { method: 'HEAD' });
        if (portRes.ok) {
          setPortraitUrl('/api/settings/branding?type=portrait&t=' + Date.now());
        }

        // Fetch custom logo presence
        const logoCheck = await fetch('/api/settings/branding?type=logo', { method: 'HEAD' });
        if (logoCheck.ok) {
          setLogoUrl('/api/settings/branding?type=logo&t=' + Date.now());
        }

        // Fetch logged-in user profile details
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.success && meData.user) {
          setAccountName(meData.user.name || '');
          setAccountPhone(meData.user.phone || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSettings(false);
      }
    }
    load();
  }, []);

  const patchSettings = async (patch: Record<string, any>) => {
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
  };

  const handleToggleRegistration = async () => {
    const newVal = !isRegistrationOpen;
    setIsRegistrationOpen(newVal);
    await patchSettings({ isRegistrationOpen: newVal });
  };

  const handleToggleWhatsApp = async () => {
    const newVal = !enableWhatsApp;
    setEnableWhatsApp(newVal);
    await patchSettings({ enableWhatsApp: newVal });
  };

  const handleSaveIdentity = async () => {
    setSaveMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          platformName,
          contactPhone,
          contactWhatsapp,
          motivationQuote
        }),
      });
      const data = await res.json();
      setSaveMsg(data.success ? 'تم حفظ إعدادات الهوية بنجاح ✅' : 'فشل الحفظ ❌');
    } catch {
      setSaveMsg('خطأ في الاتصال');
    }
  };


  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountMsg('');
    if (accountPassword && accountPassword !== accountConfirmPassword) {
      setAccountMsg('كلمتا المرور غير متطابقتين ❌');
      setAccountMsgOk(false);
      return;
    }
    setAccountSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName,
          phone: accountPhone,
          password: accountPassword || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAccountMsg('تم حفظ إعدادات الحساب بنجاح ✅');
        setAccountMsgOk(true);
        setAccountPassword('');
        setAccountConfirmPassword('');
        // Trigger custom event to notify Sidebar/Navbar
        window.dispatchEvent(new Event('maestro-profile-updated'));
      } else {
        setAccountMsg(data.error || 'حدث خطأ أثناء حفظ التعديلات ❌');
        setAccountMsgOk(false);
      }
    } catch {
      setAccountMsg('خطأ في الاتصال بالخادم ❌');
      setAccountMsgOk(false);
    } finally {
      setAccountSaving(false);
    }
  };

  const handleExportBackup = () => {
    window.open('/api/backup', '_blank');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        });
        const data = await res.json();
        setRestoreMsg(data.success ? 'تمت استعادة النسخة الاحتياطية بنجاح! ✅' : (data.error || 'فشلت الاستعادة'));
      };
      reader.readAsText(file);
    } catch {
      setRestoreMsg('خطأ في تنسيق ملف النسخة الاحتياطية');
    }
  };

  const tabs = [
    { id: 'registration', label: '⚙️ تحكم الحجز والتسجيل' },
    { id: 'identity', label: '🎨 هوية المنصة' },
    { id: 'branding', label: '🖼️ الصور والشعار' },
    { id: 'account', label: '👤 إعدادات الحساب' },
    { id: 'whatsapp', label: '💬 إعدادات الواتساب' },
    { id: 'backup', label: '📦 النسخ الاحتياطي' },
  ];

  return (
    <div className="space-y-8">
      <HeroHeader
        title="إعدادات المنصة والهوية"
        badge="لوحة التحكم الفاخرة - المايسترو Premium"
        subtitle="التحكم في فتح وإغلاق باب الحجز والتسجيل، إعدادات الحساب، هوية المنصة، والنسخ الاحتياطي."
      />

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
              activeTab === tab.id
                ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Registration Gate */}
      {activeTab === 'registration' && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-2xl">
          <div>
            <h3 className="font-bold text-lg text-white mb-1">التحكم في فتح وإغلاق باب الحجز المباشر</h3>
            <p className="text-slate-400 text-xs">عند إغلاق التسجيل، تظهر للزوار رسالة توضح أن الحجز مغلق حالياً.</p>
          </div>

          {loadingSettings ? (
            <div className="text-center text-slate-400 py-4 text-sm">جارٍ تحميل الإعدادات...</div>
          ) : (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-sm">حالة استقبال طلبات الحجز</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {isRegistrationOpen ? '☑ التسجيل مفتوح الآن للطلاب الجدد' : '☐ التسجيل مغلق مؤقتاً'}
                </p>
              </div>
              <button
                onClick={handleToggleRegistration}
                className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all border ${
                  isRegistrationOpen
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                }`}
              >
                {isRegistrationOpen ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                <span>{isRegistrationOpen ? 'مفتوح (اضغط للإغلاق)' : 'مغلق (اضغط للفتح)'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Identity */}
      {activeTab === 'identity' && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المنصة</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full glass-input p-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المدرس الرئيسي</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full glass-input p-3 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم هاتف التواصل والاتصال</label>
              <input
                type="text"
                placeholder="مثال: 01012345678"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full glass-input p-3 text-sm text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم الواتساب للتواصل مباشر</label>
              <input
                type="text"
                placeholder="مثال: 201012345678"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                className="w-full glass-input p-3 text-sm text-left"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">العبارة التحفيزية (تظهر في صفحة تسجيل الدخول)</label>
            <textarea
              rows={3}
              placeholder="اكتب هنا عبارة مميزة لتحفيز الطلاب مثل: سر النجاح هو الثبات على السعي 🌟"
              value={motivationQuote}
              onChange={(e) => setMotivationQuote(e.target.value)}
              className="w-full glass-input p-3 text-sm resize-none"
            />
          </div>
          {saveMsg && <p className="text-xs text-emerald-400 font-bold">{saveMsg}</p>}
          <button onClick={handleSaveIdentity} className="glass-button-primary px-8 py-3 font-bold text-sm rounded-2xl">
            حفظ إعدادات الهوية 💾
          </button>
        </div>
      )}


      {/* Tab: Branding – Smart Colour System */}
      {activeTab === 'branding' && (
        <div className="space-y-8 max-w-2xl">

          {/* ── Portrait Upload ── */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-purple-500/20 space-y-5">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-400" />
                صورة خلفية المستر (الـ Overlay)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                ارفع صورتك — المنصة ستستخرج الألوان تلقائياً وتعرض عليك 5 ثيمات مقترحة بألوان الصورة ✨
              </p>
            </div>

            {/* ── Transparent Image Recommendation Banner ── */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-purple-200">💡 نصيحة للحصول على أفضل مظهر مودرن واحترافي:</p>
                <p className="text-slate-300 leading-relaxed">
                  يُفضل رفع <span className="text-purple-300 font-bold">صورة مفرغة بدون خلفية (PNG أو WebP Transparent)</span> لدمج أطرافها بسلاسة تامة مع خلفية المنصة الداكنة وتأثيرات الإضاءة.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Flexible Responsive Preview with Fixed Aspect Ratio (No Distortion) */}
              <div className="relative w-32 sm:w-40 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-purple-500/40 bg-gradient-to-b from-slate-900 to-slate-950 shadow-inner flex-shrink-0 flex items-end justify-center p-1.5">
                {/* Background grid pattern simulation */}
                <div className="absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:12px_12px] opacity-15 pointer-events-none" />

                {(localPreviewUrl || portraitUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={localPreviewUrl ?? portraitUrl!}
                    alt="صورة المستر"
                    className="w-full h-full object-contain object-bottom relative z-10 transition-transform duration-300"
                    style={{
                      transform: `scale(${portraitScale})`,
                      transformOrigin: 'center bottom',
                      opacity: portraitOpacity > 0.4 ? portraitOpacity : 0.6, // minimum visibility for preview card
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 relative z-10">
                    <ImageIcon className="w-8 h-8 text-slate-600" />
                    <p className="text-[11px] text-slate-500 text-center font-medium">لا توجد صورة مخصصة</p>
                  </div>
                )}
                {extractingColors && (
                  <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center gap-1.5 backdrop-blur-xs">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    <span className="text-[10px] text-purple-300 font-bold">استخراج الألوان...</span>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1 w-full space-y-3">
                {portraitMsg && (
                  <div className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl ${
                    portraitMsg.ok
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {portraitMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {portraitMsg.text}
                  </div>
                )}

                {/* Step 1 – pick file */}
                <button
                  onClick={() => portraitInputRef.current?.click()}
                  disabled={portraitUploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300 text-sm font-bold transition-all disabled:opacity-50"
                >
                  {portraitUploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الرفع والمعالجة...</>
                    : <><Upload className="w-4 h-4" /> رفع صورة جديدة (PNG / WebP)</>}
                </button>
                <input
                  ref={portraitInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    // 1. instant local preview + extract colours
                    await extractFromFile(f);
                    // 2. upload to server
                    await handleBrandingUpload(f, 'portrait');
                    e.target.value = '';
                  }}
                />

                {/* Re-extract button (if portrait already set) */}
                {(portraitUrl || localPreviewUrl) && !extractingColors && (
                  <button
                    onClick={async () => {
                      const src = localPreviewUrl ?? portraitUrl!;
                      setExtractingColors(true);
                      const colors = await extractDominantColors(src);
                      setPalettes(generatePalettes(colors));
                      setExtractingColors(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> إعادة استخراج الألوان من الصورة الحالية
                  </button>
                )}

                <p className="text-[11px] text-slate-500">PNG · JPG · WEBP — الحد الأقصى: 5 ميجابايت</p>
              </div>
            </div>

            {/* Live Opacity and Scale Sliders */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">📐 تعديل وضعية وحجم وشفافية الصورة على المنصة:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">درجة الشفافية:</span>
                    <span className="text-purple-400 font-mono">{(portraitOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.80"
                    step="0.01"
                    value={portraitOpacity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setPortraitOpacity(val);
                      // Live preview before saving via custom event
                      window.dispatchEvent(new CustomEvent('maestro-portrait-live-preview', {
                        detail: { opacity: val }
                      }));
                    }}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">مقياس حجم الصورة (التكبير):</span>
                    <span className="text-purple-400 font-mono">{(portraitScale * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={portraitScale}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setPortraitScale(val);
                      // Live preview scale before saving via custom event
                      window.dispatchEvent(new CustomEvent('maestro-portrait-live-preview', {
                        detail: { scale: val }
                      }));
                    }}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Position Selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 block">موضع عرض الصورة على الشاشة:</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPortraitPosition('side');
                      // Live preview position via custom event
                      window.dispatchEvent(new CustomEvent('maestro-portrait-live-preview', {
                        detail: { position: 'side' }
                      }));
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all duration-300 ${
                      portraitPosition === 'side'
                        ? 'border-purple-500 bg-purple-500/10 text-white shadow-lg shadow-purple-500/10'
                        : 'border-white/10 bg-slate-950/40 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <Layout className="w-4 h-4" />
                    على الجانب (الافتراضي)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPortraitPosition('center');
                      // Live preview position via custom event
                      window.dispatchEvent(new CustomEvent('maestro-portrait-live-preview', {
                        detail: { position: 'center' }
                      }));
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all duration-300 ${
                      portraitPosition === 'center'
                        ? 'border-purple-500 bg-purple-500/10 text-white shadow-lg shadow-purple-500/10'
                        : 'border-white/10 bg-slate-950/40 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <Maximize2 className="w-4 h-4" />
                    في منتصف الشاشة
                  </button>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        portraitOpacity,
                        portraitScale,
                        portraitPosition
                      })
                    });
                    if (res.ok) {
                      setPortraitMsg({ text: 'تم حفظ أبعاد ووضعية الصورة بنجاح ✅', ok: true });
                      window.dispatchEvent(new Event('maestro-portrait-config-updated'));
                    }
                  } catch {
                    setPortraitMsg({ text: 'حدث خطأ أثناء حفظ التعديلات ❌', ok: false });
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-500/20"
              >
                💾 حفظ أبعاد الشفافية والحجم والوضعية
              </button>
            </div>
          </div>


          {/* ── Smart Colour Palettes ── */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-400" />
                  ثيمات الألوان الذكية
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {extractingColors
                    ? '🔍 جارٍ تحليل الصورة واستخراج الألوان...'
                    : 'اختر ثيماً — التغيير مباشر للمعاينة، اضغط حفظ لتطبيقه على المنصة'}
                </p>
              </div>
              {extractingColors && <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />}
            </div>

            {extractingColors ? (
              // Loading skeleton
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <ColorPaletteSelector
                palettes={palettes}
                onSaved={() => setPortraitMsg({ text: 'تم حفظ الثيم وتطبيقه ✅', ok: true })}
              />
            )}
          </div>

          {/* ── Logo Upload ── */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-yellow-500/20 space-y-5">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-yellow-400" />
                شعار المنصة (اللوجو)
              </h3>
              <p className="text-xs text-slate-400 mt-1">يظهر في صفحة تسجيل الدخول وصفحة اختيار الدور. أفضل: PNG مربعة شفافة.</p>
            </div>

            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-yellow-500/30 bg-slate-900 flex items-center justify-center flex-shrink-0">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={logoUrl} 
                    alt="الشعار" 
                    className="w-full h-full object-contain p-1 transition-transform duration-300"
                    style={{ transform: `scale(${logoScale})` }} 
                  />
                ) : (
                  <div className="text-center">
                    {/* fallback to dynamic API image if static fails */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src="/api/settings/branding?type=logo" 
                      alt="" 
                      className="w-full h-full object-contain p-1"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                    />
                    <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-[10px] text-slate-600 mt-1">لا يوجد شعار</p>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                {logoMsg && (
                  <div className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl ${
                    logoMsg.ok
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {logoMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {logoMsg.text}
                  </div>
                )}
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-yellow-500/40 hover:border-yellow-400 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-300 text-sm font-bold transition-all disabled:opacity-50"
                >
                  {logoUploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الرفع...</>
                    : <><Upload className="w-4 h-4" /> اختر شعار المنصة</>}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBrandingUpload(f, 'logo');
                    e.target.value = '';
                  }}
                />
                <p className="text-[11px] text-slate-500">PNG · JPG · WEBP — الحد الأقصى: 5 ميجابايت</p>
              </div>
            </div>

            {/* Live Logo Scale Slider */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">مقياس حجم الشعار (اللوجو):</span>
                  <span className="text-yellow-400 font-mono">{(logoScale * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={logoScale}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLogoScale(val);
                    // Live preview logo in settings page preview wrapper
                    const imgPreview = document.querySelector('img[alt="الشعار"]');
                    if (imgPreview) {
                      (imgPreview as HTMLElement).style.transform = `scale(${val})`;
                    }
                    // Live preview sidebar logo
                    const sidebarLogo = document.querySelector('img[alt="اللوجو"]');
                    if (sidebarLogo) {
                      (sidebarLogo as HTMLElement).style.transform = `scale(${val})`;
                    }
                  }}
                  className="w-full accent-yellow-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ logoScale })
                    });
                    if (res.ok) {
                      setLogoMsg({ text: 'تم حفظ حجم الشعار بنجاح ✅', ok: true });
                      window.dispatchEvent(new Event('maestro-logo-updated'));
                    }
                  } catch {
                    setLogoMsg({ text: 'حدث خطأ أثناء حفظ التعديلات ❌', ok: false });
                  }
                }}
                className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-yellow-600 hover:bg-yellow-500 text-white transition-all shadow-md shadow-yellow-500/20"
              >
                💾 حفظ حجم الشعار
              </button>
            </div>
          </div>


          {/* Tips */}
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300 space-y-1.5">
            <p className="font-bold text-blue-200">💡 نصائح لأفضل نتيجة:</p>
            <p>• ارفع صورة المستر أولاً — المنصة تستخرج الألوان تلقائياً وتقترح ثيمات مناسبة</p>
            <p>• اختر الثيم المناسب وشاهد التغيير المباشر، ثم اضغط «حفظ» لتطبيقه</p>
            <p>• صورة PNG بخلفية شفافة أو خلفية داكنة قريبة من لون المنصة تعطي أفضل نتيجة</p>
            <p>• الثيم يُحفظ في المتصفح ويُطبَّق تلقائياً في كل مرة تفتح المنصة</p>
          </div>
        </div>
      )}

      {/* Tab: Account Settings */}
      {activeTab === 'account' && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-2xl">
          <div>
            <h3 className="font-bold text-lg text-white">إعدادات الحساب الشخصي</h3>
            <p className="text-slate-400 text-xs">يمكنك هنا تعديل اسم المستخدم الخاص بك أو رقم الهاتف وتعيين كلمة مرور جديدة لحسابك.</p>
          </div>

          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">الاسم بالكامل</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full glass-input p-3 text-sm"
                placeholder="مثال: الأستاذ أحمد راضي"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المستخدم أو رقم الهاتف</label>
              <input
                type="text"
                required
                value={accountPhone}
                onChange={(e) => setAccountPhone(e.target.value)}
                className="w-full glass-input p-3 text-sm text-left font-mono"
                dir="ltr"
                placeholder="مثال: 0100000000"
              />
              <p className="text-[10px] text-slate-500 mt-1">يُستخدم اسم المستخدم أو رقم الهاتف هذا لتسجيل الدخول إلى لوحة التحكم الخاصة بك.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  className="w-full glass-input p-3 text-sm text-left font-mono"
                  dir="ltr"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  value={accountConfirmPassword}
                  onChange={(e) => setAccountConfirmPassword(e.target.value)}
                  className="w-full glass-input p-3 text-sm text-left font-mono"
                  dir="ltr"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            {accountMsg && (
              <p className={`text-xs font-bold ${accountMsgOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                {accountMsg}
              </p>
            )}

            <button 
              type="submit" 
              disabled={accountSaving}
              className="glass-button-primary px-8 py-3 font-bold text-sm rounded-2xl flex items-center gap-2"
            >
              {accountSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  حفظ إعدادات الحساب 💾
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Tab: WhatsApp */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6 max-w-2xl">

          {/* Gateway Connection */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">📞 إعداد HTTP Gateway للواتساب</h3>
                <p className="text-xs text-slate-400 mt-1">يعمل مع أي مزود خدمة (مثل: UltraMsg, Twilio, WApi, أي Gateway HTTP)</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${ waTestStatus === 'success' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : waTestStatus === 'error' ? 'bg-rose-400' : 'bg-slate-600'}`} />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Gateway URL</label>
                <input
                  type="url"
                  value={waGatewayUrl}
                  onChange={(e) => setWaGatewayUrl(e.target.value)}
                  placeholder="https://api.ultramsg.com/instance12345/messages/chat"
                  className="w-full glass-input p-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">API Token / Secret Key</label>
                <input
                  type="text"
                  value={waApiToken}
                  onChange={(e) => setWaApiToken(e.target.value)}
                  placeholder="your_api_token_here"
                  className="w-full glass-input p-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم المرسل (Sender Number)</label>
                <input
                  type="text"
                  value={waSenderNumber}
                  onChange={(e) => setWaSenderNumber(e.target.value)}
                  placeholder="201000000000"
                  className="w-full glass-input p-3 font-mono text-xs"
                />
              </div>
            </div>

            {waTestMsg && (
              <p className={`text-xs font-semibold p-3 rounded-xl ${ waTestStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {waTestMsg}
              </p>
            )}

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={async () => {
                  setWaTestStatus('testing');
                  setWaTestMsg('جارٍ الاختبار...');
                  try {
                    const res = await fetch('/api/settings/whatsapp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'test', to: waSenderNumber }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setWaTestStatus('success');
                      setWaTestMsg('✅ تم إرسال رسالة اختبارية بنجاح!');
                    } else {
                      setWaTestStatus('error');
                      setWaTestMsg('❌ ' + (data.error || 'فشل الاتصال'));
                    }
                  } catch {
                    setWaTestStatus('error');
                    setWaTestMsg('❌ خطأ في الاتصال بالخادم');
                  }
                }}
                disabled={waTestStatus === 'testing' || !waGatewayUrl || !waApiToken}
                className="px-5 py-2.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {waTestStatus === 'testing' ? 'جارٍ الاختبار...' : '📡 اختبار الاتصال'}
              </button>
              <button
                onClick={async () => {
                  setWaSaving(true);
                  try {
                    const res = await fetch('/api/settings/whatsapp', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        gatewayUrl: waGatewayUrl,
                        apiToken: waApiToken,
                        senderNumber: waSenderNumber,
                        templates: { student: tplStudent, parent: tplParent, attendance: tplAttendance, absent: tplAbsent },
                      }),
                    });
                    const data = await res.json();
                    if (data.success) setSaveMsg('تم حفظ إعدادات الواتساب بنجاح ✅');
                    else setSaveMsg('فشل الحفظ ❌');
                    setTimeout(() => setSaveMsg(''), 3000);
                  } catch { setSaveMsg('خطأ في الاتصال'); }
                  finally { setWaSaving(false); }
                }}
                disabled={waSaving}
                className="glass-button-primary px-6 py-2.5 font-bold text-xs rounded-xl disabled:opacity-50"
              >
                {waSaving ? 'جارٍ الحفظ...' : '💾 حفظ إعدادات البوابة'}
              </button>
            </div>
          </div>

          {/* Templates Manager */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
            <div>
              <h3 className="font-bold text-lg text-white">📝 مدير قوالب رسائل الواتساب</h3>
              <p className="text-xs text-slate-400 mt-1">يمكن استخدام المتغيرات الديناميكية بين قوسين مربعين مثل [student_name]</p>
            </div>

            {/* Student Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-purple-300">🎓 قالب الترحيب بالطالب</label>
                <div className="flex gap-1 flex-wrap">
                  {['[username]', '[password]', '[student_name]'].map(v => (
                    <span key={v} className="text-[9px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded font-mono cursor-pointer" onClick={() => setTplStudent(p => p + v)}>{v}</span>
                  ))}
                </div>
              </div>
              <textarea
                rows={4}
                value={tplStudent}
                onChange={(e) => setTplStudent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-white text-xs font-mono resize-y focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Parent Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-emerald-300">👨‍👩‍👦 قالب الترحيب بولي الأمر</label>
                <div className="flex gap-1 flex-wrap">
                  {['[username]', '[password]', '[student_name]', '[parent_name]'].map(v => (
                    <span key={v} className="text-[9px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded font-mono cursor-pointer" onClick={() => setTplParent(p => p + v)}>{v}</span>
                  ))}
                </div>
              </div>
              <textarea
                rows={4}
                value={tplParent}
                onChange={(e) => setTplParent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-white text-xs font-mono resize-y focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Attendance Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-blue-300">📅 قالب تنبيه الحضور</label>
                <div className="flex gap-1 flex-wrap">
                  {['[student_name]', '[status]', '[time]'].map(v => (
                    <span key={v} className="text-[9px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded font-mono cursor-pointer" onClick={() => setTplAttendance(p => p + v)}>{v}</span>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={tplAttendance}
                onChange={(e) => setTplAttendance(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-white text-xs font-mono resize-y focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Absence Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-rose-300">📅 قالب تنبيه الغياب</label>
                <div className="flex gap-1 flex-wrap">
                  {['[student_name]', '[time]'].map(v => (
                    <span key={v} className="text-[9px] px-1.5 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/20 rounded font-mono cursor-pointer" onClick={() => setTplAbsent(p => p + v)}>{v}</span>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={tplAbsent}
                onChange={(e) => setTplAbsent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-white text-xs font-mono resize-y focus:border-rose-500 focus:outline-none"
              />
            </div>

            {saveMsg && <p className="text-xs font-bold text-emerald-400">{saveMsg}</p>}
            <button
              onClick={async () => {
                setWaSaving(true);
                try {
                  const res = await fetch('/api/settings/whatsapp', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      gatewayUrl: waGatewayUrl,
                      apiToken: waApiToken,
                      senderNumber: waSenderNumber,
                      templates: { student: tplStudent, parent: tplParent, attendance: tplAttendance },
                    }),
                  });
                  const data = await res.json();
                  if (data.success) setSaveMsg('تم حفظ جميع القوالب بنجاح ✅');
                  setTimeout(() => setSaveMsg(''), 3000);
                } catch { setSaveMsg('خطأ في الاتصال'); }
                finally { setWaSaving(false); }
              }}
              disabled={waSaving}
              className="glass-button-primary px-8 py-3 font-bold text-sm rounded-2xl disabled:opacity-50"
            >
              {waSaving ? 'جارٍ الحفظ...' : '💾 حفظ جميع القوالب'}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Backup */}
      {activeTab === 'backup' && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-2xl">
          <div>
            <h3 className="font-bold text-lg text-white">تصدير واستعادة نسخة احتياطية</h3>
            <p className="text-xs text-slate-400 mt-1">تصدير كافة البيانات في ملف JSON واستعادتها في أي وقت</p>
          </div>
          {restoreMsg && (
            <p className="text-xs text-emerald-400 font-bold p-3 bg-white/5 rounded-xl border border-white/10">{restoreMsg}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-3 text-center">
              <h4 className="font-bold text-white text-sm">تصدير النسخة الاحتياطية</h4>
              <p className="text-xs text-slate-400">تحميل كافة البيانات في ملف JSON</p>
              <button
                onClick={handleExportBackup}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
              >
                تنزيل النسخة الآن 📥
              </button>
            </div>
            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-3 text-center">
              <h4 className="font-bold text-white text-sm">استعادة النسخة الاحتياطية</h4>
              <p className="text-xs text-slate-400">رفع ملف JSON لاسترجاع قواعد البيانات</p>
              <label className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition block cursor-pointer">
                اختر ملف النسخة 📤
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
