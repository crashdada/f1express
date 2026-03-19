import { useState } from 'react';
import { Moon, Sun, Monitor, Info, Smartphone, ChevronRight, Download, RefreshCw, CheckCircle2, AlertCircle, Palette, ShieldCheck } from 'lucide-react';
import { useF1 } from '../context/F1Context';
import { Capacitor } from '@capacitor/core';
import F1Logo from '../components/F1Logo';
import { checkForUpdates, getApkDownloadUrl } from '../components/AppUpdater';
import { isAndroid } from '../utils/platform';

type UpdateCheckStatus = 'idle' | 'checking' | 'up-to-date' | 'has-update' | 'error';

const SettingsPage = () => {
    const { state, dispatch } = useF1();
    const isDark = state.theme === 'dark';
    const isAndroidShell = isAndroid();
    const [updateStatus, setUpdateStatus] = useState<UpdateCheckStatus>('idle');
    const [updateMsg, setUpdateMsg] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');

    const themeOptions = [
        {
            key: 'light' as const,
            label: '浅色模式',
            description: '更亮、更轻，适合白天和强光环境。',
            icon: Sun,
            active: !isDark,
            accent: 'text-f1-red',
            ring: 'border-f1-red',
            dot: 'bg-f1-red',
        },
        {
            key: 'dark' as const,
            label: '深色模式',
            description: '压低对比和眩光，更贴近 Android 夜间观感。',
            icon: Moon,
            active: isDark,
            accent: 'text-blue-500',
            ring: 'border-blue-500',
            dot: 'bg-blue-500',
        },
        {
            key: 'system' as const,
            label: '跟随系统',
            description: '让 App 与设备主题保持同步切换。',
            icon: Monitor,
            active: false,
            accent: 'text-secondary',
            ring: 'border-border',
            dot: 'bg-secondary',
        },
    ];

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        if (newTheme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            dispatch({ type: 'SET_THEME', payload: systemPrefersDark ? 'dark' : 'light' });
        } else {
            dispatch({ type: 'SET_THEME', payload: newTheme });
        }
    };

    const handleCheckUpdate = async () => {
        setUpdateStatus('checking');
        setUpdateMsg('正在检查最新版本...');
        setDownloadUrl('');

        const result = await checkForUpdates();

        if (result.error) {
            setUpdateStatus('error');
            setUpdateMsg('检查失败：' + result.error);
            return;
        }

        if (result.hasUpdate && result.release) {
            setUpdateStatus('has-update');
            setUpdateMsg(`发现新版本 ${result.release.tag_name}（当前 v${result.currentVersion}）`);
            setDownloadUrl(getApkDownloadUrl(result.release));
        } else {
            setUpdateStatus('up-to-date');
            setUpdateMsg(`当前已是最新版本 v${result.currentVersion}`);
        }
    };

    const handleDownload = () => {
        if (downloadUrl) {
            // _system opens in system browser on Android - allows proper APK download
            window.open(downloadUrl, '_system');
        }
    };

    return (
        <div className="min-h-screen px-4 pb-24 pt-4 bg-bg-primary text-primary animate-fade-in">
            <div className="max-w-md mx-auto relative pt-2">
                <section className={`relative overflow-hidden rounded-[32px] px-5 pb-6 pt-5 text-white shadow-2xl ${isAndroidShell ? 'android-hero-card' : 'bg-slate-900'
                    }`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(145deg,rgba(225,6,0,0.95),rgba(12,17,29,0.92)_54%,rgba(8,12,22,1))]" />
                    <div className="absolute -right-10 top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                                    Settings Deck
                                </div>
                                <h1 className="mt-4 text-3xl font-black leading-tight">
                                    把外观、更新和设备信息收进同一块控制台
                                </h1>
                                <p className="mt-3 text-sm leading-6 text-white/72">
                                    这里按 Android 的单手阅读节奏重组了主题切换、版本检查和应用信息。
                                </p>
                            </div>
                            <div className="rounded-[24px] border border-white/10 bg-black/15 p-3 backdrop-blur-xl">
                                <F1Logo className="w-14 h-auto" />
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                                <div className="text-[11px] uppercase tracking-[0.24em] text-white/65">Version</div>
                                <div className="mt-2 text-2xl font-black font-orbitron">
                                    v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Unknown'}
                                </div>
                                <div className="mt-1 text-xs text-white/75">当前安装版本</div>
                            </div>
                            <div className="rounded-[24px] border border-white/10 bg-black/15 p-4 backdrop-blur-xl">
                                <div className="text-[11px] uppercase tracking-[0.24em] text-white/65">Platform</div>
                                <div className="mt-2 text-2xl font-black capitalize">
                                    {Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'}
                                </div>
                                <div className="mt-1 text-xs text-white/75">当前运行环境</div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-5 space-y-5">
                    <section className="android-surface rounded-[28px] p-4">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-2xl bg-f1-red/10 p-3 text-f1-red">
                                <Palette size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-primary">外观与主题</h2>
                                <p className="text-sm text-secondary">首页已经统一成 Android 风格，这里继续收口主题切换。</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {themeOptions.map((option) => {
                                const Icon = option.icon;
                                const isSelected = option.key === 'system' ? false : option.active;

                                return (
                                    <button
                                        key={option.key}
                                        onClick={() => handleThemeChange(option.key)}
                                        className={`w-full rounded-[24px] border p-4 text-left transition-all duration-300 ${isSelected
                                            ? 'border-f1-red/25 bg-f1-red/6 shadow-[0_16px_30px_rgba(225,6,0,0.08)]'
                                            : 'border-border/80 bg-bg-secondary/55 hover:bg-bg-secondary'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className={`rounded-2xl p-3 ${isSelected ? 'bg-f1-red/10' : 'bg-primary/6'} ${option.accent}`}>
                                                    <Icon size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-primary">{option.label}</div>
                                                    <div className="mt-1 text-sm leading-6 text-secondary">{option.description}</div>
                                                </div>
                                            </div>
                                            <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? option.ring : 'border-border'}`}>
                                                {isSelected && <div className={`h-2.5 w-2.5 rounded-full ${option.dot}`} />}
                                                {!isSelected && option.key === 'system' && <ChevronRight size={14} className="text-muted" />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="android-surface rounded-[28px] p-4">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-2xl bg-f1-red/10 p-3 text-f1-red">
                                <Download size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-primary">版本与更新</h2>
                                <p className="text-sm text-secondary">支持在 Android 内直接检查版本并跳系统浏览器下载 APK。</p>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-border/80 bg-bg-secondary/55 p-4">
                            <button
                                onClick={handleCheckUpdate}
                                disabled={updateStatus === 'checking'}
                                className="flex w-full items-center justify-between gap-4 text-left disabled:opacity-60"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-primary/6 p-3">
                                        {updateStatus === 'checking' ? (
                                            <RefreshCw size={18} className="text-f1-red animate-spin" />
                                        ) : updateStatus === 'up-to-date' ? (
                                            <CheckCircle2 size={18} className="text-emerald-500" />
                                        ) : updateStatus === 'has-update' ? (
                                            <Download size={18} className="text-accent-blue" />
                                        ) : updateStatus === 'error' ? (
                                            <AlertCircle size={18} className="text-red-500" />
                                        ) : (
                                            <Download size={18} className="text-secondary" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-primary">
                                            {updateStatus === 'checking' ? '正在检查最新版本...' : '检查更新'}
                                        </div>
                                        <div className="mt-1 text-sm text-secondary">
                                            当前版本 v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Unknown'}
                                        </div>
                                    </div>
                                </div>
                                {updateStatus === 'idle' && <ChevronRight size={18} className="text-muted" />}
                            </button>

                            {updateMsg && (
                                <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${updateStatus === 'up-to-date'
                                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                                    : updateStatus === 'has-update'
                                        ? 'border-accent-blue/20 bg-blue-500/10 text-accent-blue'
                                        : updateStatus === 'error'
                                            ? 'border-red-500/20 bg-red-500/10 text-red-500'
                                            : 'border-border bg-bg-primary/40 text-secondary'
                                    }`}>
                                    {updateMsg}
                                </div>
                            )}

                            {updateStatus === 'has-update' && downloadUrl && (
                                <button
                                    onClick={handleDownload}
                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-f1-red py-3.5 font-bold text-white shadow-lg shadow-f1-red/20 transition-colors hover:bg-red-700 active:scale-95"
                                >
                                    <Download size={16} />
                                    下载新版本 APK
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="android-surface rounded-[28px] p-4">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-2xl bg-f1-red/10 p-3 text-f1-red">
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-primary">应用信息</h2>
                                <p className="text-sm text-secondary">保留必要状态，不再堆成一长串设置项。</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-[24px] border border-border/80 bg-bg-secondary/55 p-4">
                                <div className="flex items-center gap-3">
                                    <Info size={18} className="text-secondary" />
                                    <span className="text-sm text-secondary">当前版本</span>
                                </div>
                                <div className="mt-3 text-2xl font-black font-orbitron text-primary">
                                    v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Unknown'}
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-border/80 bg-bg-secondary/55 p-4">
                                <div className="flex items-center gap-3">
                                    <Smartphone size={18} className="text-secondary" />
                                    <span className="text-sm text-secondary">运行平台</span>
                                </div>
                                <div className="mt-3 text-2xl font-black capitalize text-primary">
                                    {Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'Web Browser'}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-10 mb-8 flex flex-col items-center justify-center opacity-55">
                    <F1Logo className="w-16 h-auto mb-4 grayscale" />
                    <p className="text-xs text-muted font-orbitron text-center uppercase tracking-widest">
                        UNOFFICIAL F1 EXPRESS<br />
                        Built with React & Capacitor
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;

