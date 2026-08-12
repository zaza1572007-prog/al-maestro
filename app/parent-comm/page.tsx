'use client';

import { useState, useEffect } from 'react';
import { Search, Send, Users, MessageSquare, Loader2, Phone } from 'lucide-react';

export default function ParentCommPage() {
  const [activeTab, setActiveTab] = useState<'parents' | 'logs'>('parents');
  
  // Communication Logs states (original functionality)
  const [comms, setComms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isAddingComm, setIsAddingComm] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState('هاتف 📞');
  const [loading, setLoading] = useState(true);

  // Parent Credentials management states (new functionality)
  const [parents, setParents] = useState<any[]>([]);
  const [parentsLoading, setParentsLoading] = useState(false);
  const [parentsSearch, setParentsSearch] = useState('');
  const [sendingCredentialsId, setSendingCredentialsId] = useState<string | null>(null);
  
  // Notification Toast state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [commsRes, studentsRes] = await Promise.all([
        fetch('/api/parent-comm'),
        fetch('/api/students')
      ]);
      const commsData = await commsRes.json();
      const studentsData = await studentsRes.json();

      if (commsData.success) setComms(commsData.comms);
      if (studentsData.success) {
        setStudents(studentsData.students);
        if (studentsData.students.length > 0) {
          setStudentId(studentsData.students[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = async (searchVal = '') => {
    setParentsLoading(true);
    try {
      const res = await fetch(`/api/parents?search=${encodeURIComponent(searchVal)}`);
      const data = await res.json();
      if (data.success) {
        setParents(data.parents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setParentsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Debounced search for parents list
  useEffect(() => {
    if (activeTab === 'parents') {
      const timer = setTimeout(() => {
        fetchParents(parentsSearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [parentsSearch, activeTab]);

  const handleCreateComm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/parent-comm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, channel, reason, notes })
      });
      const data = await res.json();
      if (data.success) {
        setComms(prev => [data.comm, ...prev]);
        setIsAddingComm(false);
        setReason('');
        setNotes('');
        showNotification('success', 'تم حفظ تدوين الاتصال بنجاح ✅');
      } else {
        showNotification('error', data.error || 'حدث خطأ أثناء حفظ التدوين');
      }
    } catch (error) {
      showNotification('error', 'تعذّر الاتصال بالخادم');
    }
  };

  const handleSendCredentials = async (parentId: string) => {
    setSendingCredentialsId(parentId);
    try {
      const res = await fetch(`/api/parents/${parentId}/credentials`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', 'تم إرسال بيانات الدخول لولي الأمر بنجاح عبر الواتساب ✅');
        // Refresh communications list as sending credentials logs a new WhatsApp event
        fetchData();
      } else {
        showNotification('error', data.error || 'فشل إرسال رسالة الواتساب ❌');
      }
    } catch (error) {
      showNotification('error', 'خطأ في الاتصال بالخادم');
    } finally {
      setSendingCredentialsId(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            تواصل أولياء الأمور وحسابات الدخول
          </h1>
          <p className="text-slate-400 text-sm mt-1">إرسال بيانات الدخول والمتابعة لأولياء الأمور عبر الواتساب وتوثيق سجل المكالمات والمتابعة.</p>
        </div>
        {activeTab === 'logs' && (
          <button
            onClick={() => setIsAddingComm(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <span>➕</span> تدوين اتصال جديد
          </button>
        )}
      </div>

      {/* Notifications Toast */}
      {notification && (
        <div className="fixed bottom-4 left-4 z-50 animate-bounce">
          <div className={`p-4 rounded-2xl shadow-2xl text-xs font-bold border ${
            notification.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-400' 
              : 'bg-rose-950/90 border-rose-500/40 text-rose-400'
          }`}>
            {notification.message}
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-white/5 pb-2 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('parents')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
            activeTab === 'parents'
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
              : 'text-slate-400 border-transparent hover:text-white hover:bg-white/3'
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          أولياء الأمور وبيانات الدخول
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
            activeTab === 'logs'
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
              : 'text-slate-400 border-transparent hover:text-white hover:bg-white/3'
          }`}
        >
          <MessageSquare className="w-4.5 h-4.5" />
          سجل تواصل أولياء الأمور
        </button>
      </div>

      {/* TAB 1: PARENTS & CREDENTIALS */}
      {activeTab === 'parents' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-slate-900/30">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              <input
                type="text"
                placeholder="ابحث باسم ولي الأمر، أو رقم الهاتف الخاص به..."
                value={parentsSearch}
                onChange={(e) => setParentsSearch(e.target.value)}
                className="w-full glass-input pr-10 pl-4 py-2.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Parents Table */}
          {parentsLoading && parents.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">جاري تحميل بيانات أولياء الأمور...</p>
            </div>
          ) : parents.length > 0 ? (
            <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden bg-slate-900/40">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 border-b border-white/5">
                      <th className="p-4 font-bold">ولي الأمر</th>
                      <th className="p-4 font-bold">رقم الهاتف والواتساب</th>
                      <th className="p-4 font-bold">الطلاب التابعين</th>
                      <th className="p-4 font-bold">كلمة المرور</th>
                      <th className="p-4 font-bold text-left">التحكم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parents.map((parent) => (
                      <tr key={parent.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white text-sm">أ. {parent.name}</p>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {parent.relation === 'Father' ? 'الأب 👨' : parent.relation === 'Mother' ? 'الأم 👩' : 'قريب 👥'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          <p className="flex items-center gap-1.5">
                            <span className="text-[11px]">📞 {parent.phone}</span>
                          </p>
                          {parent.whatsapp && (
                            <p className="text-[10px] text-emerald-400 mt-0.5">💬 {parent.whatsapp} (واتساب)</p>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {parent.students && parent.students.length > 0 ? (
                              parent.students.map((student: any) => (
                                <span key={student.id} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                                  {student.name} ({student.code})
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 text-[10px]">لا يوجد طلاب مرتبطين</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-300">
                          {parent.passwordPlain || '—'}
                        </td>
                        <td className="p-4 text-left">
                          <button
                            onClick={() => handleSendCredentials(parent.id)}
                            disabled={sendingCredentialsId === parent.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-50 text-[11px]"
                          >
                            {sendingCredentialsId === parent.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                جاري الإرسال...
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                إرسال الحساب (WhatsApp)
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 glass-panel rounded-3xl border border-white/5">
              <p className="text-sm">لا يوجد نتائج للبحث باسم ولي الأمر أو برقم الهاتف الخاص به.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMMUNICATION LOGS (Original UI) */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">اسم الطالب</th>
                  <th className="p-3.5">وسيلة التواصل</th>
                  <th className="p-3.5">سبب التواصل</th>
                  <th className="p-3.5">النتيجة والملاحظات</th>
                  <th className="p-3.5">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {comms.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold text-white">{c.student?.name || 'غير معروف'}</td>
                    <td className="p-3.5 text-xs text-blue-400 font-semibold">{c.method === 'WHATSAPP' ? 'WhatsApp 💬' : 'هاتف 📞'}</td>
                    <td className="p-3.5 text-slate-300">{c.reason}</td>
                    <td className="p-3.5 text-slate-300">{c.notes}</td>
                    <td className="p-3.5 text-xs text-slate-400 font-mono">{new Date(c.date).toLocaleDateString('ar-EG')}</td>
                  </tr>
                ))}
                {comms.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">لا توجد سجلات تواصل</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 animate-pulse">جاري تحميل السجلات...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Call Log Modal */}
      {isAddingComm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">💬 تدوين اتصال / ملاحظة ولي أمر جديدة</h3>
              <button onClick={() => setIsAddingComm(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateComm} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">اسم الطالب</label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {s.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">وسيلة التواصل</label>
                <select
                  required
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="هاتف 📞">هاتف 📞</option>
                  <option value="WhatsApp 💬">WhatsApp 💬</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">سبب التواصل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متابعة درجات الاختبار"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">النتيجة والملاحظات</label>
                <textarea
                  required
                  rows={3}
                  placeholder="تدوين ملخص المكالمة أو الاتفاق مع ولي الأمر..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingComm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg">
                  حفظ التدوين 💬
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
