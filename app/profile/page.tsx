'use client';

export default function TeacherProfilePage() {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-4 max-w-3xl mx-auto">
        <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 p-1 shadow-2xl">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-4xl font-extrabold text-amber-400">
            أك
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-white">الأستاذ أحمد راضي كحلة</h1>
        <p className="text-amber-400 font-semibold text-sm">خبير تدريس الرياضيات للمراحل الابتدائية، الإعدادية، والثانوية</p>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          أكثر من 15 عاماً من الخبرة والتميز في بناء عقول ومستقبل أفضل لطلابنا وتسهيل مفاهيم الرياضيات بأحدث الأساليب.
        </p>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          <div>
            <p className="text-xs text-slate-400">إجمالي الطلاب</p>
            <p className="text-xl font-bold text-white mt-1">+1,200</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">سنوات الخبرة</p>
            <p className="text-xl font-bold text-blue-400 mt-1">15 عاماً</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">عدد الجلسات</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">+5,000</p>
          </div>
        </div>
      </div>
    </div>
  );
}
