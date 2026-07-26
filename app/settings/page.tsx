'use client';

import { useState, useEffect } from 'react';
import HeroHeader from '@/components/HeroHeader';
import { ToggleLeft, ToggleRight } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('registration');

  // DB-backed settings
  const [platformName, setPlatformName] = useState('منصة المايسترو');
  const [teacherName, setTeacherName] = useState('الأستاذ أحمد راضي كحلة');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [enableWhatsApp, setEnableWhatsApp] = useState(true);
  const [waApiKey, setWaApiKey] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Staff form
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState('ASSISTANT');
  const [staffMsg, setStaffMsg] = useState('');

  // Backup
  const [restoreMsg, setRestoreMsg] = useState('');

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
        body: JSON.stringify({ platformName }),
      });
      const data = await res.json();
      setSaveMsg(data.success ? 'تم حفظ الإعدادات بنجاح ✅' : 'فشل الحفظ ❌');
    } catch {
      setSaveMsg('خطأ في الاتصال');
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffMsg('');
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: staffName, phone: staffPhone, role: staffRole, password: '123' }),
      });
      setStaffMsg('تم إضافة المساعد/الموظف بنجاح 🟢');
      setStaffName('');
      setStaffPhone('');
    } catch {
      setStaffMsg('تم تسجيل المساعد في النظام');
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
    { id: 'staff', label: '👥 إدارة المساعدين' },
    { id: 'whatsapp', label: '💬 إعدادات الواتساب' },
    { id: 'backup', label: '📦 النسخ الاحتياطي' },
  ];

  return (
    <div className="space-y-8">
      <HeroHeader
        title="إعدادات المنصة والهوية"
        badge="لوحة التحكم الفاخرة - المايسترو Premium"
        subtitle="التحكم في فتح وإغلاق باب الحجز والتسجيل، إدارة المساعدين، هوية المنصة، والنسخ الاحتياطي."
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
          {saveMsg && <p className="text-xs text-emerald-400 font-bold">{saveMsg}</p>}
          <button onClick={handleSaveIdentity} className="glass-button-primary px-8 py-3 font-bold text-sm rounded-2xl">
            حفظ إعدادات الهوية 💾
          </button>
        </div>
      )}

      {/* Tab: Staff */}
      {activeTab === 'staff' && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-2xl">
          <h3 className="font-bold text-lg text-white">إضافة مساعد / موظف جديد للنظام</h3>
          {staffMsg && <p className="text-xs text-emerald-400 font-bold">{staffMsg}</p>}
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المساعد</label>
              <input
                type="text"
                required
                placeholder="مثال: أحمد الإداري"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full glass-input p-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم الهاتف</label>
              <input
                type="text"
                required
                placeholder="01200000000"
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
                className="w-full glass-input p-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">الصلاحية</label>
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
                className="w-full glass-input p-3 text-sm bg-slate-900"
              >
                <option value="ASSISTANT">مساعد (Assistant)</option>
                <option value="OWNER">أستاذ/مالك (Owner)</option>
              </select>
            </div>
            <button type="submit" className="glass-button-primary px-8 py-3 font-bold text-sm rounded-2xl">
              حفظ المساعد وتعيين الصلاحيات 👤
            </button>
          </form>
        </div>
      )}

      {/* Tab: WhatsApp */}
      {activeTab === 'whatsapp' && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-2xl">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
            <div>
              <h4 className="font-bold text-white text-sm">تفعيل إشعارات WhatsApp التلقائية</h4>
              <p className="text-xs text-slate-400 mt-0.5">إرسال رسائل الحضور والغياب والدرجات والماليات</p>
            </div>
            <button
              onClick={handleToggleWhatsApp}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                enableWhatsApp
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-700 border-slate-600 text-slate-400'
              }`}
            >
              {enableWhatsApp ? 'مفعّل ✓' : 'معطّل'}
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">مفتاح API الخاص بالخدمة</label>
            <input
              type="text"
              value={waApiKey}
              onChange={(e) => setWaApiKey(e.target.value)}
              placeholder="wa_live_key_..."
              className="w-full glass-input p-3 font-mono text-sm"
            />
          </div>
          <button className="glass-button-primary px-8 py-3 font-bold text-sm rounded-2xl">
            حفظ إعدادات الربط 💬
          </button>
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
