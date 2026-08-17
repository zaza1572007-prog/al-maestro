'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import HeroHeader from '@/components/HeroHeader';
import { 
  ToggleLeft, ToggleRight, Upload, Image as ImageIcon, CheckCircle2, XCircle, 
  Loader2, Palette, RefreshCw, Layout, Maximize2, Sparkles, 
  Laptop, Tablet, Smartphone, Sliders, ZoomIn, Move, Eye, EyeOff, RotateCcw,
  Trash2, Lock, Unlock, Search, AlertTriangle, CalendarClock
} from 'lucide-react';
import { extractDominantColors, generatePalettes, getDefaultPalettes, ThemePalette } from '@/lib/colorExtractor';
import ColorPaletteSelector from '@/components/ColorPaletteSelector';
import DeviceFramePreview from '@/components/DeviceFramePreview';
import { DEFAULT_PORTRAIT_CONFIG, MultiDevicePortraitConfig, DevicePortraitConfig } from '@/components/TeacherOverlay';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('registration');

  // DB-backed settings
  const [platformName, setPlatformName] = useState('منصة المايسترو');
  const [teacherName, setTeacherName] = useState('الأستاذ أحمد راضي كحلة');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [enableWhatsApp, setEnableWhatsApp] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Cleanup States
  const [stagesList, setStagesList] = useState<any[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [cleanupAbsenceScope, setCleanupAbsenceScope] = useState<'all' | 'stage' | 'group' | 'student'>('all');
  const [cleanupStageId, setCleanupStageId] = useState('');
  const [cleanupGroupId, setCleanupGroupId] = useState('');
  const [cleanupStudentSearch, setCleanupStudentSearch] = useState('');
  const [cleanupStudentList, setCleanupStudentList] = useState<any[]>([]);
  const [cleanupSelectedStudent, setCleanupSelectedStudent] = useState<any | null>(null);
  const [cleanupSearchLoading, setCleanupSearchLoading] = useState(false);
  const [cleanupBookingPassword, setCleanupBookingPassword] = useState('');
  const [cleanupAbsencePassword, setCleanupAbsencePassword] = useState('');
  const [cleanupNotificationPassword, setCleanupNotificationPassword] = useState('');
  const [cleanupAttendanceScope, setCleanupAttendanceScope] = useState<'all' | 'stage' | 'group' | 'student'>('all');
  const [cleanupAttendanceStageId, setCleanupAttendanceStageId] = useState('');
  const [cleanupAttendanceGroupId, setCleanupAttendanceGroupId] = useState('');
  const [cleanupAttendanceStudentSearch, setCleanupAttendanceStudentSearch] = useState('');
  const [cleanupAttendanceStudentList, setCleanupAttendanceStudentList] = useState<any[]>([]);
  const [cleanupAttendanceSelectedStudent, setCleanupAttendanceSelectedStudent] = useState<any | null>(null);
  const [cleanupAttendanceSearchLoading, setCleanupAttendanceSearchLoading] = useState(false);
  const [cleanupAttendancePassword, setCleanupAttendancePassword] = useState('');
  const [cleanupStatus, setCleanupStatus] = useState<{ type: string; success: boolean; message: string } | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Vacation States
  const [vacationScope, setVacationScope] = useState<'all' | 'stage' | 'group' | 'student'>('all');
  const [vacationStageId, setVacationStageId] = useState('');
  const [vacationGroupId, setVacationGroupId] = useState('');
  const [vacationStudentSearch, setVacationStudentSearch] = useState('');
  const [vacationStudentList, setVacationStudentList] = useState<any[]>([]);
  const [vacationSelectedStudent, setVacationSelectedStudent] = useState<any | null>(null);
  const [vacationSearchLoading, setVacationSearchLoading] = useState(false);
  const [vacationDate, setVacationDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [vacationPassword, setVacationPassword] = useState('');
  const [vacationStatus, setVacationStatus] = useState<{ type: string; success: boolean; message: string } | null>(null);
  const [vacationLoading, setVacationLoading] = useState(false);

  // WhatsApp Gateway settings
  const [waGatewayUrl, setWaGatewayUrl] = useState('');
  const [waApiToken, setWaApiToken] = useState('');
  const [waSenderNumber, setWaSenderNumber] = useState('');
  const [autoSendCredentials, setAutoSendCredentials] = useState(true);
  const [waSaving, setWaSaving] = useState(false);
  const [waTestStatus, setWaTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [waTestMsg, setWaTestMsg] = useState('');

  // WhatsApp Monthly Reports / Cron Job settings
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [sendMode, setSendMode] = useState<'MANUAL' | 'AUTOMATIC'>('MANUAL');
  const [scheduledDay, setScheduledDay] = useState(28);
  const [scheduledTime, setScheduledTime] = useState('20:00');
  const [cronTestStatus, setCronTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [cronTestMsg, setCronTestMsg] = useState('');

  // WhatsApp Templates
  const [tplStudent, setTplStudent] = useState('🎓 مرحباً [student_name]\nتم إنشاء حسابك بمنصة المايسترو.\nاسم المستخدم: [username]\nكلمة المرور: [password]\nبتوفيق 🌟');
  const [tplParent, setTplParent] = useState('👨‍👩‍👦 أهلاً [parent_name]\nتم تسجيل ابنك/بنتك [student_name] بمنصة المايسترو.\nبيانات دخولك كولي أمر:\nاسم المستخدم: [username]\nكلمة المرور: [password]\nبتوفيق 🌟');
  const [tplAttendance, setTplAttendance] = useState('📅 تنبيه حضور\nالطالب: [student_name]\nالحالة: [status]\nالوقت: [time]\nمنصة المايسترو 🏫');
  const [tplAbsent, setTplAbsent] = useState('📅 تنبيه غياب\nالطالب: [student_name]\nتغيب عن حضور حصة اليوم بالمجموعة.\nيرجى المتابعة 🏫');
  const [tplMonthlyReport, setTplMonthlyReport] = useState('📊 *تقرير المتابعة الشهري لولي الأمر* 📊\n\n*اسم الطالب:* [student_name]\n*الصف الدراسي:* [stage_name]\n*المجموعة:* [group_name]\n*التقرير الخاص بشهر:* [month_name] [year]\n\n*1. الحضور والغياب:* 📅\n- إجمالي عدد الحصص: [total_sessions]\n- حضور: [present_count] حصص\n- غياب: [absent_count] حصص\n[absent_details]\n\n*2. الاختبارات والتقييمات:* 📝\n[exams_list]\n\n*3. المصروفات والاشتراك:* 💰\n- حالة السداد للشهر: *[payment_status]*\n\n🔗 *رابط التقرير التفاعلي السريع (رابط سحري):*\nيمكنكم الاطلاع على تقرير الحضور والدرجات التفاعلي والرسوم البيانية عبر هذا الرابط:\n[magic_link]\n\nنتمنى للطالب دوام التوفيق والتميز! 🌸\n*منصة المايسترو - الأستاذ أحمد راضي كحلة*');
  const [tplPayment, setTplPayment] = useState('👨‍👩‍👦 *تأكيد استلام نقدية - منصة المايسترو* 👨‍👩‍👦\n\nتم استلام قيمة اشتراك شهر [month]/[year] للطالب: *[student_name]*.\n\n*المبلغ المدفوع:* [paid_amount] ج.م\n*حالة الاشتراك:* [status]\n*المتبقي:* [remaining_amount] ج.م\n*تاريخ الدفع:* [payment_date]\n\nشكراً لكم وثقتكم بنا 🌸\n*الأستاذ أحمد راضي كحلة*');
  const [tplReminder, setTplReminder] = useState('👨‍👩‍👦 *تذكير بسداد الاشتراك - منصة المايسترو* 👨‍👩‍👦\n\nنود تذكيركم بعدم سداد اشتراك شهر [month]/[year] للطالب: *[student_name]*.\n\nالرجاء السداد في أقرب وقت. شاكرين تعاونكم المستمر 🌸\n*الأستاذ أحمد راضي كحلة*');

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

  // Multi-Device Portrait Configuration
  const [activeDeviceTab, setActiveDeviceTab] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [multiDeviceConfig, setMultiDeviceConfig] = useState<MultiDevicePortraitConfig>(DEFAULT_PORTRAIT_CONFIG);

  // Legacy single-device states
  const [portraitOpacity, setPortraitOpacity] = useState(0.18);
  const [portraitScale, setPortraitScale] = useState(1.0);
  const [portraitPosition, setPortraitPosition] = useState('side');
  const [portraitVisible, setPortraitVisible] = useState(true);

  // Logo layout configuration
  const [logoScale, setLogoScale] = useState(1.0);

  // Branding uploads
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [portraitTabletUrl, setPortraitTabletUrl] = useState<string | null>(null);
  const [portraitMobileUrl, setPortraitMobileUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [portraitUploading, setPortraitUploading] = useState(false);
  const [tabletUploading, setTabletUploading] = useState(false);
  const [mobileUploading, setMobileUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [portraitMsg, setPortraitMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [logoMsg, setLogoMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const portraitInputRef = useRef<HTMLInputElement>(null);
  const tabletInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Smart colour system
  const [palettes, setPalettes] = useState<ThemePalette[]>(() => getDefaultPalettes());
  const [extractingColors, setExtractingColors] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null); // object URL for instant preview

  /** Helper to update config for the currently selected device tab */
  const updateCurrentDeviceConfig = (partial: Partial<DevicePortraitConfig>) => {
    setMultiDeviceConfig((prev: MultiDevicePortraitConfig) => {
      const updatedDevice = {
        ...prev[activeDeviceTab],
        ...partial,
      };
      const updatedAll = {
        ...prev,
        [activeDeviceTab]: updatedDevice,
      };

      // Also sync legacy states if editing desktop
      if (activeDeviceTab === 'desktop') {
        if (partial.opacity !== undefined) setPortraitOpacity(partial.opacity);
        if (partial.scale !== undefined) setPortraitScale(partial.scale);
        if (partial.position !== undefined) setPortraitPosition(partial.position);
      }

      // Live event for instant overlay update in the background
      window.dispatchEvent(
        new CustomEvent('maestro-portrait-live-preview', {
          detail: {
            device: activeDeviceTab,
            config: updatedDevice,
            allConfig: updatedAll,
          },
        })
      );

      return updatedAll;
    });
  };

  /** Reset current device config to standard recommended defaults */
  const resetCurrentDeviceConfig = () => {
    const defaultForTab = DEFAULT_PORTRAIT_CONFIG[activeDeviceTab];
    updateCurrentDeviceConfig(defaultForTab);
  };

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
    type: 'portrait' | 'portrait-tablet' | 'portrait-mobile' | 'logo'
  ) => {
    let setUploading = setPortraitUploading;
    if (type === 'portrait-tablet') setUploading = setTabletUploading;
    if (type === 'portrait-mobile') setUploading = setMobileUploading;
    if (type === 'logo') setUploading = setLogoUploading;

    const setMsg = type === 'logo' ? setLogoMsg : setPortraitMsg;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      const res = await fetch('/api/settings/branding', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        const fullUrl = data.url + '?t=' + Date.now();
        if (type === 'portrait') setPortraitUrl(fullUrl);
        else if (type === 'portrait-tablet') setPortraitTabletUrl(fullUrl);
        else if (type === 'portrait-mobile') setPortraitMobileUrl(fullUrl);
        else if (type === 'logo') setLogoUrl(fullUrl);

        setMsg({ text: data.message, ok: true });
        if (type.startsWith('portrait')) {
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
          const s = data.settings;
          setPlatformName(s.platformName || 'منصة المايسترو');
          setIsRegistrationOpen(s.isRegistrationOpen ?? true);
          setEnableWhatsApp(s.enableWhatsApp ?? true);
          setContactPhone(s.contactPhone || '');
          setContactWhatsapp(s.contactWhatsapp || '');
          setMotivationQuote(s.motivationQuote || '');
          setPortraitOpacity(s.portraitOpacity ?? 0.18);
          setPortraitScale(s.portraitScale ?? 1.0);
          setPortraitPosition(s.portraitPosition ?? 'side');
          setLogoScale(s.logoScale ?? 1.0);

          // Populate multi-device configuration
          let loadedMulti: MultiDevicePortraitConfig = { ...DEFAULT_PORTRAIT_CONFIG };
          if (s.portraitConfig) {
            try {
              const parsed = typeof s.portraitConfig === 'string' ? JSON.parse(s.portraitConfig) : s.portraitConfig;
              if (parsed.visible !== undefined) setPortraitVisible(parsed.visible);
              if (parsed.opacity !== undefined) setPortraitOpacity(parsed.opacity);
              if (parsed.position !== undefined) setPortraitPosition(parsed.position);
              loadedMulti = {
                desktop: { ...DEFAULT_PORTRAIT_CONFIG.desktop, ...(parsed.desktop || {}) },
                tablet: { ...DEFAULT_PORTRAIT_CONFIG.tablet, ...(parsed.tablet || {}) },
                mobile: { ...DEFAULT_PORTRAIT_CONFIG.mobile, ...(parsed.mobile || {}) },
              };
            } catch {
              // fallback
            }
          } else {
            // Map legacy fields
            if (s.portraitOpacity !== undefined) loadedMulti.desktop.opacity = s.portraitOpacity;
            if (s.portraitScale !== undefined) loadedMulti.desktop.scale = s.portraitScale;
            if (s.portraitPosition !== undefined) loadedMulti.desktop.position = s.portraitPosition;
          }
          setMultiDeviceConfig(loadedMulti);
        }
        // Load WhatsApp gateway settings
        const waRes = await fetch('/api/settings/whatsapp');
        const waData = await waRes.json();
        if (waData.success && waData.settings) {
          setWaGatewayUrl(waData.settings.gatewayUrl || '');
          setWaApiToken(waData.settings.apiToken || '');
          setWaSenderNumber(waData.settings.senderNumber || '');
          setAutoSendCredentials(waData.settings.autoSendCredentials ?? true);
          setAutoSendEnabled(waData.settings.autoSendEnabled ?? false);
          setSendMode(waData.settings.sendMode || 'MANUAL');
          setScheduledDay(waData.settings.scheduledDay ?? 28);
          setScheduledTime(waData.settings.scheduledTime || '20:00');
          if (waData.settings.templates) {
            if (waData.settings.templates.student) setTplStudent(waData.settings.templates.student);
            if (waData.settings.templates.parent) setTplParent(waData.settings.templates.parent);
            if (waData.settings.templates.attendance) setTplAttendance(waData.settings.templates.attendance);
            if (waData.settings.templates.absent) setTplAbsent(waData.settings.templates.absent);
            if (waData.settings.templates.monthlyReport) setTplMonthlyReport(waData.settings.templates.monthlyReport);
            if (waData.settings.templates.payment) setTplPayment(waData.settings.templates.payment);
            if (waData.settings.templates.reminder) setTplReminder(waData.settings.templates.reminder);
          }
        }

        // Check custom portrait presences from flags loaded in /api/settings
        if (data.success && data.settings) {
          const s = data.settings;
          if (s.hasPortrait) setPortraitUrl('/api/settings/branding?type=portrait&t=' + Date.now());
          if (s.hasPortraitTablet) setPortraitTabletUrl('/api/settings/branding?type=portrait-tablet&t=' + Date.now());
          if (s.hasPortraitMobile) setPortraitMobileUrl('/api/settings/branding?type=portrait-mobile&t=' + Date.now());
          if (s.hasLogo) setLogoUrl('/api/settings/branding?type=logo&t=' + Date.now());
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

  // Load stages & groups for cleanup tab
  useEffect(() => {
    if (activeTab !== 'cleanup') return;

    async function loadCleanupData() {
      try {
        const stagesRes = await fetch('/api/stages');
        const stagesData = await stagesRes.json();
        if (stagesData.success && stagesData.stages) {
          setStagesList(stagesData.stages);
          if (stagesData.stages.length > 0) {
            setCleanupStageId(stagesData.stages[0].id);
            setCleanupAttendanceStageId(stagesData.stages[0].id);
            setVacationStageId(stagesData.stages[0].id);
          }
        }

        const groupsRes = await fetch('/api/groups');
        const groupsData = await groupsRes.json();
        if (groupsData.success && groupsData.groups) {
          setGroupsList(groupsData.groups);
          if (groupsData.groups.length > 0) {
            setCleanupGroupId(groupsData.groups[0].id);
            setCleanupAttendanceGroupId(groupsData.groups[0].id);
            setVacationGroupId(groupsData.groups[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load cleanup parameters:', err);
      }
    }

    loadCleanupData();
  }, [activeTab]);

  // Handle student live search
  useEffect(() => {
    if (cleanupAbsenceScope !== 'student' || !cleanupStudentSearch.trim()) {
      setCleanupStudentList([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCleanupSearchLoading(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(cleanupStudentSearch)}`);
        const data = await res.json();
        if (data.students) {
          setCleanupStudentList(data.students);
        }
      } catch (err) {
        console.error('Error searching students:', err);
      } finally {
        setCleanupSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [cleanupStudentSearch, cleanupAbsenceScope]);

  // Handle student live search for attendance cleanup
  useEffect(() => {
    if (cleanupAttendanceScope !== 'student' || !cleanupAttendanceStudentSearch.trim()) {
      setCleanupAttendanceStudentList([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCleanupAttendanceSearchLoading(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(cleanupAttendanceStudentSearch)}`);
        const data = await res.json();
        if (data.students) {
          setCleanupAttendanceStudentList(data.students);
        }
      } catch (err) {
        console.error('Error searching students for attendance cleanup:', err);
      } finally {
        setCleanupAttendanceSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [cleanupAttendanceStudentSearch, cleanupAttendanceScope]);

  // Handle student live search for vacation
  useEffect(() => {
    if (vacationScope !== 'student' || !vacationStudentSearch.trim()) {
      setVacationStudentList([]);
      return;
    }

    const timer = setTimeout(async () => {
      setVacationSearchLoading(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(vacationStudentSearch)}`);
        const data = await res.json();
        if (data.students) {
          setVacationStudentList(data.students);
        }
      } catch (err) {
        console.error('Error searching students for vacation:', err);
      } finally {
        setVacationSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [vacationStudentSearch, vacationScope]);

  const handleVacationAction = async (action: 'register' | 'cancel') => {
    if (vacationPassword !== '147369258') {
      setVacationStatus({ type: 'vacation', success: false, message: 'كلمة المرور غير صحيحة' });
      return;
    }

    const scopeNames = {
      all: 'جميع الطلاب',
      stage: 'المرحلة المحددة',
      group: 'المجموعة المحددة',
      student: vacationSelectedStudent ? `الطالب: ${vacationSelectedStudent.name}` : 'الطالب المحدد',
    };
    
    if (vacationScope === 'stage' && !vacationStageId) {
      setVacationStatus({ type: 'vacation', success: false, message: 'يرجى اختيار المرحلة الدراسية أولاً' });
      return;
    }
    if (vacationScope === 'group' && !vacationGroupId) {
      setVacationStatus({ type: 'vacation', success: false, message: 'يرجى اختيار المجموعة الدراسية أولاً' });
      return;
    }
    if (vacationScope === 'student' && !vacationSelectedStudent) {
      setVacationStatus({ type: 'vacation', success: false, message: 'يرجى البحث واختيار الطالب أولاً' });
      return;
    }

    const confirmMsg = action === 'register' 
      ? `⚠️ هل أنت متأكد من تسجيل يوم ${vacationDate} كإجازة لـ (${scopeNames[vacationScope]})؟`
      : `⚠️ هل أنت متأكد من إلغاء إجازة يوم ${vacationDate} لـ (${scopeNames[vacationScope]})؟`;

    const confirm = window.confirm(confirmMsg);
    if (!confirm) return;

    setVacationLoading(true);
    setVacationStatus(null);
    try {
      const res = await fetch('/api/settings/vacation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          password: vacationPassword,
          scope: vacationScope,
          stageId: vacationStageId,
          groupId: vacationGroupId,
          studentId: vacationSelectedStudent?.id,
          date: vacationDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVacationStatus({ type: 'vacation', success: true, message: data.message });
        setVacationPassword('');
        if (vacationScope === 'student') {
          setVacationSelectedStudent(null);
          setVacationStudentSearch('');
        }
      } else {
        setVacationStatus({ type: 'vacation', success: false, message: data.error || 'حدث خطأ أثناء تنفيذ الإجراء' });
      }
    } catch {
      setVacationStatus({ type: 'vacation', success: false, message: 'خطأ في الاتصال بالخادم' });
    } finally {
      setVacationLoading(false);
    }
  };

  const handleCleanAbsences = async () => {
    if (cleanupAbsencePassword !== '147369258') {
      setCleanupStatus({ type: 'attendance', success: false, message: 'كلمة المرور غير صحيحة' });
      return;
    }

    const scopeNames = {
      all: 'جميع الطلاب',
      stage: 'المرحلة المحددة',
      group: 'المجموعة المحددة',
      student: cleanupSelectedStudent ? `الطالب: ${cleanupSelectedStudent.name}` : 'الطالب المحدد',
    };
    
    if (cleanupAbsenceScope === 'stage' && !cleanupStageId) {
      setCleanupStatus({ type: 'attendance', success: false, message: 'يرجى اختيار المرحلة الدراسية أولاً' });
      return;
    }
    if (cleanupAbsenceScope === 'group' && !cleanupGroupId) {
      setCleanupStatus({ type: 'attendance', success: false, message: 'يرجى اختيار المجموعة الدراسية أولاً' });
      return;
    }
    if (cleanupAbsenceScope === 'student' && !cleanupSelectedStudent) {
      setCleanupStatus({ type: 'attendance', success: false, message: 'يرجى البحث واختيار الطالب أولاً' });
      return;
    }

    const confirm = window.confirm(`⚠️ تحذير: هل أنت متأكد من رغبتك في حذف جميع غيابات الطلاب في (${scopeNames[cleanupAbsenceScope]})؟ لا يمكن التراجع عن هذا الإجراء.`);
    if (!confirm) return;

    setCleanupLoading(true);
    setCleanupStatus(null);
    try {
      const res = await fetch('/api/settings/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'attendance',
          password: cleanupAbsencePassword,
          scope: cleanupAbsenceScope,
          stageId: cleanupStageId,
          groupId: cleanupGroupId,
          studentId: cleanupSelectedStudent?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCleanupStatus({ type: 'attendance', success: true, message: data.message });
        setCleanupAbsencePassword('');
        if (cleanupAbsenceScope === 'student') {
          setCleanupSelectedStudent(null);
          setCleanupStudentSearch('');
        }
      } else {
        setCleanupStatus({ type: 'attendance', success: false, message: data.error || 'حدث خطأ أثناء الحذف' });
      }
    } catch {
      setCleanupStatus({ type: 'attendance', success: false, message: 'خطأ في الاتصال بالخادم' });
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanAttendance = async () => {
    if (cleanupAttendancePassword !== '147369258') {
      setCleanupStatus({ type: 'attendance_present', success: false, message: 'كلمة المرور غير صحيحة' });
      return;
    }

    const scopeNames = {
      all: 'جميع الطلاب',
      stage: 'المرحلة المحددة',
      group: 'المجموعة المحددة',
      student: cleanupAttendanceSelectedStudent ? `الطالب: ${cleanupAttendanceSelectedStudent.name}` : 'الطالب المحدد',
    };
    
    if (cleanupAttendanceScope === 'stage' && !cleanupAttendanceStageId) {
      setCleanupStatus({ type: 'attendance_present', success: false, message: 'يرجى اختيار المرحلة الدراسية أولاً' });
      return;
    }
    if (cleanupAttendanceScope === 'group' && !cleanupAttendanceGroupId) {
      setCleanupStatus({ type: 'attendance_present', success: false, message: 'يرجى اختيار المجموعة الدراسية أولاً' });
      return;
    }
    if (cleanupAttendanceScope === 'student' && !cleanupAttendanceSelectedStudent) {
      setCleanupStatus({ type: 'attendance_present', success: false, message: 'يرجى البحث واختيار الطالب أولاً' });
      return;
    }

    const confirm = window.confirm(`⚠️ تحذير: هل أنت متأكد من رغبتك في حذف جميع تسجيلات حضور الطلاب في (${scopeNames[cleanupAttendanceScope]})؟ لا يمكن التراجع عن هذا الإجراء.`);
    if (!confirm) return;

    setCleanupLoading(true);
    setCleanupStatus(null);
    try {
      const res = await fetch('/api/settings/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'attendance_present',
          password: cleanupAttendancePassword,
          scope: cleanupAttendanceScope,
          stageId: cleanupAttendanceStageId,
          groupId: cleanupAttendanceGroupId,
          studentId: cleanupAttendanceSelectedStudent?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCleanupStatus({ type: 'attendance_present', success: true, message: data.message });
        setCleanupAttendancePassword('');
        if (cleanupAttendanceScope === 'student') {
          setCleanupAttendanceSelectedStudent(null);
          setCleanupAttendanceStudentSearch('');
        }
      } else {
        setCleanupStatus({ type: 'attendance_present', success: false, message: data.error || 'حدث خطأ أثناء الحذف' });
      }
    } catch {
      setCleanupStatus({ type: 'attendance_present', success: false, message: 'خطأ في الاتصال بالخادم' });
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanNotifications = async () => {
    if (cleanupNotificationPassword !== '147369258') {
      setCleanupStatus({ type: 'notifications', success: false, message: 'كلمة المرور غير صحيحة' });
      return;
    }

    const confirm = window.confirm('⚠️ تحذير هام: هل أنت متأكد من رغبتك في حذف جميع الإشعارات من المنصة نهائياً؟');
    if (!confirm) return;

    setCleanupLoading(true);
    setCleanupStatus(null);
    try {
      const res = await fetch('/api/settings/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'notifications', password: cleanupNotificationPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setCleanupStatus({ type: 'notifications', success: true, message: data.message });
        setCleanupNotificationPassword('');
      } else {
        setCleanupStatus({ type: 'notifications', success: false, message: data.error || 'حدث خطأ أثناء الحذف' });
      }
    } catch {
      setCleanupStatus({ type: 'notifications', success: false, message: 'خطأ في الاتصال بالخادم' });
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanBookings = async () => {
    if (cleanupBookingPassword !== '147369258') {
      setCleanupStatus({ type: 'registrations', success: false, message: 'كلمة المرور غير صحيحة' });
      return;
    }

    const confirm = window.confirm('⚠️ تحذير خطر: هل أنت متأكد من رغبتك في مسح كافة رسائل وطلبات الحجز نهائياً من المنصة؟');
    if (!confirm) return;

    setCleanupLoading(true);
    setCleanupStatus(null);
    try {
      const res = await fetch('/api/settings/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'registrations', password: cleanupBookingPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setCleanupStatus({ type: 'registrations', success: true, message: data.message });
        setCleanupBookingPassword('');
      } else {
        setCleanupStatus({ type: 'registrations', success: false, message: data.error || 'حدث خطأ أثناء الحذف' });
      }
    } catch {
      setCleanupStatus({ type: 'registrations', success: false, message: 'خطأ في الاتصال بالخادم' });
    } finally {
      setCleanupLoading(false);
    }
  };

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
    { id: 'cleanup', label: '🧹 تنظيف البيانات' },
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
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-5xl">
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
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-5xl">
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
        <div className="space-y-8 max-w-5xl">

          {/* ── Multi-Device Customizer & Live Frame Studio ── */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-purple-500/20 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                  استوديو تخصيص صورة المستر (Multi-Device Hero Studio)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  تخصيص كامل ومستقل للكمبيوتر، التابلت، والموبايل مع تلاشي ذكي 360° ومعاينة حية واقعية ✨
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateCurrentDeviceConfig({ visible: !multiDeviceConfig[activeDeviceTab].visible })}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    multiDeviceConfig[activeDeviceTab].visible
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-white/10 hover:text-white'
                  }`}
                >
                  {multiDeviceConfig[activeDeviceTab].visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {multiDeviceConfig[activeDeviceTab].visible ? 'الصورة مفعّلة' : 'الصورة معطلة'}
                </button>

                <button
                  type="button"
                  onClick={resetCurrentDeviceConfig}
                  title="استعادة الإعدادات الموصى بها لهذا الجهاز"
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition-all text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Smart Auto-Fit Banner */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-purple-200">🚀 دمج ذكي ناعم 360° تلقائياً:</p>
                <p className="text-slate-300 leading-relaxed">
                  المنصة تطبق تلقائياً قناع تلاشي بيضاوي ناعم لإزالة أي حواف حادة لصور السبورة أو الصور المربعة، وتدمجها كعلامة مائية فخمة.
                </p>
              </div>
            </div>

            {/* Device Switcher Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  اختر الجهاز لضبط المعاينة والأبعاد:
                </span>
                <span className="text-[11px] text-purple-400 font-mono">
                  {activeDeviceTab === 'desktop' ? '💻 شاشات الكمبيوتر (> 1024px)' : activeDeviceTab === 'tablet' ? '📱 أجهزة التابلت (768px - 1024px)' : '📲 الهواتف الذكية (< 768px)'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab('desktop')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                    activeDeviceTab === 'desktop'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                  <span className="hidden sm:inline">الكمبيوتر</span>
                  <span className="sm:hidden">كمبيوتر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDeviceTab('tablet')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                    activeDeviceTab === 'tablet'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Tablet className="w-4 h-4" />
                  <span className="hidden sm:inline">التابلت</span>
                  <span className="sm:hidden">تابلت</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDeviceTab('mobile')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                    activeDeviceTab === 'mobile'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden sm:inline">الموبايل</span>
                  <span className="sm:hidden">موبايل</span>
                </button>
              </div>
            </div>

            {/* Live Interactive Device Frame Preview */}
            <div className="space-y-2">
              <DeviceFramePreview
                device={activeDeviceTab}
                config={multiDeviceConfig[activeDeviceTab]}
                imgSrc={
                  (activeDeviceTab === 'mobile' && portraitMobileUrl)
                    ? portraitMobileUrl
                    : (activeDeviceTab === 'tablet' && portraitTabletUrl)
                    ? portraitTabletUrl
                    : (localPreviewUrl ?? portraitUrl)
                }
                platformName={platformName}
              />
            </div>

            {/* Controls for current active device */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-5">
              {/* Upload image for selected device */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">🖼️ رفع وتحديث الصورة:</span>
                  <span className="text-[10px] text-slate-500">
                    {activeDeviceTab === 'desktop'
                      ? 'الصورة الأساسية للمنصة'
                      : activeDeviceTab === 'tablet' && portraitTabletUrl
                      ? 'صورة مخصصة للتابلت مرفوعة'
                      : activeDeviceTab === 'mobile' && portraitMobileUrl
                      ? 'صورة مخصصة للموبايل مرفوعة'
                      : 'تستخدم الصورة العامة تلقائياً'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeDeviceTab === 'desktop') portraitInputRef.current?.click();
                      else if (activeDeviceTab === 'tablet') tabletInputRef.current?.click();
                      else mobileInputRef.current?.click();
                    }}
                    disabled={portraitUploading || tabletUploading || mobileUploading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-purple-500/30 hover:border-purple-400 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {(activeDeviceTab === 'desktop' && portraitUploading) ||
                    (activeDeviceTab === 'tablet' && tabletUploading) ||
                    (activeDeviceTab === 'mobile' && mobileUploading) ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        جارٍ المعالجة والضبط...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        {activeDeviceTab === 'desktop' ? 'رفع صورة المستر الأساسية' : `رفع صورة مخصصة لـ ${activeDeviceTab === 'tablet' ? 'التابلت' : 'الموبايل'}`}
                      </>
                    )}
                  </button>

                  <input
                    ref={portraitInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      await extractFromFile(f);
                      await handleBrandingUpload(f, 'portrait');
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={tabletInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      await handleBrandingUpload(f, 'portrait-tablet');
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      await handleBrandingUpload(f, 'portrait-mobile');
                      e.target.value = '';
                    }}
                  />

                  {activeDeviceTab === 'desktop' && (portraitUrl || localPreviewUrl) && !extractingColors && (
                    <button
                      type="button"
                      onClick={async () => {
                        const src = localPreviewUrl ?? portraitUrl!;
                        setExtractingColors(true);
                        const colors = await extractDominantColors(src);
                        setPalettes(generatePalettes(colors));
                        setExtractingColors(false);
                      }}
                      className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all"
                      title="إعادة استخراج الثيمات من الصورة"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {portraitMsg && (
                  <div
                    className={`flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl ${
                      portraitMsg.ok
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {portraitMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {portraitMsg.text}
                  </div>
                )}
              </div>

              {/* Smart Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  أنماط شفافة سريعة:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => updateCurrentDeviceConfig({ opacity: 0.18 })}
                    className={`py-2 px-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      multiDeviceConfig[activeDeviceTab].opacity <= 0.20
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    🌟 هادئ (18%)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCurrentDeviceConfig({ opacity: 0.28 })}
                    className={`py-2 px-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      multiDeviceConfig[activeDeviceTab].opacity > 0.20 && multiDeviceConfig[activeDeviceTab].opacity <= 0.35
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    💎 متوازن (28%)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCurrentDeviceConfig({ opacity: 0.42 })}
                    className={`py-2 px-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      multiDeviceConfig[activeDeviceTab].opacity > 0.35
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎨 بارز (42%)
                  </button>
                </div>
              </div>

              {/* Sliders Grid: Zoom / Opacity / Pan X / Pan Y */}
              <div className="space-y-4 pt-1 border-t border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Zoom / Scale */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5 text-purple-400" />
                        التقريب والتكبير (Zoom):
                      </span>
                      <span className="text-purple-400 font-mono font-bold">
                        {((multiDeviceConfig[activeDeviceTab].scale ?? 1.0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="3.50"
                      step="0.05"
                      value={multiDeviceConfig[activeDeviceTab].scale ?? 1.0}
                      onChange={(e) => updateCurrentDeviceConfig({ scale: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Opacity */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                        درجة الشفافية (Opacity):
                      </span>
                      <span className="text-purple-400 font-mono font-bold">
                        {(multiDeviceConfig[activeDeviceTab].opacity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.04"
                      max="0.90"
                      step="0.01"
                      value={multiDeviceConfig[activeDeviceTab].opacity}
                      onChange={(e) => updateCurrentDeviceConfig({ opacity: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Pan X */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Move className="w-3.5 h-3.5 text-purple-400" />
                        الإزاحة الأفقية (Pan X ↔):
                      </span>
                      <span className="text-purple-400 font-mono font-bold">
                        {(multiDeviceConfig[activeDeviceTab].posX || 0) > 0 ? `+${multiDeviceConfig[activeDeviceTab].posX}%` : `${multiDeviceConfig[activeDeviceTab].posX || 0}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      step="1"
                      value={multiDeviceConfig[activeDeviceTab].posX || 0}
                      onChange={(e) => updateCurrentDeviceConfig({ posX: parseInt(e.target.value, 10) })}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Pan Y */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Move className="w-3.5 h-3.5 text-purple-400 rotate-90" />
                        الإزاحة الرأسية (Pan Y ↕):
                      </span>
                      <span className="text-purple-400 font-mono font-bold">
                        {(multiDeviceConfig[activeDeviceTab].posY || 0) > 0 ? `+${multiDeviceConfig[activeDeviceTab].posY}%` : `${multiDeviceConfig[activeDeviceTab].posY || 0}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      step="1"
                      value={multiDeviceConfig[activeDeviceTab].posY || 0}
                      onChange={(e) => updateCurrentDeviceConfig({ posY: parseInt(e.target.value, 10) })}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Position and Fullscreen mode */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-400 block">موضع وحجم تغطية الصورة لهذا الجهاز:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => updateCurrentDeviceConfig({ position: 'fullscreen' })}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all duration-300 ${
                        multiDeviceConfig[activeDeviceTab].position === 'fullscreen'
                          ? 'border-purple-500 bg-purple-500/20 text-white shadow-md shadow-purple-500/20'
                          : 'border-white/10 bg-slate-950/40 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      ملء الشاشة 🖥️
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrentDeviceConfig({ position: 'side' })}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all duration-300 ${
                        multiDeviceConfig[activeDeviceTab].position === 'side'
                          ? 'border-purple-500 bg-purple-500/20 text-white shadow-md shadow-purple-500/20'
                          : 'border-white/10 bg-slate-950/40 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <Layout className="w-3.5 h-3.5" />
                      على الجانب 👈
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrentDeviceConfig({ position: 'center' })}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all duration-300 ${
                        multiDeviceConfig[activeDeviceTab].position === 'center'
                          ? 'border-purple-500 bg-purple-500/20 text-white shadow-md shadow-purple-500/20'
                          : 'border-white/10 bg-slate-950/40 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      في المنتصف 🎯
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Global Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        portraitConfig: multiDeviceConfig,
                        portraitOpacity: multiDeviceConfig.desktop.opacity,
                        portraitScale: multiDeviceConfig.desktop.scale,
                        portraitPosition: multiDeviceConfig.desktop.position,
                      }),
                    });
                    if (res.ok) {
                      setPortraitMsg({ text: 'تم حفظ وتطبيق إعدادات كافة الأجهزة بنجاح ✅', ok: true });
                      window.dispatchEvent(new Event('maestro-portrait-config-updated'));
                    } else {
                      setPortraitMsg({ text: 'فشل حفظ الإعدادات، تأكد من الصلاحيات ❌', ok: false });
                    }
                  } catch {
                    setPortraitMsg({ text: 'حدث خطأ أثناء حفظ التعديلات ❌', ok: false });
                  }
                }}
                className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                💾 حفظ وتطبيق إعدادات كافة الأجهزة (الكمبيوتر والتابلت والموبايل)
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
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-5xl">
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
        <div className="space-y-6 w-full max-w-6xl">
          {/* Top row cards (Gateway, Auto credentials, Cron Job) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* Card 1: Gateway Connection */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-5 bg-slate-900/40">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white">📞 إعداد HTTP Gateway</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">يعمل مع أي بوابة HTTP خارجية</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${ waTestStatus === 'success' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : waTestStatus === 'error' ? 'bg-rose-400' : 'bg-slate-600'}`} />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">Gateway URL</label>
                    <input
                      type="url"
                      value={waGatewayUrl}
                      onChange={(e) => setWaGatewayUrl(e.target.value)}
                      placeholder="https://api.ultramsg.com/.../chat"
                      className="w-full glass-input p-2.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">API Token / Secret</label>
                    <input
                      type="text"
                      value={waApiToken}
                      onChange={(e) => setWaApiToken(e.target.value)}
                      placeholder="your_api_token_here"
                      className="w-full glass-input p-2.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">رقم المرسل (Sender Number)</label>
                    <input
                      type="text"
                      value={waSenderNumber}
                      onChange={(e) => setWaSenderNumber(e.target.value)}
                      placeholder="201000000000"
                      className="w-full glass-input p-2.5 font-mono text-xs"
                    />
                  </div>
                </div>

                {waTestMsg && (
                  <p className={`text-[10px] font-semibold p-2.5 rounded-xl ${ waTestStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {waTestMsg}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/5">
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
                  className="flex-1 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-bold transition disabled:opacity-50"
                >
                  📡 اختبار
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
                          autoSendCredentials,
                          templates: { student: tplStudent, parent: tplParent, attendance: tplAttendance, absent: tplAbsent, monthlyReport: tplMonthlyReport, payment: tplPayment, reminder: tplReminder },
                        }),
                      });
                      const data = await res.json();
                      if (data.success) setSaveMsg('تم حفظ إعدادات البوابة بنجاح ✅');
                      else setSaveMsg('فشل الحفظ ❌');
                      setTimeout(() => setSaveMsg(''), 3000);
                    } catch { setSaveMsg('خطأ في الاتصال'); }
                    finally { setWaSaving(false); }
                  }}
                  disabled={waSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 font-bold text-[10px] rounded-xl disabled:opacity-50"
                >
                  💾 حفظ
                </button>
              </div>
            </div>

            {/* Card 2: Auto-send Credentials Toggle (Standalone Card!) */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-5 bg-slate-900/40">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-base text-white">🔑 إرسال بيانات الدخول</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">التحكم في إرسال اسم المستخدم وكلمة المرور للطلاب</p>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/5 mt-3">
                  <input
                    type="checkbox"
                    id="autoSendCredentialsCard"
                    checked={autoSendCredentials}
                    onChange={(e) => setAutoSendCredentials(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded bg-slate-950 border-slate-800 focus:ring-blue-500 focus:ring-2 focus:ring-offset-slate-900 mt-0.5 cursor-pointer"
                  />
                  <div className="cursor-pointer" onClick={() => setAutoSendCredentials(!autoSendCredentials)}>
                    <label htmlFor="autoSendCredentialsCard" className="block text-xs font-bold text-white cursor-pointer">
                      تفعيل الإرسال التلقائي
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      عند تفعيل هذا الخيار، سيقوم النظام تلقائياً بإرسال رسالة ترحيبية على الواتساب تحتوي على اسم المستخدم وكلمة المرور فور إضافة طالب جديد.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={async () => {
                    setWaSaving(true);
                    try {
                      const res = await fetch('/api/settings/whatsapp', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ autoSendCredentials }),
                      });
                      const data = await res.json();
                      if (data.success) setSaveMsg('تم حفظ خيار إرسال الحسابات بنجاح ✅');
                      else setSaveMsg('فشل الحفظ ❌');
                      setTimeout(() => setSaveMsg(''), 3000);
                    } catch { setSaveMsg('خطأ في الاتصال'); }
                    finally { setWaSaving(false); }
                  }}
                  disabled={waSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 font-bold text-[10px] rounded-xl disabled:opacity-50"
                >
                  {waSaving ? 'جاري الحفظ...' : '💾 حفظ خيار الإرسال'}
                </button>
              </div>
            </div>

            {/* Card 3: Cron Job Configuration */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-5 bg-slate-900/40">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-base text-white">⚙️ جدولة التقارير الشهرية</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">جدولة إرسال التقارير الشهرية لأولياء الأمور تلقائياً</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-2xl border border-white/5">
                    <div>
                      <p className="text-[10px] font-bold text-white">تفعيل الجدولة</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">التشغيل التلقائي للتقارير</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoSendEnabled}
                      onChange={(e) => {
                        setAutoSendEnabled(e.target.checked);
                        setSendMode(e.target.checked ? 'AUTOMATIC' : 'MANUAL');
                      }}
                      className="w-4 h-4 text-blue-600 rounded bg-slate-950 border-slate-800 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  {autoSendEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-300 mb-1">اليوم المحدد</label>
                        <select
                          value={scheduledDay}
                          onChange={(e) => setScheduledDay(parseInt(e.target.value))}
                          className="w-full glass-input p-2 text-[10px] text-white bg-slate-950"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <option key={day} value={day} className="bg-slate-950 text-white">
                              يوم {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-300 mb-1">الوقت المحدد</label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full glass-input p-2 text-[10px] text-white bg-slate-950 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {cronTestMsg && (
                    <p className={`text-[9px] font-semibold p-2 rounded-xl ${ cronTestStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {cronTestMsg}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={async () => {
                    setCronTestStatus('testing');
                    setCronTestMsg('جاري تشغيل الإرسال التجريبي لجميع أولياء الأمور...');
                    try {
                      const res = await fetch('/api/cron/monthly-reports', {
                        method: 'POST',
                      });
                      const data = await res.json();
                      if (data.success) {
                        setCronTestStatus('success');
                        setCronTestMsg(`✅ تم بنجاح! إرسال: ${data.successCount}، فشل: ${data.failCount}`);
                      } else {
                        setCronTestStatus('error');
                        setCronTestMsg('❌ فشل: ' + (data.error || 'خطأ غير معروف'));
                      }
                    } catch (e: any) {
                      setCronTestStatus('error');
                      setCronTestMsg('❌ خطأ في الاتصال بالخادم');
                    }
                  }}
                  disabled={cronTestStatus === 'testing'}
                  className="flex-1 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-white rounded-xl text-[10px] font-bold transition disabled:opacity-50"
                >
                  ⚡ اختبار
                </button>
                <button
                  onClick={async () => {
                    setWaSaving(true);
                    try {
                      const res = await fetch('/api/settings/whatsapp', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          autoSendEnabled,
                          sendMode: autoSendEnabled ? 'AUTOMATIC' : 'MANUAL',
                          scheduledDay,
                          scheduledTime,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) setSaveMsg('تم حفظ الجدولة بنجاح ✅');
                      else setSaveMsg('فشل الحفظ ❌');
                      setTimeout(() => setSaveMsg(''), 3000);
                    } catch { setSaveMsg('خطأ في الاتصال'); }
                    finally { setWaSaving(false); }
                  }}
                  disabled={waSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 font-bold text-[10px] rounded-xl disabled:opacity-50"
                >
                  💾 حفظ
                </button>
              </div>
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

            {/* Monthly Report Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-blue-300">📊 قالب تقرير المتابعة الشهري</label>
                <div className="flex gap-1 flex-wrap">
                  {['[student_name]', '[stage_name]', '[group_name]', '[month_name]', '[year]', '[total_sessions]', '[present_count]', '[absent_count]', '[absent_details]', '[exams_list]', '[payment_status]', '[magic_link]'].map(v => (
                    <span key={v} className="text-[9px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded font-mono cursor-pointer" onClick={() => setTplMonthlyReport(p => p + v)}>{v}</span>
                  ))}
                </div>
              </div>
              <textarea
                rows={6}
                value={tplMonthlyReport}
                onChange={(e) => setTplMonthlyReport(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-white text-xs font-mono resize-y focus:border-blue-500 focus:outline-none"
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
                      templates: { student: tplStudent, parent: tplParent, attendance: tplAttendance, absent: tplAbsent, monthlyReport: tplMonthlyReport },
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
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 max-w-5xl">
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

      {/* Tab: Data Cleanup */}
      {activeTab === 'cleanup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl w-full">
          {/* Section 1: Absence Cleanup */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-red-500/20 bg-red-950/5 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-red-400">
                  <Trash2 className="w-6 h-6" />
                  <h3 className="font-bold text-lg text-white">حذف عمليات الغياب</h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-white/5 text-[10px] font-bold text-slate-400">
                  {cleanupAbsencePassword === '147369258' ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">مفتوح</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      <span>مغلق</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                يمكنك حذف عمليات الغياب (الحالات المسجلة كـ غياب فقط) للطلاب بناءً على نطاق محدد. سيؤدي ذلك إلى إعادة تعيين حالة الحضور للطلاب في نفس اليوم. يجب إدخال كلمة سر الحماية المطلوبة أدناه لفتح زر الحذف.
              </p>

              <div className="space-y-4">
                {/* Scope Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">نطاق الحذف:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'all', label: '👥 الكل' },
                      { id: 'stage', label: '🎓 المرحلة' },
                      { id: 'group', label: '📚 المجموعة' },
                      { id: 'student', label: '👤 طالب واحد' },
                    ].map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => {
                          setCleanupAbsenceScope(scope.id as any);
                          setCleanupStatus(null);
                        }}
                        className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                          cleanupAbsenceScope === scope.id
                            ? 'border-red-500 bg-red-500/20 text-white shadow-lg shadow-red-500/10'
                            : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scope Specific Inputs */}
                {cleanupAbsenceScope === 'stage' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-300">اختر المرحلة الدراسية:</label>
                    <select
                      value={cleanupStageId}
                      onChange={(e) => setCleanupStageId(e.target.value)}
                      className="w-full glass-input p-3 text-sm bg-slate-950 text-white border-white/10"
                    >
                      {stagesList.length === 0 ? (
                        <option value="">لا توجد مراحل مضافة</option>
                      ) : (
                        stagesList.map((stage) => (
                          <option key={stage.id} value={stage.id} className="bg-slate-950">
                            {stage.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {cleanupAbsenceScope === 'group' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-300">اختر المجموعة:</label>
                    <select
                      value={cleanupGroupId}
                      onChange={(e) => setCleanupGroupId(e.target.value)}
                      className="w-full glass-input p-3 text-sm bg-slate-950 text-white border-white/10"
                    >
                      {groupsList.length === 0 ? (
                        <option value="">لا توجد مجموعات مضافة</option>
                      ) : (
                        groupsList.map((group) => (
                          <option key={group.id} value={group.id} className="bg-slate-950">
                            {group.name} ({group.academicStage?.name})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {cleanupAbsenceScope === 'student' && (
                  <div className="space-y-2 animate-fadeIn relative">
                    <label className="block text-xs font-semibold text-slate-300">ابحث عن الطالب وحدده:</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="اكتب اسم الطالب للبحث..."
                        value={cleanupStudentSearch}
                        onChange={(e) => {
                          setCleanupStudentSearch(e.target.value);
                          if (cleanupSelectedStudent) setCleanupSelectedStudent(null);
                        }}
                        className="w-full glass-input pr-10 pl-3 py-3 text-sm"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>

                    {/* Selected Student Display */}
                    {cleanupSelectedStudent && (
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
                        <span>الطالب المحدد: <strong>{cleanupSelectedStudent.name}</strong> ({cleanupSelectedStudent.group?.name || 'بدون مجموعة'})</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCleanupSelectedStudent(null);
                            setCleanupStudentSearch('');
                          }}
                          className="text-red-400 hover:text-red-300 font-bold"
                        >
                          إلغاء ❌
                        </button>
                      </div>
                    )}

                    {/* Search Results Dropdown */}
                    {!cleanupSelectedStudent && cleanupStudentSearch.trim() && (
                      <div className="absolute z-10 w-full mt-1 bg-slate-950/95 border border-white/10 rounded-2xl max-h-60 overflow-y-auto shadow-2xl backdrop-blur-xl">
                        {cleanupSearchLoading ? (
                          <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            جاري البحث...
                          </div>
                        ) : cleanupStudentList.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">لم يتم العثور على نتائج</div>
                        ) : (
                          cleanupStudentList.map((stu) => (
                            <div
                              key={stu.id}
                              onClick={() => {
                                setCleanupSelectedStudent(stu);
                                setCleanupStudentList([]);
                              }}
                              className="p-3 text-xs text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex items-center justify-between"
                            >
                              <span className="font-bold">{stu.name}</span>
                              <span className="text-[10px] text-slate-500">{stu.group?.name} | {stu.academicStage?.name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة مرور فتح الإجراء:</label>
                  <input
                    type="password"
                    placeholder="أدخل كلمة المرور لفتح الزر..."
                    value={cleanupAbsencePassword}
                    onChange={(e) => {
                      setCleanupAbsencePassword(e.target.value);
                      setCleanupStatus(null);
                    }}
                    className="w-full glass-input p-3 text-sm font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {cleanupStatus?.type === 'attendance' && (
                <div
                  className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl ${
                    cleanupStatus.success
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {cleanupStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {cleanupStatus.message}
                </div>
              )}
            </div>

            <button
              onClick={handleCleanAbsences}
              disabled={cleanupLoading || cleanupAbsencePassword !== '147369258' || (cleanupAbsenceScope === 'student' && !cleanupSelectedStudent)}
              className={`w-full mt-4 flex items-center justify-center gap-2 py-3 px-6 font-bold rounded-2xl text-sm transition-all shadow-lg ${
                cleanupAbsencePassword === '147369258' && !(cleanupAbsenceScope === 'student' && !cleanupSelectedStudent)
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              {cleanupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : cleanupAbsencePassword === '147369258' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>حذف غيابات النطاق المحدد 🗑️</span>
            </button>
          </div>

          {/* Section 1.2: Attendance Present Cleanup */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-red-500/20 bg-red-950/5 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-red-400">
                  <Trash2 className="w-6 h-6" />
                  <h3 className="font-bold text-lg text-white">حذف تسجيل الحضور</h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-white/5 text-[10px] font-bold text-slate-400">
                  {cleanupAttendancePassword === '147369258' ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">مفتوح</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      <span>مغلق</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                يمكنك حذف تسجيلات حضور الطلاب (الحالات المسجلة كـ حضور، تأخير، انصراف مبكر، أو عذر) بناءً على نطاق محدد. سيؤدي ذلك إلى إعادة تعيين حالة الحضور للطلاب في نفس اليوم. يجب إدخال كلمة سر الحماية المطلوبة أدناه لفتح زر الحذف.
              </p>

              <div className="space-y-4">
                {/* Scope Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">نطاق الحذف:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'all', label: '👥 الكل' },
                      { id: 'stage', label: '🎓 المرحلة' },
                      { id: 'group', label: '📚 المجموعة' },
                      { id: 'student', label: '👤 طالب واحد' },
                    ].map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => {
                          setCleanupAttendanceScope(scope.id as any);
                          setCleanupStatus(null);
                        }}
                        className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                          cleanupAttendanceScope === scope.id
                            ? 'border-red-500 bg-red-500/20 text-white shadow-lg shadow-red-500/10'
                            : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scope Specific Inputs */}
                {cleanupAttendanceScope === 'stage' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-300">اختر المرحلة الدراسية:</label>
                    <select
                      value={cleanupAttendanceStageId}
                      onChange={(e) => setCleanupAttendanceStageId(e.target.value)}
                      className="w-full glass-input p-3 text-sm bg-slate-950 text-white border-white/10"
                    >
                      {stagesList.length === 0 ? (
                        <option value="">لا توجد مراحل مضافة</option>
                      ) : (
                        stagesList.map((stage) => (
                          <option key={stage.id} value={stage.id} className="bg-slate-950">
                            {stage.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {cleanupAttendanceScope === 'group' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-300">اختر المجموعة:</label>
                    <select
                      value={cleanupAttendanceGroupId}
                      onChange={(e) => setCleanupAttendanceGroupId(e.target.value)}
                      className="w-full glass-input p-3 text-sm bg-slate-950 text-white border-white/10"
                    >
                      {groupsList.length === 0 ? (
                        <option value="">لا توجد مجموعات مضافة</option>
                      ) : (
                        groupsList.map((group) => (
                          <option key={group.id} value={group.id} className="bg-slate-950">
                            {group.name} ({group.academicStage?.name})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {cleanupAttendanceScope === 'student' && (
                  <div className="space-y-2 animate-fadeIn relative">
                    <label className="block text-xs font-semibold text-slate-300">ابحث عن الطالب وحدده:</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="اكتب اسم الطالب للبحث..."
                        value={cleanupAttendanceStudentSearch}
                        onChange={(e) => {
                          setCleanupAttendanceStudentSearch(e.target.value);
                          if (cleanupAttendanceSelectedStudent) setCleanupAttendanceSelectedStudent(null);
                        }}
                        className="w-full glass-input pr-10 pl-3 py-3 text-sm"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>

                    {/* Selected Student Display */}
                    {cleanupAttendanceSelectedStudent && (
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
                        <span>الطالب المحدد: <strong>{cleanupAttendanceSelectedStudent.name}</strong> ({cleanupAttendanceSelectedStudent.group?.name || 'بدون مجموعة'})</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCleanupAttendanceSelectedStudent(null);
                            setCleanupAttendanceStudentSearch('');
                          }}
                          className="text-red-400 hover:text-red-300 font-bold"
                        >
                          إلغاء ❌
                        </button>
                      </div>
                    )}

                    {/* Search Results Dropdown */}
                    {!cleanupAttendanceSelectedStudent && cleanupAttendanceStudentSearch.trim() && (
                      <div className="absolute z-10 w-full mt-1 bg-slate-950/95 border border-white/10 rounded-2xl max-h-60 overflow-y-auto shadow-2xl backdrop-blur-xl">
                        {cleanupAttendanceSearchLoading ? (
                          <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            جاري البحث...
                          </div>
                        ) : cleanupAttendanceStudentList.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">لم يتم العثور على نتائج</div>
                        ) : (
                          cleanupAttendanceStudentList.map((stu) => (
                            <div
                              key={stu.id}
                              onClick={() => {
                                setCleanupAttendanceSelectedStudent(stu);
                                setCleanupAttendanceStudentList([]);
                              }}
                              className="p-3 text-xs text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex items-center justify-between"
                            >
                              <span className="font-bold">{stu.name}</span>
                              <span className="text-[10px] text-slate-500">{stu.group?.name} | {stu.academicStage?.name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة مرور فتح الإجراء:</label>
                  <input
                    type="password"
                    placeholder="أدخل كلمة المرور لفتح الزر..."
                    value={cleanupAttendancePassword}
                    onChange={(e) => {
                      setCleanupAttendancePassword(e.target.value);
                      setCleanupStatus(null);
                    }}
                    className="w-full glass-input p-3 text-sm font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {cleanupStatus?.type === 'attendance_present' && (
                <div
                  className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl ${
                    cleanupStatus.success
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {cleanupStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {cleanupStatus.message}
                </div>
              )}
            </div>

            <button
              onClick={handleCleanAttendance}
              disabled={cleanupLoading || cleanupAttendancePassword !== '147369258' || (cleanupAttendanceScope === 'student' && !cleanupAttendanceSelectedStudent)}
              className={`w-full mt-4 flex items-center justify-center gap-2 py-3 px-6 font-bold rounded-2xl text-sm transition-all shadow-lg ${
                cleanupAttendancePassword === '147369258' && !(cleanupAttendanceScope === 'student' && !cleanupAttendanceSelectedStudent)
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              {cleanupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : cleanupAttendancePassword === '147369258' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>حذف حضور النطاق المحدد 🗑️</span>
            </button>
          </div>

          {/* Section 2: Notifications Cleanup */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-red-500/20 bg-red-950/5 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-red-400">
                  <Trash2 className="w-6 h-6" />
                  <h3 className="font-bold text-lg text-white">حذف الإشعارات</h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-white/5 text-[10px] font-bold text-slate-400">
                  {cleanupNotificationPassword === '147369258' ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">مفتوح</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      <span>مغلق</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                سيؤدي هذا الإجراء إلى حذف جميع الإشعارات والسجلات المرسلة إلى الطلاب وأولياء الأمور بالكامل من قاعدة البيانات. يجب إدخال كلمة سر الحماية المطلوبة أدناه لفتح زر الحذف.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة مرور فتح الإجراء:</label>
                  <input
                    type="password"
                    placeholder="أدخل كلمة المرور لفتح الزر..."
                    value={cleanupNotificationPassword}
                    onChange={(e) => {
                      setCleanupNotificationPassword(e.target.value);
                      setCleanupStatus(null);
                    }}
                    className="w-full glass-input p-3 text-sm font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {cleanupStatus?.type === 'notifications' && (
                <div
                  className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl ${
                    cleanupStatus.success
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {cleanupStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {cleanupStatus.message}
                </div>
              )}
            </div>

            <button
              onClick={handleCleanNotifications}
              disabled={cleanupLoading || cleanupNotificationPassword !== '147369258'}
              className={`w-full mt-4 flex items-center justify-center gap-2 py-3 px-6 font-bold rounded-2xl text-sm transition-all shadow-lg ${
                cleanupNotificationPassword === '147369258'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              {cleanupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : cleanupNotificationPassword === '147369258' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>حذف جميع الإشعارات نهائياً 🗑️</span>
            </button>
          </div>

          {/* Section 3: Booking Request Purge */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-red-500/20 bg-red-950/5 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                  <h3 className="font-bold text-lg text-white">حذف رسائل طلبات الحجز</h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-white/5 text-[10px] font-bold text-slate-400">
                  {cleanupBookingPassword === '147369258' ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">مفتوح</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      <span>مغلق</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                لحذف جميع رسائل طلبات الحجز المقدمة من الطلاب وأولياء الأمور بشكل نهائي، يجب إدخال كلمة سر الحماية المطلوبة أدناه لفتح زر الحذف.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة مرور فتح الإجراء:</label>
                  <input
                    type="password"
                    placeholder="أدخل كلمة المرور لفتح الزر..."
                    value={cleanupBookingPassword}
                    onChange={(e) => {
                      setCleanupBookingPassword(e.target.value);
                      setCleanupStatus(null);
                    }}
                    className="w-full glass-input p-3 text-sm font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {cleanupStatus?.type === 'registrations' && (
                <div
                  className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl ${
                    cleanupStatus.success
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {cleanupStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {cleanupStatus.message}
                </div>
              )}
            </div>

            <button
              onClick={handleCleanBookings}
              disabled={cleanupLoading || cleanupBookingPassword !== '147369258'}
              className={`w-full mt-4 flex items-center justify-center gap-2 py-3 px-6 font-bold rounded-2xl text-sm transition-all shadow-lg ${
                cleanupBookingPassword === '147369258'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              {cleanupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : cleanupBookingPassword === '147369258' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>حذف جميع طلبات الحجز 🗑️</span>
            </button>
          </div>

          {/* Section 4: Vacation Settings */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-indigo-500/20 bg-indigo-950/5 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-indigo-400">
                  <CalendarClock className="w-6 h-6" />
                  <h3 className="font-bold text-lg text-white">تسجيل وإلغاء الإجازات</h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-white/5 text-[10px] font-bold text-slate-400">
                  {vacationPassword === '147369258' ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">مفتوح</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      <span>مغلق</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                يمكنك تسجيل يوم إجازة للطلاب بناءً على نطاق محدد وتاريخ معين. سيتم احتساب هذا اليوم كإجازة في كشوفات البحث، سجل الطالب، والتقارير الشهرية. يمكنك أيضاً إلغاء الإجازة لنفس النطاق والتاريخ.
              </p>

              <div className="space-y-4">
                {/* Date Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">تاريخ الإجازة:</label>
                  <input
                    type="date"
                    value={vacationDate}
                    onChange={(e) => {
                      setVacationDate(e.target.value);
                      setVacationStatus(null);
                    }}
                    className="w-full glass-input p-3 text-sm text-white bg-slate-950 border-white/10"
                  />
                </div>

                {/* Scope Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">نطاق الإجازة:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'all', label: '👥 الكل' },
                      { id: 'stage', label: '🎓 المرحلة' },
                      { id: 'group', label: '📚 المجموعة' },
                      { id: 'student', label: '👤 طالب واحد' },
                    ].map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => {
                          setVacationScope(scope.id as any);
                          setVacationStatus(null);
                        }}
                        className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                          vacationScope === scope.id
                            ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/10'
                            : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scope Specific Inputs */}
                {vacationScope === 'stage' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-300">اختر المرحلة الدراسية:</label>
                    <select
                      value={vacationStageId}
                      onChange={(e) => setVacationStageId(e.target.value)}
                      className="w-full glass-input p-3 text-sm bg-slate-950 text-white border-white/10"
                    >
                      {stagesList.length === 0 ? (
                        <option value="">لا توجد مراحل مضافة</option>
                      ) : (
                        stagesList.map((stage) => (
                          <option key={stage.id} value={stage.id} className="bg-slate-950">
                            {stage.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {vacationScope === 'group' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-300">اختر المجموعة:</label>
                    <select
                      value={vacationGroupId}
                      onChange={(e) => setVacationGroupId(e.target.value)}
                      className="w-full glass-input p-3 text-sm bg-slate-950 text-white border-white/10"
                    >
                      {groupsList.length === 0 ? (
                        <option value="">لا توجد مجموعات مضافة</option>
                      ) : (
                        groupsList.map((group) => (
                          <option key={group.id} value={group.id} className="bg-slate-950">
                            {group.name} ({group.academicStage?.name})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {vacationScope === 'student' && (
                  <div className="space-y-2 animate-fadeIn relative">
                    <label className="block text-xs font-semibold text-slate-300">ابحث عن الطالب وحدده:</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="اكتب اسم الطالب للبحث..."
                        value={vacationStudentSearch}
                        onChange={(e) => {
                          setVacationStudentSearch(e.target.value);
                          if (vacationSelectedStudent) setVacationSelectedStudent(null);
                        }}
                        className="w-full glass-input pr-10 pl-3 py-3 text-sm"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>

                    {/* Selected Student Display */}
                    {vacationSelectedStudent && (
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
                        <span>الطالب المحدد: <strong>{vacationSelectedStudent.name}</strong> ({vacationSelectedStudent.group?.name || 'بدون مجموعة'})</span>
                        <button
                          type="button"
                          onClick={() => {
                            setVacationSelectedStudent(null);
                            setVacationStudentSearch('');
                          }}
                          className="text-red-400 hover:text-red-300 font-bold"
                        >
                          إلغاء ❌
                        </button>
                      </div>
                    )}

                    {/* Search Results Dropdown */}
                    {!vacationSelectedStudent && vacationStudentSearch.trim() && (
                      <div className="absolute z-10 w-full mt-1 bg-slate-950/95 border border-white/10 rounded-2xl max-h-60 overflow-y-auto shadow-2xl backdrop-blur-xl">
                        {vacationSearchLoading ? (
                          <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            جاري البحث...
                          </div>
                        ) : vacationStudentList.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">لم يتم العثور على نتائج</div>
                        ) : (
                          vacationStudentList.map((stu) => (
                            <div
                              key={stu.id}
                              onClick={() => {
                                setVacationSelectedStudent(stu);
                                setVacationStudentList([]);
                              }}
                              className="p-3 text-xs text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex items-center justify-between"
                            >
                              <span className="font-bold">{stu.name}</span>
                              <span className="text-[10px] text-slate-500">{stu.group?.name} | {stu.academicStage?.name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة مرور فتح الإجراء:</label>
                  <input
                    type="password"
                    placeholder="أدخل كلمة المرور لفتح الزر..."
                    value={vacationPassword}
                    onChange={(e) => {
                      setVacationPassword(e.target.value);
                      setVacationStatus(null);
                    }}
                    className="w-full glass-input p-3 text-sm font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {vacationStatus && (
                <div
                  className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl ${
                    vacationStatus.success
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {vacationStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {vacationStatus.message}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleVacationAction('register')}
                disabled={vacationLoading || vacationPassword !== '147369258' || (vacationScope === 'student' && !vacationSelectedStudent)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold rounded-2xl text-xs transition-all shadow-lg ${
                  vacationPassword === '147369258' && !(vacationScope === 'student' && !vacationSelectedStudent)
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
                }`}
              >
                {vacationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : vacationPassword === '147369258' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>تسجيل إجازة 📅</span>
              </button>
              
              <button
                onClick={() => handleVacationAction('cancel')}
                disabled={vacationLoading || vacationPassword !== '147369258' || (vacationScope === 'student' && !vacationSelectedStudent)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-bold rounded-2xl text-xs transition-all shadow-lg ${
                  vacationPassword === '147369258' && !(vacationScope === 'student' && !vacationSelectedStudent)
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
                }`}
              >
                {vacationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : vacationPassword === '147369258' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>إلغاء الإجازة ❌</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
