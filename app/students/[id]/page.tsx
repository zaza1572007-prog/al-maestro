'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function StudentProfilePage() {
  const [activeTab, setActiveTab] = useState('overview');

  const student = {
    id: 's1',
    code: 'STU-1001',
    name: 'أحمد محمد علي',
    phone: '01012345678',
    parentName: 'محمد علي (الأب)',
    parentPhone: '01198765432',
    stage: 'الثالث الإعدادي',
    group: 'مجموعة السبت والإثنين - 4:00 مساءً',
    qrCode: 'QR-STU-1001',
    subStatus: 'ACTIVE',
    subSessionsLeft: 6,
  };

  const handlePrintCard = () => {
    window.print();
  };

  const parentWaLink = `https://wa.me/20${student.parentPhone.replace(/^0/, '')}?text=${encodeURIComponent(`مرحباً أستاذ ${student.parentName}، إفادة بحالة الطالب ${student.name} في منصة المايسترو.`)}`;

  return (
    <div className="space-y-6">
      {/* Header Profile Info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg">
            أم
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-white">{student.name}</h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {student.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {student.stage} • <strong className="text-slate-300">{student.group}</strong>
            </p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              ولي الأمر: {student.parentName} ({student.parentPhone})
              <a
                href={parentWaLink}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-md text-[11px] font-bold transition inline-flex items-center gap-1"
              >
                <span>💬</span> واتساب ولي الأمر
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">الحصص المتبقية</span>
            <span className="text-xl font-bold text-emerald-400">{student.subSessionsLeft} حصص</span>
          </div>
          <button
            onClick={handlePrintCard}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>🎴</span> طباعة بطاقة الطالب
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'homework', label: 'Homework' },
          { id: 'exams', label: 'Exams' },
          { id: 'payments', label: 'Payments' },
          { id: 'parentComms', label: 'Parent Comms' },
          { id: 'notes', label: 'Notes & Files' },
          { id: 'activity', label: 'Activity Log' },
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

      {/* Tab Content Preview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
          ملخص أدائي وحالة الطالب (Overview)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <p className="text-xs text-slate-400">متوسط الحضور والغياب</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">96%</p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <p className="text-xs text-slate-400">متوسط درجات الامتحانات</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">92 / 100</p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <p className="text-xs text-slate-400">حالة الواجبات الأخيرة</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">مكتملة بالكامل</p>
          </div>
        </div>
      </div>
    </div>
  );
}

