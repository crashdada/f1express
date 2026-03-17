import { useState } from 'react';
import { Info, Download, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck, Heart } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import F1Logo from '../components/F1Logo';
import { checkForUpdates, getApkDownloadUrl } from '../components/AppUpdater';

type UpdateCheckStatus = 'idle' | 'checking' | 'up-to-date' | 'has-update' | 'error';

const DataManagementPage = () => {
    const [updateStatus, setUpdateStatus] = useState<UpdateCheckStatus>('idle');
    const [updateMsg, setUpdateMsg] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [releaseNotes, setReleaseNotes] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const isNative = Capacitor.isNativePlatform();
    const currentVersion = typeof (window as any).__APP_VERSION__ !== 'undefined' ? (window as any).__APP_VERSION__ : '1.0.0';

    const handleCheckUpdate = async () => {
        setUpdateStatus('checking');
        setUpdateMsg(isNative ? '正在联系 GitHub 获取最新版本...' : '正在检查 Docker Hub 镜像更新...');
        setDownloadUrl('');

        if (isNative) {
            // Android APK Update Logic
            const result = await checkForUpdates();
            if (result.error) {
                setUpdateStatus('error');
                setUpdateMsg('检查失败：' + result.error);
                return;
            }
            if (result.hasUpdate && result.release) {
                setUpdateStatus('has-update');
                setUpdateMsg(`发现新版本 ${result.release.tag_name} (当前 v${result.currentVersion})`);
                setDownloadUrl(getApkDownloadUrl(result.release));
                setReleaseNotes(result.release.body || '');
            } else {
                setUpdateStatus('up-to-date');
                setUpdateMsg(`当前已是最新版本 v${result.currentVersion}`);
            }
        } else {
            // NAS Docker Update Logic
            try {
                const res = await fetch('/api/check-update');
                const data = await res.json();
                if (data.hasUpdate) {
                    setUpdateStatus('has-update');
                    setUpdateMsg(data.message || '发现新镜像版本！');
                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    setUpdateStatus('up-to-date');
                    setUpdateMsg('当前容器已是最新镜像版本');
                }
            } catch (err) {
                setUpdateStatus('error');
                setUpdateMsg('获取 Docker 更新失败，请检查 Docker Sock 挂载');
            }
        }
    };

    const handleAction = async () => {
        if (isNative) {
            if (downloadUrl) window.open(downloadUrl, '_system');
        } else {
            // Docker Self-Update
            if (confirm('确认立即更新容器？容器将重启，约 30 秒后恢复访问。')) {
                setIsUpdating(true);
                setUpdateStatus('checking');
                setUpdateMsg('更新指令已发出，正在应用镜像并重建容器...');
                try {
                    const res = await fetch('/api/self-update', { method: 'POST' });
                    const data = await res.json();
                    setUpdateMsg(data.message || '更新中，请稍后刷新页面...');
                } catch (err) {
                    setIsUpdating(false);
                    setUpdateStatus('error');
                    setUpdateMsg('发起更新失败');
                }
            }
        }
    };

    return (
        <div className="min-h-screen py-8 px-4 animate-fade-in">
            <div className="max-w-2xl mx-auto">
                <div className="mb-10 text-center">
                    <div className="inline-block p-4 glass rounded-3xl mb-4 border border-f1-red/20">
                        <F1Logo className="w-20 md:w-24 h-auto" />
                    </div>
                    <h1 className="text-4xl font-bold font-orbitron text-text-primary uppercase tracking-tighter italic">F1 <span className="text-f1-red">EXPRESS</span></h1>
                    <p className="text-text-secondary mt-2 font-medium tracking-wide">ABOUT & SYSTEM UPDATE</p>
                </div>

                <div className="grid gap-6">
                    {/* App Info Card */}
                    <div className="glass rounded-3xl p-8 border border-border shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <ShieldCheck size={120} />
                        </div>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Info className="text-accent-blue" />
                            应用信息
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-6 relative z-10">
                            <div className="bg-bg-primary/20 p-4 rounded-2xl border border-border">
                                <div className="text-sm text-text-secondary mb-1">当前版本</div>
                                <div className="text-2xl font-mono font-bold text-accent-gold">v{currentVersion}</div>
                            </div>
                            <div className="bg-bg-primary/20 p-4 rounded-2xl border border-border">
                                <div className="text-sm text-text-secondary mb-1">运行平台</div>
                                <div className="text-2xl font-bold text-accent-purple capitalize italic">
                                    {isNative ? Capacitor.getPlatform() : (window.location.hostname === 'localhost' ? 'Development' : 'NAS Server')}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-start gap-4 p-4 rounded-2xl bg-f1-red/5 border border-f1-red/10">
                            <Heart className="text-f1-red shrink-0 mt-1" size={20} />
                            <div>
                                <p className="text-sm text-text-secondary leading-relaxed font-medium">
                                    F1 EXPRESS 是一个非官方的 Formula 1 数据中心。
                                    我们致力于提供最纯净、最快速的赛车历史与即时赛果查询体验。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Update Section */}
                    <div className="glass rounded-3xl p-8 border border-border shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <RefreshCw className={updateStatus === 'checking' ? "text-f1-red animate-spin" : "text-f1-red"} />
                            {isNative ? '版本更新' : '容器维护'}
                        </h2>

                        <div className="flex flex-col gap-6">
                            <div className={`flex flex-col md:flex-row items-center justify-between p-6 bg-bg-primary/20 rounded-2xl border border-border gap-4 ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="text-center md:text-left">
                                    <div className="text-lg font-bold mb-1">{isNative ? '检查最新版本' : '检查镜像更新'}</div>
                                    <div className={`text-sm ${updateStatus === 'has-update' ? 'text-accent-blue font-bold animate-pulse' :
                                        updateStatus === 'up-to-date' ? 'text-emerald-500' : 'text-text-secondary font-medium'
                                        }`}>
                                        {updateMsg || '检查云端是否存在更新'}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCheckUpdate}
                                    disabled={updateStatus === 'checking' || isUpdating}
                                    className="px-6 py-4 rounded-2xl bg-f1-red text-white hover:bg-red-700 transition-all shadow-lg shadow-f1-red/20 active:scale-95 disabled:opacity-50 flex items-center gap-3 font-bold"
                                >
                                    <RefreshCw size={20} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                                    <span>立即检查</span>
                                </button>
                            </div>

                            {updateStatus === 'has-update' && (
                                <div className="animate-slide-up">
                                    {!isNative && (
                                        <div className="bg-blue-500/10 rounded-2xl p-6 border border-accent-blue/20 mb-6">
                                            <p className="text-sm text-accent-blue leading-relaxed font-medium">
                                                检测到 Docker Hub 有更新版本的镜像。在线更新将触发 Watchtower 自动拉取镜像并重启当前容器。30 秒内即可完成。
                                            </p>
                                        </div>
                                    )}

                                    {isNative && releaseNotes && (
                                        <div className="bg-bg-secondary/50 rounded-2xl p-6 border border-border mb-6">
                                            <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                                                <Info size={16} className="text-accent-blue" />
                                                更新说明
                                            </h3>
                                            <div className="text-xs text-text-secondary max-h-48 overflow-y-auto font-sans whitespace-pre-wrap leading-loose">
                                                {releaseNotes}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleAction}
                                        disabled={isUpdating}
                                        className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl bg-accent-blue text-white font-black text-lg hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {isUpdating ? (
                                            <>
                                                <RefreshCw size={24} className="animate-spin" />
                                                正在重启应用...
                                            </>
                                        ) : (
                                            <>
                                                <Download size={24} />
                                                {isNative ? '下载新版本 APK' : '立即在线升级镜像'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {updateStatus === 'up-to-date' && (
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 animate-fade-in font-bold justify-center">
                                    <CheckCircle2 size={20} />
                                    <span className="text-sm tracking-wide">您的系统已处于最新状态</span>
                                </div>
                            )}

                            {updateStatus === 'error' && (
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 animate-fade-in font-bold justify-center">
                                    <AlertCircle size={20} />
                                    <span className="text-sm">{updateMsg}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center opacity-30 select-none">
                    <p className="text-xs tracking-[0.3em] uppercase font-orbitron font-bold">
                        Powered by F1 Express Engine
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DataManagementPage;
