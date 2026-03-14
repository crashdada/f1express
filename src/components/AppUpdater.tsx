import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, X } from 'lucide-react';

interface ReleaseInfo {
    tag_name: string;
    body: string;
    assets: { browser_download_url: string; name: string }[];
}

// Shared update check logic - can be called from anywhere
export async function checkForUpdates(): Promise<{
    hasUpdate: boolean;
    release: ReleaseInfo | null;
    currentVersion: string;
    latestVersion: string;
    error?: string;
}> {
    // @ts-ignore
    const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.5.0';

    try {
        const res = await fetch('https://api.github.com/repos/crashdada/f1-website/releases/latest');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ReleaseInfo = await res.json();

        const latestVersion = data.tag_name.replace('v', '');
        const isNewer = compareVersions(latestVersion, currentVersion);

        return {
            hasUpdate: isNewer,
            release: isNewer ? data : null,
            currentVersion,
            latestVersion,
        };
    } catch (error) {
        return {
            hasUpdate: false,
            release: null,
            currentVersion,
            latestVersion: '',
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
}

function compareVersions(latest: string, current: string) {
    const lParts = latest.split('.').map(Number);
    const cParts = current.split('.').map(Number);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
        const l = lParts[i] || 0;
        const c = cParts[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

export function getApkDownloadUrl(release: ReleaseInfo): string {
    const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
    return apkAsset ? apkAsset.browser_download_url : `https://github.com/crashdada/f1-website/releases/tag/${release.tag_name}`;
}

export function AppUpdater() {
    const [showModal, setShowModal] = useState(false);
    const [release, setRelease] = useState<ReleaseInfo | null>(null);

    const doCheck = useCallback(async (manual: boolean) => {
        const result = await checkForUpdates();

        if (result.error) {
            if (manual) alert('检查更新失败：' + result.error);
            return;
        }

        if (result.hasUpdate && result.release) {
            setRelease(result.release);
            setShowModal(true);
        } else if (manual) {
            alert('当前已是最新版本 (' + result.currentVersion + ')');
        }
    }, []);

    useEffect(() => {
        // Auto-check on app launch for native platforms
        if (Capacitor.isNativePlatform()) {
            doCheck(false);
        }

        // Expose global method for SettingsPage
        (window as any).checkForAppUpdates = (manual = true) => {
            doCheck(manual);
        };
    }, [doCheck]);

    if (!showModal || !release) return null;

    const downloadUrl = getApkDownloadUrl(release);

    const handleDownload = () => {
        // Use window.open to open in system browser (works in Capacitor WebView)
        window.open(downloadUrl, '_system');
        setShowModal(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-bg-primary border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                <button
                    onClick={() => setShowModal(false)}
                    className="absolute top-4 right-4 text-secondary hover:text-f1-red transition-colors"
                >
                    <X size={24} />
                </button>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-f1-red/10 rounded-full flex items-center justify-center text-f1-red">
                        <Download size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">发现新版本</h3>
                        <p className="text-sm font-mono text-muted">{release.tag_name}</p>
                    </div>
                </div>

                <div className="bg-bg-secondary rounded-xl p-3 mb-6 max-h-40 overflow-y-auto text-sm text-secondary">
                    <pre className="whitespace-pre-wrap font-sans">
                        {release.body || '无更新说明'}
                    </pre>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-3 rounded-xl border border-border text-secondary font-medium hover:bg-bg-secondary transition-colors"
                    >
                        稍后再说
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex-1 py-3 rounded-xl bg-f1-red text-white font-medium hover:bg-red-700 transition-colors text-center flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        立即下载
                    </button>
                </div>
            </div>
        </div>
    );
}
