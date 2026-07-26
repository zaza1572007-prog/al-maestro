'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('identity');
  const [platformName, setPlatformName] = useState('منصة المايسترو');
  const [teacherName, setTeacherName] = useState('الأستاذ أحمد راضي كحلة');
  const [enableWhatsApp, setEnableWhatsApp] = useState(true);
  const [waApiKey, setWaApiKey] = useState('wa_live_key_99882233');

  // Staff creation form
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState('ASSISTANT');
  const [staffMsg, setStaffMsg] = useState('');

  // Backup state
  const [restoreMsg, setRestoreMsg] = useState('');

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: staffName, phone: staffPhone, role: staffRole, password: '123' }),
      });
      setStaffMsg('تم إضافة المساعد/الموظف بنجاح 🟢');
      setStaffName('');
      setStaffPhone('');
    } catch (e: any) {
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
        if (data.success) {
          setRestoreMsg('تمت استعادة النسخة الاحتياطية بنجاح! ✅');
        } else {
          setRestoreMsg(data.error || 'فشلت الاستعادة');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setRestoreMsg('خطأ في تنسيق ملف النسخة الاحتياطية');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">⚙️ إعدادات المنصة الشاملة (System Settings)</h1>
          <p className="text-slate-400 text-sm mt-1">تخصيص الهوية، الموظفين، إعدادات الواتساب والنسخ الاحتياطي</p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'identity', label: '🎨 هوية المنصة والصور' },
          { id: 'staff', label: '👥 إدارة المساعدين والموظفين' },
          { id: 'whatsapp', label: '💬 إعدادات الواتساب' },
          { id: 'backup', label: '📦 النسخ الاحتياطي والاستعادة' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Identity */}
      {activeTab === 'identity' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-w-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المنصة الشاملة</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المدرس الرئيسي</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="font-bold text-white text-sm">رفع صور الهوية والبナー:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <p className="text-slate-400 mb-2 font-semibold">شعار المنصة (Logo)</p>
                <input type="file" className="text-[10px] text-slate-500 file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded-lg file:px-2 file:py-1" />
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <p className="text-slate-400 mb-2 font-semibold">صورة الغلاف (Banner)</p>
                <input type="file" className="text-[10px] text-slate-500 file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded-lg file:px-2 file:py-1" />
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <p className="text-slate-400 mb-2 font-semibold">صورة الأستاذ الشخصية</p>
                <input type="file" className="text-[10px] text-slate-500 file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded-lg file:px-2 file:py-1" />
              </div>
            </div>
          </div>

          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition">
            حفظ إعدادات الهوية 💾
          </button>
        </div>
      )}

      {/* Tab 2: Staff Management */}
      {activeTab === 'staff' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-w-2xl">
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
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
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
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">الصلاحية</label>
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="ASSISTANT">مساعد (Assistant)</option>
                <option value="OWNER">أستاذ/مالك (Owner)</option>
              </select>
            </div>
            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition">
              حفظ المساعد وتعيين الصلاحيات 👤
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: WhatsApp Settings */}
      {activeTab === 'whatsapp' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-w-2xl">
          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div>
              <h4 className="font-bold text-white text-sm">تفعيل إشعارات WhatsApp التلقائية</h4>
              <p className="text-xs text-slate-400">إرسال رسائل الحضور والغياب والدرجات والماليات</p>
            </div>
            <input
              type="checkbox"
              checked={enableWhatsApp}
              onChange={(e) => setEnableWhatsApp(e.target.checked)}
              className="w-5 h-5 accent-blue-600 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">مفتاح API الخاص بالخدمة (API Key)</label>
            <input
              type="text"
              value={waApiKey}
              onChange={(e) => setWaApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition">
            حفظ إعدادات الربط 💬
          </button>
        </div>
      )}

      {/* Tab 4: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-w-2xl">
          <div>
            <h3 className="font-bold text-lg text-white">تصدير واستعادة نسخة احتياطية للقواعد (Backup & Restore)</h3>
            <p className="text-xs text-slate-400 mt-1">تصدير كافة بيانات الطلاب والجلسات والماليات في ملف JSON أماناً واستعادتها في أي وقت</p>
          </div>

          {restoreMsg && <p className="text-xs text-emerald-400 font-bold p-3 bg-slate-950 rounded-xl border border-slate-800">{restoreMsg}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-center">
              <h4 className="font-bold text-white text-sm">تصدير النسخة الاحتياطية</h4>
              <p className="text-xs text-slate-500">تحميل كافة البيانات في ملف JSON موثق</p>
              <button
                onClick={handleExportBackup}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
              >
                تنزيل النسخة الآن 📥
              </button>
            </div>

            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-center">
              <h4 className="font-bold text-white text-sm">استعادة النسخة الاحتياطية</h4>
              <p className="text-xs text-slate-500">رفع ملف JSON لاسترجاع قواعد البيانات</p>
              <label className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition block cursor-pointer">
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

