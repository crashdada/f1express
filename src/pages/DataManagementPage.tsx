import { useState } from 'react';
import { Info, Download, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck, Heart } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import F1Logo from '../components/F1Logo';
import { checkForUpdates, getApkDownloadUrl } from '../components/AppUpdater';

type UpdateCheckStatus = 'idle' | 'checking' | 'up-to-date' | 'has-update' | 'error';

const ADMIN_TOKEN_STORAGE_KEY = 'f1express-admin-token';

const getStoredAdminToken = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';
};

const buildAdminHeaders = (token: string): HeadersInit => {
    const trimmedToken = token.trim();
    return trimmedToken ? { 'x-admin-token': trimmedToken } : {};
};

const parseApiError = async (response: Response, fallbackMessage: string) => {
    try {
        const data = await response.json();
        return data.error || data.message || fallbackMessage;
    } catch {
        return fallbackMessage;
    }
};

const DataManagementPage = () => {
    const [updateStatus, setUpdateStatus] = useState<UpdateCheckStatus>('idle');
    const [updateMsg, setUpdateMsg] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [releaseNotes, setReleaseNotes] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [adminToken, setAdminToken] = useState(() => getStoredAdminToken());

    const isNative = Capacitor.isNativePlatform();
    const currentVersion = typeof (window as any).__APP_VERSION__ !== 'undefined' ? (window as any).__APP_VERSION__ : '1.0.0';

    const handleAdminTokenChange = (value: string) => {
        setAdminToken(value);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, value);
        }
    };

    const handleCheckUpdate = async () => {
        setUpdateStatus('checking');
        setUpdateMsg(isNative ? 'Checking GitHub for the latest release...' : 'Checking Docker Hub for a newer image...');
        setDownloadUrl('');
        setReleaseNotes('');

        if (isNative) {
            const result = await checkForUpdates();
            if (result.error) {
                setUpdateStatus('error');
                setUpdateMsg(`Check failed: ${result.error}`);
                return;
            }

            if (result.hasUpdate && result.release) {
                setUpdateStatus('has-update');
                setUpdateMsg(`New version ${result.release.tag_name} found (current v${result.currentVersion})`);
                setDownloadUrl(getApkDownloadUrl(result.release));
                setReleaseNotes(result.release.body || '');
            } else {
                setUpdateStatus('up-to-date');
                setUpdateMsg(`You are already on the latest version v${result.currentVersion}`);
            }

            return;
        }

        try {
            const res = await fetch('/api/check-update', {
                headers: buildAdminHeaders(adminToken),
            });
            if (!res.ok) {
                throw new Error(await parseApiError(res, 'Failed to check Docker image updates.'));
            }

            const data = await res.json();
            if (data.hasUpdate) {
                setUpdateStatus('has-update');
                setUpdateMsg(data.message || 'A newer Docker image is available.');
            } else {
                setUpdateStatus('up-to-date');
                setUpdateMsg(data.message || 'This deployment is already using the latest Docker image.');
            }
        } catch (err) {
            setUpdateStatus('error');
            setUpdateMsg(err instanceof Error ? err.message : 'Failed to check Docker updates.');
        }
    };

    const handleAction = async () => {
        if (isNative) {
            if (downloadUrl) {
                window.open(downloadUrl, '_system');
            }
            return;
        }

        if (!window.confirm('Apply the latest Docker image now? The service will restart and should come back within about one minute.')) {
            return;
        }

        setIsUpdating(true);
        setUpdateStatus('checking');
        setUpdateMsg('Update request sent. Applying the new image and restarting the container...');

        try {
            const res = await fetch('/api/self-update', {
                method: 'POST',
                headers: buildAdminHeaders(adminToken),
            });
            if (!res.ok) {
                throw new Error(await parseApiError(res, 'Failed to trigger the Docker self-update.'));
            }

            const data = await res.json();
            setUpdateMsg(data.message || 'Update in progress. Refresh this page in about one minute.');
        } catch (err) {
            setIsUpdating(false);
            setUpdateStatus('error');
            setUpdateMsg(err instanceof Error ? err.message : 'Failed to trigger the Docker self-update.');
        }
    };

    return (
        <div className="min-h-screen animate-fade-in px-4 py-8">
            <div className="mx-auto max-w-2xl">
                <div className="mb-10 text-center">
                    <div className="mb-4 inline-block rounded-3xl border border-f1-red/20 p-4 glass">
                        <F1Logo className="h-auto w-20 md:w-24" />
                    </div>
                    <h1 className="font-orbitron text-4xl font-bold uppercase tracking-tighter italic text-text-primary">
                        F1 <span className="text-f1-red">EXPRESS</span>
                    </h1>
                    <p className="mt-2 font-medium tracking-wide text-text-secondary">ABOUT & SYSTEM UPDATE</p>
                </div>

                <div className="grid gap-6">
                    <div className="relative overflow-hidden rounded-3xl border border-border p-8 shadow-2xl glass">
                        <div className="absolute right-0 top-0 p-8 opacity-5">
                            <ShieldCheck size={120} />
                        </div>
                        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
                            <Info className="text-accent-blue" />
                            应用信息
                        </h2>
                        <div className="relative z-10 grid gap-6 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border bg-bg-primary/20 p-4">
                                <div className="mb-1 text-sm text-text-secondary">当前版本</div>
                                <div className="font-mono text-2xl font-bold text-accent-gold">v{currentVersion}</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg-primary/20 p-4">
                                <div className="mb-1 text-sm text-text-secondary">运行平台</div>
                                <div className="text-2xl font-bold capitalize italic text-accent-purple">
                                    {isNative ? Capacitor.getPlatform() : (window.location.hostname === 'localhost' ? 'Development' : 'NAS Server')}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-f1-red/10 bg-f1-red/5 p-4">
                            <Heart className="mt-1 shrink-0 text-f1-red" size={20} />
                            <div>
                                <p className="text-sm font-medium leading-relaxed text-text-secondary">
                                    F1 Express 是一个非官方 Formula 1 数据中心，目标是提供纯净、快速、适合多终端的赛车历史与赛季数据体验。
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-border p-8 shadow-2xl glass">
                        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
                            <RefreshCw className={updateStatus === 'checking' ? 'animate-spin text-f1-red' : 'text-f1-red'} />
                            {isNative ? '版本更新' : '容器维护'}
                        </h2>

                        <div className="flex flex-col gap-6">
                            {!isNative && (
                                <label className="flex flex-col gap-3 rounded-2xl border border-border bg-bg-primary/20 p-5">
                                    <span className="text-sm font-bold text-text-primary">Admin API Token</span>
                                    <input
                                        type="password"
                                        value={adminToken}
                                        onChange={(event) => handleAdminTokenChange(event.target.value)}
                                        placeholder="Required only when the server sets ADMIN_API_TOKEN"
                                        className="w-full rounded-2xl border border-border bg-bg-primary/50 px-4 py-3 text-sm text-text-primary outline-none transition focus:border-f1-red"
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                    <span className="text-xs text-text-secondary">
                                        The token is stored locally in this browser and sent only with admin maintenance requests.
                                    </span>
                                </label>
                            )}

                            <div className={`flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-bg-primary/20 p-6 md:flex-row ${isUpdating ? 'pointer-events-none opacity-50' : ''}`}>
                                <div className="text-center md:text-left">
                                    <div className="mb-1 text-lg font-bold">{isNative ? '检查最新版本' : '检查镜像更新'}</div>
                                    <div
                                        className={`text-sm ${
                                            updateStatus === 'has-update'
                                                ? 'animate-pulse font-bold text-accent-blue'
                                                : updateStatus === 'up-to-date'
                                                  ? 'text-emerald-500'
                                                  : 'font-medium text-text-secondary'
                                        }`}
                                    >
                                        {updateMsg || '检查云端是否存在新版本'}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCheckUpdate}
                                    disabled={updateStatus === 'checking' || isUpdating}
                                    className="flex items-center gap-3 rounded-2xl bg-f1-red px-6 py-4 font-bold text-white shadow-lg shadow-f1-red/20 transition-all active:scale-95 hover:bg-red-700 disabled:opacity-50"
                                >
                                    <RefreshCw size={20} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                                    <span>立即检查</span>
                                </button>
                            </div>

                            {updateStatus === 'has-update' && (
                                <div className="animate-slide-up">
                                    {!isNative && (
                                        <div className="mb-6 rounded-2xl border border-accent-blue/20 bg-blue-500/10 p-6">
                                            <p className="text-sm font-medium leading-relaxed text-accent-blue">
                                                检测到 Docker Hub 存在更新镜像。在线升级会触发 Watchtower 拉取镜像并重启当前容器。
                                            </p>
                                        </div>
                                    )}

                                    {isNative && releaseNotes && (
                                        <div className="mb-6 rounded-2xl border border-border bg-bg-secondary/50 p-6">
                                            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                                                <Info size={16} className="text-accent-blue" />
                                                更新说明
                                            </h3>
                                            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-loose text-text-secondary">
                                                {releaseNotes}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleAction}
                                        disabled={isUpdating}
                                        className="flex w-full items-center justify-center gap-3 rounded-3xl bg-accent-blue py-5 text-lg font-black text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95 hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {isUpdating ? (
                                            <>
                                                <RefreshCw size={24} className="animate-spin" />
                                                正在重启应用...
                                            </>
                                        ) : (
                                            <>
                                                <Download size={24} />
                                                {isNative ? '下载新版 APK' : '立即在线升级镜像'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {updateStatus === 'up-to-date' && (
                                <div className="flex animate-fade-in items-center justify-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-500">
                                    <CheckCircle2 size={20} />
                                    <span className="text-sm tracking-wide">系统已经处于最新状态</span>
                                </div>
                            )}

                            {updateStatus === 'error' && (
                                <div className="flex animate-fade-in items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-500">
                                    <AlertCircle size={20} />
                                    <span className="text-sm">{updateMsg}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center opacity-30 select-none">
                    <p className="font-orbitron text-xs font-bold uppercase tracking-[0.3em]">
                        Powered by F1 Express Engine
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DataManagementPage;
