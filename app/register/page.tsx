'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Users,
  Check,
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function RegisterPage() {
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [step, setStep] = useState(1);

  // Real Options from DB
  const [stages, setStages] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form State
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentGender, setStudentGender] = useState('ذكر');

  const [parentName, setParentName] = useState('');
  const [parentRelation, setParentRelation] = useState('Father');
  const [parentPhone, setParentPhone] = useState('');
  const [parentWhatsapp, setParentWhatsapp] = useState('');
  const [parentExtraPhone, setParentExtraPhone] = useState('');

  // Live Check States
  const [checkingParent, setCheckingParent] = useState(false);
  const [existingParentData, setExistingParentData] = useState<any>(null);
  const [phoneErrorMessage, setPhoneErrorMessage] = useState('');
  const [pendingRequestError, setPendingRequestError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Fetch Real Database Stages, Groups & Registration Status
  useEffect(() => {
    async function fetchRealOptions() {
      try {
        const [optRes, settingsRes] = await Promise.all([
          fetch('/api/registration/options'),
          fetch('/api/settings'),
        ]);
        const optData = await optRes.json();
        const settingsData = await settingsRes.json();

        if (optData.success) {
          setStages(optData.stages || []);
          setGroups(optData.groups || []);
        }
        if (settingsData.success && settingsData.settings) {
          setIsRegistrationOpen(settingsData.settings.isRegistrationOpen ?? true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOptions(false);
      }
    }
    fetchRealOptions();
  }, []);

  const currentGroups = groups.filter((g) => g.academicStageId === selectedStage);

  // Perform Live Phone Check when proceeding from Parent Step
  const handleCheckParentPhone = async () => {
    setPhoneErrorMessage('');
    setPendingRequestError('');
    setCheckingParent(true);

    try {
      const res = await fetch('/api/registration/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPhone, studentPhone }),
      });
      const data = await res.json();

      if (data.exists) {
        if (data.type === 'STUDENT_EXISTS') {
          setPhoneErrorMessage(data.message);
          setCheckingParent(false);
          return false;
        }
        if (data.type === 'PENDING_REQUEST_EXISTS') {
          setPendingRequestError(data.message);
          setCheckingParent(false);
          return false;
        }
        if (data.type === 'PARENT_EXISTS') {
          setExistingParentData(data.parent);
          setParentName(data.parent.name);
        }
      } else {
        setExistingParentData(null);
      }
      setCheckingParent(false);
      return true;
    } catch (err) {
      setCheckingParent(false);
      return true;
    }
  };

  const handleNextFromStep4 = async () => {
    const valid = await handleCheckParentPhone();
    if (valid) {
      setStep(5);
    }
  };

  const handleSubmitRegistration = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          studentPhone,
          studentGender,
          academicStageId: selectedStage,
          groupId: selectedGroup?.id,
          parentName,
          parentRelation,
          parentPhone,
          parentWhatsapp,
          parentExtraPhone,
          isParentExisting: Boolean(existingParentData),
        }),
      });

      if (res.ok) {
        setSubmittedSuccess(true);
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء الإرسال');
      }
    } catch (err) {
      alert('فشل الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRegistrationOpen) {
    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="ambient-glow-1"></div>
        <div className="ambient-glow-2"></div>
        <div className="glass-panel p-10 max-w-lg rounded-3xl border border-white/15 shadow-2xl z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">التسجيل غير متاح حاليًا</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            تم إغلاق باب استقبال طلبات الحجز والتسجيل مؤقتاً بواسطة الإدارة. سيتم فتح باب الحجز المباشر قريباً.
          </p>
          <Link href="/select-role" className="glass-button-primary px-6 py-3 text-sm font-bold inline-block">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="ambient-glow-1"></div>
        <div className="ambient-glow-2"></div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-10 max-w-xl rounded-3xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/20 z-10 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-lg">
            <Check className="w-10 h-10" />
          </div>
          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            الحالة: Pending Approval (قيد المراجعة)
          </span>
          <h1 className="text-2xl font-black text-white mt-4 mb-2">تم إرسال طلب التسجيل بنجاح! 🎉</h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            شكراً لتسجيلك في منصة المايسترو. تم تسليم الطلب بنجاح ووضعه حقيقياً في لوحة التحكم لمراجعته من قبل أ/ أحمد راضي كحلة.
          </p>
          <Link href="/select-role" className="glass-button-primary px-8 py-3.5 text-sm font-bold inline-block">
            العودة لشاشة الاختيار
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-white p-4 md:p-8 relative overflow-hidden flex flex-col justify-between">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <div className="max-w-4xl mx-auto w-full z-10">
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>بوابة الحجز والتسجيل المباشر - منصة المايسترو</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white">استمارة الالتحاق بصفوف المايسترو</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">الأستاذ أحمد راضي كحلة - خطوات بسيطة لضمان مقعدك</p>
        </div>

        {/* Wizard Steps Progress Bar */}
        <div className="flex items-center justify-between mb-8 glass-panel p-4 rounded-2xl border border-white/10 text-xs font-bold">
          {[1, 2, 3, 4, 5].map((sNum) => {
            const labels = ['المرحلة', 'المجموعة', 'الطالب', 'ولي الأمر', 'المراجعة'];
            const isActive = step === sNum;
            const isPassed = step > sNum;
            return (
              <div key={sNum} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-400'
                      : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {isPassed ? <Check className="w-4 h-4" /> : sNum}
                </div>
                <span className={`hidden md:inline ${isActive ? 'text-purple-300' : 'text-slate-400'}`}>
                  {labels[sNum - 1]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6"
            >
              <h2 className="text-xl font-bold text-white">الخطوة 1: اختر المرحلة الدراسية</h2>
              {loadingOptions ? (
                <div className="text-center py-8 text-slate-400 text-sm">جارٍ تحميل المراحل الدراسية...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {stages.map((stg) => {
                    const isSel = selectedStage === stg.id;
                    return (
                      <button
                        key={stg.id}
                        onClick={() => setSelectedStage(stg.id)}
                        className={`p-4 rounded-2xl border text-right transition-all font-bold text-sm ${
                          isSel
                            ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Layers className="w-5 h-5 mb-2 text-purple-400" />
                        {stg.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  disabled={!selectedStage}
                  onClick={() => setStep(2)}
                  className="glass-button-primary px-8 py-3 rounded-2xl font-bold text-sm disabled:opacity-50 cursor-pointer"
                >
                  التالي: اختيار المجموعة ←
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">الخطوة 2: اختر المجموعة المناسبة</h2>
                <button onClick={() => setStep(1)} className="text-xs text-purple-400 hover:underline">
                  تغيير المرحلة
                </button>
              </div>

              {currentGroups.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">لا توجد مجموعات متاحة لهذه المرحلة حالياً.</div>
              ) : (
                <div className="space-y-4">
                  {currentGroups.map((grp) => {
                    const isSel = selectedGroup?.id === grp.id;
                    const remaining = grp.maxCapacity - (grp._count?.students || 0);
                    const isFull = remaining <= 0;
                    return (
                      <div
                        key={grp.id}
                        onClick={() => !isFull && setSelectedGroup(grp)}
                        className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer ${
                          isFull
                            ? 'opacity-60 bg-rose-950/20 border-rose-500/20 cursor-not-allowed'
                            : isSel
                            ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-base text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-400" />
                            {grp.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            🗓️ الأيام: {grp.scheduleDays?.join(' و ')} | ⏰ الموعد: {grp.startTime} إلى {grp.endTime}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 border border-white/10">
                            المقاعد المتبقية: {remaining} من {grp.maxCapacity}
                          </span>
                          {isFull ? (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              مكتملة
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-full ${
                                isSel ? 'bg-purple-500 text-white' : 'bg-white/10 text-slate-300'
                              }`}
                            >
                              {isSel ? 'تم الاختيار ✓' : 'اختيار'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(1)} className="glass-button px-6 py-3 rounded-2xl text-sm font-bold">
                  السابق
                </button>
                <button
                  disabled={!selectedGroup}
                  onClick={() => setStep(3)}
                  className="glass-button-primary px-8 py-3 rounded-2xl font-bold text-sm disabled:opacity-50 cursor-pointer"
                >
                  التالي: بيانات الطالب ←
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-5"
            >
              <h2 className="text-xl font-bold text-white">الخطوة 3: أدخل بيانات الطالب الحقيقية</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">الاسم رباعي *</label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم الرباعي الكامل للطالب"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full glass-input p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم هاتف الطالب *</label>
                  <input
                    type="text"
                    required
                    placeholder="01xxxxxxxxx"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full glass-input p-3 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">النوع *</label>
                  <select
                    value={studentGender}
                    onChange={(e) => setStudentGender(e.target.value)}
                    className="w-full glass-input p-3 text-sm bg-slate-900"
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="glass-button px-6 py-3 rounded-2xl text-sm font-bold">
                  السابق
                </button>
                <button
                  disabled={!studentName || !studentPhone}
                  onClick={() => setStep(4)}
                  className="glass-button-primary px-8 py-3 rounded-2xl font-bold text-sm disabled:opacity-50 cursor-pointer"
                >
                  التالي: بيانات ولي الأمر ←
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-5"
            >
              <h2 className="text-xl font-bold text-white">الخطوة 4: بيانات ولي الأمر والتحقق المباشر</h2>

              {phoneErrorMessage && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  ⚠️ {phoneErrorMessage}
                </div>
              )}

              {pendingRequestError && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  ⏳ {pendingRequestError}
                </div>
              )}

              {/* Dynamic Card if Parent Phone is already in DB */}
              {existingParentData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-right space-y-2"
                >
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <Check className="w-5 h-5" />
                    <span>تم العثور على حساب ولي أمر مسجل بهذا الرقم!</span>
                  </div>
                  <p className="text-xs text-slate-300">الاسم المسجل: <strong>{existingParentData.name}</strong> | عدد الأبناء المسجلين: {existingParentData.childrenCount}</p>
                  <div className="text-xs text-slate-400 pt-1">
                    الأبناء الحاليون:
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                      {existingParentData.children.map((c: any) => (
                        <li key={c.id}>{c.name} ({c.stageName} - {c.groupName})</li>
                      ))}
                    </ul>
                  </div>
                  <span className="inline-block text-[11px] bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold mt-2">
                    سيتم ربط هذا الطالب بالحساب تلقائياً
                  </span>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم هاتف ولي الأمر *</label>
                  <input
                    type="text"
                    required
                    placeholder="01xxxxxxxxx"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full glass-input p-3 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم ولي الأمر الثلاثي *</label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم الكامل لولي الأمر"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full glass-input p-3 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">صلة القرابة</label>
                  <select
                    value={parentRelation}
                    onChange={(e) => setParentRelation(e.target.value)}
                    className="w-full glass-input p-3 text-sm bg-slate-900"
                  >
                    <option value="Father">والد (أب)</option>
                    <option value="Mother">والدة (أم)</option>
                    <option value="Guardian">ولي أمر (قريب)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم هاتف إضافي (اختياري)</label>
                  <input
                    type="text"
                    placeholder="رقم احتياطي للتواصل"
                    value={parentExtraPhone}
                    onChange={(e) => setParentExtraPhone(e.target.value)}
                    className="w-full glass-input p-3 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم WhatsApp للتواصل</label>
                  <input
                    type="text"
                    placeholder="01xxxxxxxxx"
                    value={parentWhatsapp}
                    onChange={(e) => setParentWhatsapp(e.target.value)}
                    className="w-full glass-input p-3 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(3)} className="glass-button px-6 py-3 rounded-2xl text-sm font-bold">
                  السابق
                </button>
                <button
                  disabled={!parentPhone || !parentName || checkingParent}
                  onClick={handleNextFromStep4}
                  className="glass-button-primary px-8 py-3 rounded-2xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {checkingParent ? 'جارٍ الفحص التلقائي...' : 'التالي: مراجعة البيانات ←'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6"
            >
              <h2 className="text-xl font-bold text-white">الخطوة 5: مراجعة البيانات قبل الإرسال</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <h4 className="font-bold text-purple-300 border-b border-white/10 pb-2">بيانات الطالب والمجموعة</h4>
                  <p><strong>اسم الطالب:</strong> {studentName}</p>
                  <p><strong>رقم الطالب:</strong> {studentPhone}</p>
                  <p><strong>المرحلة:</strong> {stages.find((s) => s.id === selectedStage)?.name}</p>
                  <p><strong>المجموعة:</strong> {selectedGroup?.name}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <h4 className="font-bold text-blue-300 border-b border-white/10 pb-2">بيانات ولي الأمر</h4>
                  <p><strong>اسم ولي الأمر:</strong> {parentName}</p>
                  <p><strong>رقم الهاتف:</strong> {parentPhone}</p>
                  <p><strong>صلة القرابة:</strong> {parentRelation === 'Father' ? 'والد (أب)' : parentRelation === 'Mother' ? 'والدة (أم)' : 'ولي أمر (قريب)'}</p>
                  <p>
                    <strong>الحساب:</strong>{' '}
                    {existingParentData ? 'ربط بحساب ولي أمر مسجل مسبقاً' : 'إنشاء حساب جديد'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(4)} className="glass-button px-6 py-3 rounded-2xl text-sm font-bold">
                  السابق وتعديل
                </button>
                <button
                  disabled={submitting}
                  onClick={handleSubmitRegistration}
                  className="glass-button-primary px-10 py-4 rounded-2xl font-bold text-base shadow-xl shadow-purple-500/30 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? 'جارٍ الإرسال والتسجيل بقاعدة البيانات...' : 'تأكيد إرسال الطلب الآن 🚀'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center text-xs text-slate-500 mt-8">
        منصة المايسترو التعليمية - جميع الحقوق محفوظة © {new Date().getFullYear()}
      </div>
    </div>
  );
}
