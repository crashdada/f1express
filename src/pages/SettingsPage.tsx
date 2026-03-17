import { useState } from 'react';
import { Moon, Sun, Monitor, Info, Smartphone, ChevronRight, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useF1 } from '../context/F1Context';
import { Capacitor } from '@capacitor/core';
import F1Logo from '../components/F1Logo';
import { checkForUpdates, getApkDownloadUrl } from '../components/AppUpdater';

type UpdateCheckStatus = 'idle' | 'checking' | 'up-to-date' | 'has-update' | 'error';

const SettingsPage = () => {
    const { state, dispatch } = useF1();
    const isDark = state.theme === 'dark';
    const [updateStatus, setUpdateStatus] = useState<UpdateCheckStatus>('idle');
    const [updateMsg, setUpdateMsg] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');

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
        <div className="min-h-screen pt-4 pb-24 px-4 bg-bg-primary text-primary animate-fade-in">
            <div className="max-w-md mx-auto relative pt-4">
                <h1 className="text-3xl font-bold font-orbitron mb-8 px-2 flex items-center gap-3">
                    <span className="text-f1-red">App</span> 设置
                </h1>

                {/* Theme Settings */}
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-3 px-4">外观与主题</h2>
                    <div className="glass rounded-2xl overflow-hidden border border-border shadow-sm">

                        {/* Light Mode */}
                        <button
                            onClick={() => handleThemeChange('light')}
                            className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-bg-secondary transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Sun size={20} className={!isDark ? "text-f1-red" : "text-secondary"} />
                                <span className="font-medium">浅色模式</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!isDark ? 'border-f1-red' : 'border-border'}`}>
                                {!isDark && <div className="w-2.5 h-2.5 rounded-full bg-f1-red" />}
                            </div>
                        </button>

                        {/* Dark Mode */}
                        <button
                            onClick={() => handleThemeChange('dark')}
                            className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-bg-secondary transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Moon size={20} className={isDark ? "text-blue-500" : "text-secondary"} />
                                <span className="font-medium">深色模式</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isDark ? 'border-blue-500' : 'border-border'}`}>
                                {isDark && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                            </div>
                        </button>

                        {/* System Default */}
                        <button
                            onClick={() => handleThemeChange('system')}
                            className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Monitor size={20} className="text-secondary" />
                                <span className="font-medium">跟随系统</span>
                            </div>
                            <ChevronRight size={20} className="text-muted" />
                        </button>

                    </div>
                </div>

                {/* About & Info */}
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-3 px-4">关于应用</h2>
                    <div className="glass rounded-2xl overflow-hidden border border-border shadow-sm">

                        <div className="w-full flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-3">
                                <Info size={20} className="text-secondary" />
                                <span className="font-medium">当前版本</span>
                            </div>
                            <span className="text-secondary font-mono text-sm">
                                v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.1'}
                            </span>
                        </div>

                        <div className="w-full flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-3">
                                <Smartphone size={20} className="text-secondary" />
                                <span className="font-medium">运行平台</span>
                            </div>
                            <span className="text-secondary text-sm capitalize">
                                {Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'Web Browser'}
                            </span>
                        </div>

                        {/* Check for Updates - with inline status */}
                        <div className="border-b border-border">
                            <button
                                onClick={handleCheckUpdate}
                                disabled={updateStatus === 'checking'}
                                className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary transition-colors text-left disabled:opacity-60"
                            >
                                <div className="flex items-center gap-3">
                                    {updateStatus === 'checking' ? (
                                        <RefreshCw size={20} className="text-f1-red animate-spin" />
                                    ) : updateStatus === 'up-to-date' ? (
                                        <CheckCircle2 size={20} className="text-emerald-500" />
                                    ) : updateStatus === 'has-update' ? (
                                        <Download size={20} className="text-accent-blue" />
                                    ) : updateStatus === 'error' ? (
                                        <AlertCircle size={20} className="text-red-500" />
                                    ) : (
                                        <Download size={20} className="text-secondary" />
                                    )}
                                    <span className="font-medium">
                                        {updateStatus === 'checking' ? '正在检查...' : '检查更新'}
                                    </span>
                                </div>
                                {updateStatus === 'idle' && <ChevronRight size={20} className="text-muted" />}
                            </button>

                            {/* Update status message */}
                            {updateMsg && (
                                <div className={`px-4 pb-4 text-sm font-medium ${updateStatus === 'up-to-date' ? 'text-emerald-500' :
                                    updateStatus === 'has-update' ? 'text-accent-blue' :
                                        updateStatus === 'error' ? 'text-red-500' :
                                            'text-secondary'
                                    }`}>
                                    {updateMsg}
                                </div>
                            )}

                            {/* Download button when update available */}
                            {updateStatus === 'has-update' && downloadUrl && (
                                <div className="px-4 pb-4">
                                    <button
                                        onClick={handleDownload}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-f1-red text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-f1-red/20 active:scale-95"
                                    >
                                        <Download size={16} />
                                        下载新版本 APK
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Logo Footer */}
                <div className="mt-12 mb-8 flex flex-col items-center justify-center opacity-50">
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

