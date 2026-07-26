"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, Users, ShieldCheck, Sparkles, ArrowLeft, UserPlus } from "lucide-react";

export default function SelectRolePage() {
  const router = useRouter();

  const roles = [
    {
      id: "TEACHER",
      title: "👨‍🏫 المدرس والمساعدين",
      subTitle: "لوحة تحكم الأستاذ والإدارة",
      description: "إدارة الطلاب، المجموعات، الحضور، الواجبات والامتحانات والاشتراكات والمالية",
      icon: ShieldCheck,
      color: "from-purple-500/20 to-indigo-500/20",
      borderColor: "border-purple-500/30",
      glowColor: "group-hover:shadow-purple-500/25",
      badge: "الإدارة والمعلم",
      href: "/login?role=TEACHER",
    },
    {
      id: "STUDENT",
      title: "🎓 الطالب",
      subTitle: "بوابة التلميذ والتفاعل",
      description: "متابعة الحضور، تسليم الواجبات، مشاهدة نتائج الامتحانات والملفات والاشتراك",
      icon: GraduationCap,
      color: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30",
      glowColor: "group-hover:shadow-blue-500/25",
      badge: "منصة الطلاب",
      href: "/login?role=STUDENT",
    },
    {
      id: "PARENT",
      title: "👨‍👩‍👦 ولي الأمر",
      subTitle: "متابعة الأبناء والتقرير الشامل",
      description: "متابعة أكثر من ابن، تقارير الحضور، كشف الدرجات، والاشتراكات والتواصل المباشر",
      icon: Users,
      color: "from-emerald-500/20 to-teal-500/20",
      borderColor: "border-emerald-500/30",
      glowColor: "group-hover:shadow-emerald-500/25",
      badge: "متابعة أولياء الأمور",
      href: "/login?role=PARENT",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center items-center p-6 bg-[#060913]">
      {/* Background Ambient Glows */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      {/* Direct Registration Button Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 mb-8"
      >
        <Link href="/register">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass-button-primary px-8 py-3.5 rounded-full font-bold text-sm flex items-center gap-3 shadow-xl shadow-purple-500/30 border border-purple-400/40"
          >
            <UserPlus className="w-5 h-5 text-purple-300 animate-bounce" />
            <span>طلب حجز وتسجيل طالب جديد (استمارة الحجز المباشر)</span>
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        </Link>
      </motion.div>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10 max-w-2xl mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-purple-500/30 text-purple-300 text-sm font-medium mb-4 shadow-lg shadow-purple-500/10">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <span>مرحباً بك في منصة المايسترو الفاخرة</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-purple-200 tracking-tight leading-tight mb-4">
          اختر نوع الحساب للدخول
        </h1>
        <p className="text-slate-400 text-base md:text-lg">
          منظومة الأستاذ أحمد راضي كحلة التعليمية المتكاملة 
        </p>
      </motion.div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 z-10 w-full max-w-6xl">
        {roles.map((role, idx) => {
          const Icon = role.icon;
          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
            >
              <Link href={role.href} className="block group">
                <div
                  className={`relative h-full p-8 rounded-3xl glass-panel border ${role.borderColor} transition-all duration-300 transform group-hover:-translate-y-2 group-hover:scale-[1.02] shadow-xl ${role.glowColor}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-white shadow-inner group-hover:border-purple-400/50 transition-colors">
                      <Icon className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                      {role.badge}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {role.title}
                  </h2>
                  <h3 className="text-sm font-medium text-slate-400 mb-4">
                    {role.subTitle}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {role.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-400 group-hover:text-purple-300 transition-colors pt-4 border-t border-white/5">
                    <span>متابعة تسجيل الدخول</span>
                    <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Footer copyright */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 text-slate-500 text-sm z-10"
      >
        © {new Date().getFullYear()} منصة المايسترو - جميع الحقوق محفوظة
      </motion.p>
    </div>
  );
}
