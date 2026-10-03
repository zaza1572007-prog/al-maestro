'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroHeader from '@/components/HeroHeader';
import { useToast } from '@/components/ToastProvider';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Save,
  X,
  Sliders,
  ChevronDown,
  ChevronUp,
  UserCheck,
  GraduationCap,
  QrCode,
  BookOpenCheck,
  Banknote,
  MessageSquare,
  FolderArchive,
  Phone,
  ShieldAlert,
  Info
} from 'lucide-react';
import {
  PERMISSION_CATEGORIES,
  PERMISSION_PRESETS,
  ALL_PERMISSIONS,
  PermissionCategory,
  PermissionPreset
} from '@/lib/permissions';

interface Assistant {
  id: string;
  name: string;
  phone: string;
  passwordPlain?: string | null;
  role: string;
  profileImage?: string | null;
  isActive: boolean;
  permissions: string[];
  assignedGroupIds: string[];
  notes?: string | null;
  createdAt: string;
  _count?: {
    attendances: number;
    lessonSessions: number;
    tasks: number;
  };
}

interface GroupItem {
  id: string;
  name: string;
  academicStage?: {
    id: string;
    name: string;
    level: string;
  };
}

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [groupAssignmentType, setGroupAssignmentType] = useState<'all' | 'custom'>('all');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Category collapse state inside modal
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    attendance: true,
    students: true,
    exams_homework: true,
    finance: true,
    groups_stages: true,
    registrations: true,
    communication: true,
    tools: true,
  });

  // UI helpers
  const [showPasswordMap, setShowPasswordMap] = useState<{ [id: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const fetchAssistants = async () => {
    try {
      const res = await fetch('/api/assistants');
      const data = await res.json();
      if (data.success) {
        setAssistants(data.assistants || []);
      } else {
        toast.error(data.error || 'تعذر تحميل قائمة المساعدين');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (e) {
      console.error('Error fetching groups:', e);
    }
  };

  useEffect(() => {
    fetchAssistants();
    fetchGroups();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentAssistantId(null);
    setName('');
    setPhone('');
    setPassword('');
    setNotes('');
    setIsActive(true);
    // Default to Attendance Preset
    setSelectedPermissions(PERMISSION_PRESETS[0].permissions);
    setGroupAssignmentType('all');
    setSelectedGroupIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (ast: Assistant) => {
    setModalMode('edit');
    setCurrentAssistantId(ast.id);
    setName(ast.name);
    setPhone(ast.phone);
    setPassword('');
    setNotes(ast.notes || '');
    setIsActive(ast.isActive);
    setSelectedPermissions(ast.permissions || []);
    if (ast.assignedGroupIds && ast.assignedGroupIds.length > 0) {
      setGroupAssignmentType('custom');
      setSelectedGroupIds(ast.assignedGroupIds);
    } else {
      setGroupAssignmentType('all');
      setSelectedGroupIds([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
  };

  const applyPreset = (preset: PermissionPreset) => {
    setSelectedPermissions(preset.permissions);
    toast.success(`تم تطبيق قالب: ${preset.name}`);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const toggleCategoryAll = (cat: PermissionCategory) => {
    const catPermIds = cat.permissions.map(p => p.id);
    const allSelected = catPermIds.every(id => selectedPermissions.includes(id));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !catPermIds.includes(id)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...catPermIds])));
    }
  };

  const selectAllPermissions = () => {
    setSelectedPermissions(ALL_PERMISSIONS);
    toast.success('تم تحديد جميع الصلاحيات');
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
    toast.info('تم تفريغ الصلاحيات');
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const toggleGroupSelect = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('الاسم ورقم الهاتف/اسم المستخدم حقول مطلوبة');
      return;
    }

    if (modalMode === 'create' && !password.trim()) {
      toast.error('كلمة المرور مطلوبة لإنشاء حساب مساعد جديد');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        isActive,
        notes: notes.trim(),
        permissions: selectedPermissions,
        assignedGroupIds: groupAssignmentType === 'custom' ? selectedGroupIds : [],
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/assistants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/assistants/${currentAssistantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'تم حفظ بيانات المساعد بنجاح');
        setIsModalOpen(false);
        fetchAssistants();
      } else {
        toast.error(data.error || 'حدث خطأ أثناء الحفظ');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('تعذر الحفظ، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (ast: Assistant) => {
    try {
      const newStatus = !ast.isActive;
      const res = await fetch(`/api/assistants/${ast.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(newStatus ? `تم تفعيل حساب ${ast.name}` : `تم تجميد حساب ${ast.name}`);
        setAssistants(prev =>
          prev.map(a => (a.id === ast.id ? { ...a, isActive: newStatus } : a))
        );
      } else {
        toast.error(data.error || 'تعذر تغيير الحالة');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleDeleteAssistant = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/assistants/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم حذف المساعد بنجاح');
        setDeleteConfirmId(null);
        setAssistants(prev => prev.filter(a => a.id !== id));
      } else {
        toast.error(data.error || 'تعذر حذف المساعد');
      }
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('تم نسخ كلمة المرور إلى الحافظة');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAssistants = useMemo(() => {
    return assistants.filter(ast => {
      const matchesSearch =
        ast.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ast.phone.includes(searchQuery);
      if (!matchesSearch) return false;
      if (statusFilter === 'active') return ast.isActive;
      if (statusFilter === 'inactive') return !ast.isActive;
      return true;
    });
  }, [assistants, searchQuery, statusFilter]);

  // Total stats
  const totalCount = assistants.length;
  const activeCount = assistants.filter(a => a.isActive).length;
  const inactiveCount = assistants.filter(a => !a.isActive).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 p-4 md:p-8 transition-colors duration-200">
      {/* Top Hero Banner */}
      <HeroHeader
        title="فريق المساعدين والصلاحيات"
        subtitle="إدارة حسابات المساعدين، تعيين الصلاحيات المخصصة، وتوزيع المجموعات التعليمية لضمان أعلى مستوى من التنظيم والأمان."
        badge="إدارة الكادر الإداري والتشغيلي"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">إجمالي المساعدين</p>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{totalCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">حسابات نشطة</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">حسابات مجمّدة</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{inactiveCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">المجموعات التعليمية</p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{groups.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Action Bar & Search */}
      <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="البحث بالاسم أو رقم الهاتف..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-white placeholder-zinc-400"
          />
        </div>

        {/* Filters & Add Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter */}
          <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 border border-zinc-200 dark:border-zinc-700/60">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              الكل ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              نشط ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              مجمّد ({inactiveCount})
            </button>
          </div>

          {/* Add Assistant Button */}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مساعد جديد</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">جاري تحميل بيانات المساعدين والصلاحيات...</p>
        </div>
      ) : filteredAssistants.length === 0 ? (
        <div className="text-center py-20 bg-white/60 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">لا يوجد مساعدين مطابقين للبحث</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'جرّب كتابة اسم آخر أو رقم هاتف مختلف'
              : 'قم بالضغط على زر "إضافة مساعد جديد" لإنشاء أول حساب مساعد وتعيين صلاحياته.'}
          </p>
          {!searchQuery && (
            <button
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مساعد الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredAssistants.map((ast, idx) => {
            const hasAllGroups = !ast.assignedGroupIds || ast.assignedGroupIds.length === 0;
            const assignedGroupNames = groups
              .filter(g => ast.assignedGroupIds?.includes(g.id))
              .map(g => g.name);

            const isCopied = copiedId === ast.id;
            const isPwVisible = showPasswordMap[ast.id] || false;

            return (
              <motion.div
                key={ast.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`relative rounded-3xl bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border transition-all duration-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  ast.isActive
                    ? 'border-zinc-200/80 dark:border-zinc-800/80 hover:border-blue-500/40'
                    : 'border-rose-200/80 dark:border-rose-900/40 bg-rose-50/10 dark:bg-rose-950/10'
                }`}
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    {/* Assistant Profile & Name */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                          {ast.name.charAt(0) || 'م'}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 ${
                            ast.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{ast.name}</h3>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              ast.isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {ast.isActive ? 'نشط' : 'مجمّد'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          <Phone className="w-3.5 h-3.5" />
                          <span className="font-mono text-zinc-700 dark:text-zinc-300">{ast.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Active Toggle Button */}
                    <button
                      onClick={() => handleToggleActive(ast)}
                      title={ast.isActive ? 'تجميد الحساب' : 'تفعيل الحساب'}
                      className={`p-2 rounded-xl transition-all ${
                        ast.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                      }`}
                    >
                      {ast.isActive ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Credentials Bar */}
                  <div className="mt-4 p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <span className="text-zinc-500 dark:text-zinc-400">كلمة المرور:</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {ast.passwordPlain ? (isPwVisible ? ast.passwordPlain : '••••••••') : 'مشفرة'}
                      </span>
                    </div>

                    {ast.passwordPlain && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setShowPasswordMap(prev => ({
                              ...prev,
                              [ast.id]: !prev[ast.id]
                            }))
                          }
                          className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all"
                          title={isPwVisible ? 'إخفاء' : 'إظهار'}
                        >
                          {isPwVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(ast.passwordPlain || '', ast.id)}
                          className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all"
                          title="نسخ"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Assigned Permissions Summary */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        الصلاحيات الممنوحة ({ast.permissions?.length || 0})
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                      {ast.permissions && ast.permissions.length > 0 ? (
                        ast.permissions.slice(0, 6).map(perm => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40"
                          >
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-rose-500 font-medium">لا توجد صلاحيات مسندة</span>
                      )}
                      {ast.permissions && ast.permissions.length > 6 && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          +{ast.permissions.length - 6} أخرى
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Groups Summary */}
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-bold">المجموعات المسندة:</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                        {hasAllGroups
                          ? '🌟 جميع المجموعات والمراحل'
                          : `${assignedGroupNames.join('، ') || 'لم تُحدد'}`}
                      </span>
                    </div>
                  </div>

                  {/* Notes if any */}
                  {ast.notes && (
                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 bg-amber-500/5 border border-amber-500/20 p-2 rounded-lg">
                      <span className="font-bold text-amber-600 dark:text-amber-400 ml-1">ملاحظة:</span>
                      {ast.notes}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span>الحصص: {ast._count?.lessonSessions || 0}</span>
                    <span>•</span>
                    <span>الحضور: {ast._count?.attendances || 0}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(ast)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-500" />
                      <span>تعديل الصلاحيات</span>
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(ast.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                      title="حذف المساعد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">تأكيد حذف المساعد</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                هل أنت متأكد من رغبتك في حذف حساب هذا المساعد نهائياً من النظام؟ لن يتمكن من تسجيل الدخول بعد الآن.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDeleteAssistant(deleteConfirmId)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md shadow-rose-600/20 transition-all"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>نعم، تأكيد الحذف</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Add/Edit Assistant & Permissions Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white dark:bg-[#111218] border border-zinc-200/80 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="p-5 md:px-7 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                      {modalMode === 'create' ? 'إضافة مساعد جديد وتعيين صلاحياته' : `تعديل صلاحيات وبيانات: ${name}`}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      حدد الصلاحيات بدقة والمجموعات التي يشرف عليها المساعد
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  disabled={submitting}
                  className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 md:p-7 space-y-7 custom-scrollbar">
                {/* 1. Basic Account Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                    <span>بيانات الحساب وتسجيل الدخول</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        اسم المساعد <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="مثال: أ. محمود خالد"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Phone / Username */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        اسم المستخدم / الهاتف <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="01012345678"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        {modalMode === 'create' ? 'كلمة المرور' : 'تغيير كلمة المرور (اختياري)'}{' '}
                        {modalMode === 'create' && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={modalMode === 'create'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={modalMode === 'create' ? 'كلمة المرور للدخول' : 'اتركها فارغة للإبقاء'}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Status Toggle & Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/50">
                      <div>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">حالة الحساب</span>
                        <span className="text-[11px] text-zinc-500">{isActive ? 'الحساب مفعّل ونشط' : 'الحساب مجمّد'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsActive(!isActive)}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                          isActive ? 'bg-emerald-500 justify-end' : 'bg-zinc-400 justify-start'
                        }`}
                      >
                        <motion.div layout className="bg-white w-4 h-4 rounded-full shadow-md" />
                      </button>
                    </div>

                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="ملاحظات إدارية عن مهام المساعد أو اختصاصه (اختياري)..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Quick Presets Bar */}
                <div className="space-y-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>قوالب الصلاحيات السريعة</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllPermissions}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-zinc-400">•</span>
                      <button
                        type="button"
                        onClick={clearAllPermissions}
                        className="text-xs font-bold text-rose-500 hover:underline"
                      >
                        تفريغ الكل
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {PERMISSION_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="p-3 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-blue-500/40 text-right transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {preset.badge}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                            {preset.permissions.length} صلاحيات
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Detailed Permissions Matrix */}
                <div className="space-y-4 pt-3 border-t border-zinc-200/70 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      <span>مصفوفة الصلاحيات المخصصة</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                        {selectedPermissions.length} من {ALL_PERMISSIONS.length} مختارة
                      </span>
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {PERMISSION_CATEGORIES.map(cat => {
                      const catPermIds = cat.permissions.map(p => p.id);
                      const selectedInCat = catPermIds.filter(id => selectedPermissions.includes(id)).length;
                      const isFullySelected = selectedInCat === catPermIds.length && catPermIds.length > 0;
                      const isExpanded = expandedCategories[cat.id];

                      return (
                        <div
                          key={cat.id}
                          className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden"
                        >
                          {/* Category Header */}
                          <div className="p-3.5 flex items-center justify-between bg-white dark:bg-zinc-800/40 border-b border-zinc-200/60 dark:border-zinc-800/60">
                            <div
                              onClick={() => toggleCategoryExpand(cat.id)}
                              className="flex items-center gap-2.5 cursor-pointer select-none flex-1"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{cat.title}</h4>
                                <span className="text-[10px] text-zinc-400">
                                  {selectedInCat} من {catPermIds.length} مفعلة
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleCategoryAll(cat)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                  isFullySelected
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                                }`}
                              >
                                {isFullySelected ? 'إلغاء الفئة' : 'تحديد الفئة'}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleCategoryExpand(cat.id)}
                                className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Category Items */}
                          {isExpanded && (
                            <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-zinc-50/50 dark:bg-zinc-900/30">
                              {cat.permissions.map(perm => {
                                const checked = selectedPermissions.includes(perm.id);
                                return (
                                  <label
                                    key={perm.id}
                                    onClick={() => togglePermission(perm.id)}
                                    className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 ${
                                      checked
                                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-900 dark:text-blue-200'
                                        : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {}}
                                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                      <span className="text-xs font-bold block">{perm.label}</span>
                                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block mt-0.5">
                                        {perm.description}
                                      </span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Group Assignment */}
                <div className="space-y-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800">
                  <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>نطاق المجموعات التعليمية</span>
                  </h3>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setGroupAssignmentType('all')}
                      className={`flex-1 p-3 rounded-2xl border text-center transition-all ${
                        groupAssignmentType === 'all'
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-600 dark:text-indigo-300 font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      🌟 الإشراف على جميع المجموعات
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupAssignmentType('custom')}
                      className={`flex-1 p-3 rounded-2xl border text-center transition-all ${
                        groupAssignmentType === 'custom'
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-600 dark:text-indigo-300 font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      🎯 تحديد مجموعات معينة ({selectedGroupIds.length})
                    </button>
                  </div>

                  {groupAssignmentType === 'custom' && (
                    <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/60 max-h-48 overflow-y-auto custom-scrollbar">
                      {groups.length === 0 ? (
                        <p className="text-xs text-zinc-400 text-center py-2">لا توجد مجموعات متاحة حالياً</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {groups.map(grp => {
                            const isGrpSelected = selectedGroupIds.includes(grp.id);
                            return (
                              <label
                                key={grp.id}
                                onClick={() => toggleGroupSelect(grp.id)}
                                className={`p-2.5 rounded-xl border text-xs cursor-pointer select-none flex items-center gap-2 transition-all ${
                                  isGrpSelected
                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isGrpSelected}
                                  onChange={() => {}}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="truncate">
                                  <span>{grp.name}</span>
                                  {grp.academicStage && (
                                    <span className="block text-[10px] text-zinc-400 truncate">
                                      {grp.academicStage.name}
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={closeModal}
                    className="px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-bold transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{modalMode === 'create' ? 'إضافة المساعد' : 'حفظ التعديلات'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
