import React, { useState, useRef, useEffect } from 'react';
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Database,
    RefreshCw,
    ShieldCheck,
    HardDrive,
    Users,
    Download,
    RotateCcw,
    Wifi
} from 'lucide-react';

interface UploadState {
    file: File | null;
    status: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
    progress: number;
}

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'has-update' | 'restarting' | 'error';

const DataManagementPage = () => {
    const [uploads, setUploads] = useState<Record<string, UploadState>>({
        'historical_data': { file: null, status: 'idle', message: '', progress: 0 },
        'sprint_data': { file: null, status: 'idle', message: '', progress: 0 },
        'outline_data': { file: null, status: 'idle', message: '', progress: 0 },
        'team_name_data': { file: null, status: 'idle', message: '', progress: 0 },
        'driver_photos': { file: null, status: 'idle', message: '', progress: 0 },
        'team_photos': { file: null, status: 'idle', message: '', progress: 0 },
    });

    const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
    const [updateMessage, setUpdateMessage] = useState('');
    const [countdown, setCountdown] = useState(0);

    // 倒计时逻辑：restarting 状态下每秒递减，到 0 时自动刷新页面
    useEffect(() => {
        if (updateStatus !== 'restarting' || countdown <= 0) return;
        if (countdown === 0) { window.location.reload(); return; }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [updateStatus, countdown]);

    const checkForUpdate = async () => {
        setUpdateStatus('checking');
        setUpdateMessage('正在检查 Docker Hub 最新版本...');
        try {
            const res = await fetch('/api/check-update');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'check failed');
            setUpdateStatus(data.hasUpdate ? 'has-update' : 'up-to-date');
            setUpdateMessage(data.message);
        } catch (e: unknown) {
            setUpdateStatus('error');
            setUpdateMessage(`❌ 检查失败：${e instanceof Error ? e.message : '未知错误'}`);
        }
    };

    const applyUpdate = async () => {
        setUpdateStatus('restarting');
        setUpdateMessage('正在应用新镜像，容器即将重启...');
        setCountdown(30);
        try {
            await fetch('/api/self-update', { method: 'POST' });
        } catch {
            // 容器重启时连接中断是预期行为，忽略网络错误
        }
    };

    const fileInputRefs = {
        'historical_data': useRef<HTMLInputElement>(null),
        'sprint_data': useRef<HTMLInputElement>(null),
        'outline_data': useRef<HTMLInputElement>(null),
        'team_name_data': useRef<HTMLInputElement>(null),
        'driver_photos': useRef<HTMLInputElement>(null),
        'team_photos': useRef<HTMLInputElement>(null),
    };

    const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            setUploads(prev => ({
                ...prev,
                [key]: { ...prev[key], file, status: 'idle', message: `已选择: ${file.name}` }
            }));
        }
    };

    // 标准文件名映射：每个上传槽对应的 csv/ 目录中的标准文件名
    const targetFileNames: Record<string, string> = {
        'historical_data': 'race_results.csv',
        'sprint_data': 'sprint_results.csv',
        'outline_data': 'race_outline.csv',
        'team_name_data': 'team_names.csv',
        'driver_photos': 'driver_photos.csv',
        'team_photos': 'team_photos.csv',
    };

    const performUpload = async (key: string) => {
        const uploadItem = uploads[key];
        if (!uploadItem.file) return;

        // 1. 设置状态为 Uploading
        setUploads(prev => ({
            ...prev,
            [key]: { ...prev[key], status: 'uploading', progress: 10, message: '正在上传文件...' }
        }));

        const formData = new FormData();
        formData.append('file', uploadItem.file);
        // 关键：告诉服务器存为哪个标准文件名（不依赖用户本地文件名）
        formData.append('targetName', targetFileNames[key]);

        // 映射文件名为后端需要的标准名 (虽然 input accept csv, 但还是要防范)
        // 这里我们要确保 server 拿到的是标准名，比如 race_results.csv
        // filename 在 server 端是直接用的 originalname，所以我们在 append 时最好重命名
        // 但目前先简单处理，假设用户选对了文件

        try {
            // 2. 发起真实请求
            const response = await fetch('/api/upload-csv', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            setUploads(prev => ({
                ...prev,
                [key]: { ...prev[key], progress: 50, message: '文件已接收，正如火如荼地同步数据库...' }
            }));

            const result = await response.json();

            // 3. 处理结果
            if (result.status === 'success' || result.data?.status === 'success') {
                setUploads(prev => ({
                    ...prev,
                    [key]: {
                        ...prev[key],
                        status: 'success',
                        progress: 100,
                        message: '✅ 同步完成！数据已更新推送到 GitHub。'
                    }
                }));
            } else {
                setUploads(prev => ({
                    ...prev,
                    [key]: {
                        ...prev[key],
                        status: 'error',
                        progress: 100,
                        message: `⚠️ 同步完成但推送失败: ${result.message}`
                    }
                }));
            }

        } catch (error) {
            console.error('Upload failed:', error);
            setUploads(prev => ({
                ...prev,
                [key]: {
                    ...prev[key],
                    status: 'error',
                    progress: 0,
                    message: '❌ 上传或同步失败，请检查 NAS 日志。'
                }
            }));
        }
    };

    const sourceFiles = [
        { id: 'historical_data', name: 'race_results.csv', icon: Database, description: '包含1950年至今的所有大奖赛结果（核心赛果表）' },
        { id: 'sprint_data', name: 'sprint_results.csv', icon: RefreshCw, description: '包含2021年起的冲刺赛排名与积分（冲刺赛结果）' },
        { id: 'outline_data', name: 'race_outline.csv', icon: FileText, description: '赛季大纲及赛次映射关系表' },
        { id: 'team_name_data', name: 'team_names.csv', icon: ShieldCheck, description: '车队中英文对照、简称及属性映射表' },
        { id: 'driver_photos', name: 'driver_photos.csv', icon: Users, description: '车手头像 URL 映射表（头像数据源）' },
        { id: 'team_photos', name: 'team_photos.csv', icon: FileText, description: '车队 Logo URL 映射表（Logo 数据源）' },
    ];

    return (
        <div className="min-h-screen py-12 px-4 bg-bg-primary text-primary transition-colors duration-300">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-f1-red/10 rounded-lg">
                                <HardDrive className="text-f1-red" size={24} />
                            </div>
                            <h1 className="text-3xl font-bold font-orbitron tracking-wider text-primary">
                                <span className="text-f1-red">F1数据</span> 管控中心
                            </h1>
                        </div>
                        <p className="text-secondary font-medium">核心源数据文件管理与手动热同步系统</p>
                    </div>
                    <div className="hidden md:block">
                        <div className="flex gap-4">
                            <div className="text-right">
                                <div className="text-xs text-muted tracking-widest mb-1">系统状态</div>
                                <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 font-bold text-sm">
                                    <span className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse" />
                                    运行正常
                                </div>
                            </div>
                            <div className="text-right border-l border-border pl-4">
                                <div className="text-xs text-muted tracking-widest mb-1">当前版本</div>
                                <div className="text-primary font-black font-orbitron text-sm">
                                    V{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Console Grid */}
                <div className="space-y-6">
                    {sourceFiles.map((source) => {
                        const upState = uploads[source.id];
                        const Icon = source.icon;

                        return (
                            <div
                                key={source.id}
                                className="glass-strong rounded-2xl border border-border p-6 hover:border-f1-red/30 transition-all duration-300 group"
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                    {/* Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Icon className="text-secondary group-hover:text-f1-red transition-colors" size={20} />
                                            <h3 className="text-lg font-bold text-primary tracking-tight">{source.name}</h3>
                                        </div>
                                        <p className="text-muted text-sm leading-relaxed">{source.description}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            className="hidden"
                                            ref={fileInputRefs[source.id as keyof typeof fileInputRefs]}
                                            onChange={(e) => handleFileChange(source.id, e)}
                                        />

                                        <button
                                            onClick={() => fileInputRefs[source.id as keyof typeof fileInputRefs].current?.click()}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-primary border border-border transition-all text-sm font-bold w-full sm:w-auto justify-center"
                                        >
                                            <FileText size={16} />
                                            选择文件
                                        </button>

                                        <button
                                            onClick={() => performUpload(source.id)}
                                            disabled={!upState.file || upState.status === 'uploading'}
                                            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold w-full sm:w-auto justify-center shadow-lg transition-all ${!upState.file || upState.status === 'uploading'
                                                ? 'bg-bg-secondary text-muted cursor-not-allowed opacity-50 border border-border'
                                                : 'bg-f1-red text-white hover:bg-red-600 shadow-f1-red/20 active:scale-95'
                                                }`}
                                        >
                                            {upState.status === 'uploading' ? (
                                                <RefreshCw size={16} className="animate-spin" />
                                            ) : (
                                                <Upload size={16} />
                                            )}
                                            {upState.status === 'uploading' ? '正在同步...' : '开始更新'}
                                        </button>
                                    </div>
                                </div>

                                {/* Progress & Message */}
                                {(upState.progress > 0 || upState.message) && (
                                    <div className="mt-6 pt-6 border-t border-border animate-slide-up">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className={`flex items-center gap-2 text-sm font-bold ${upState.status === 'success' ? 'text-emerald-500 dark:text-emerald-400' :
                                                upState.status === 'error' ? 'text-red-500 dark:text-red-400' : 'text-secondary'
                                                }`}>
                                                {upState.status === 'success' && <CheckCircle2 size={16} />}
                                                {upState.status === 'error' && <AlertCircle size={16} />}
                                                {upState.message}
                                            </div>
                                            {upState.status === 'uploading' && (
                                                <div className="text-xs font-mono text-f1-red">{upState.progress}%</div>
                                            )}
                                        </div>
                                        {upState.status === 'uploading' && (
                                            <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden border border-border">
                                                <div
                                                    className="h-full bg-f1-red transition-all duration-300 shadow-[0_0_10px_rgba(225,6,0,0.5)]"
                                                    style={{ width: `${upState.progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 glass-strong rounded-2xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-accent-blue/10 rounded-lg">
                            <Download className="text-accent-blue" size={20} />
                        </div>
                        <div>
                            <h3 className="text-primary font-bold tracking-tight">系统自动更新</h3>
                            <p className="text-muted text-xs mt-0.5">检查 Docker Hub 是否有新版本，并一键热更新容器</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* 检查更新按钮 */}
                        <button
                            onClick={checkForUpdate}
                            disabled={updateStatus === 'checking' || updateStatus === 'restarting'}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-primary border border-border transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {updateStatus === 'checking'
                                ? <RefreshCw size={16} className="animate-spin" />
                                : <Wifi size={16} />}
                            {updateStatus === 'checking' ? '检查中...' : '检查更新'}
                        </button>

                        {/* 立即更新按钮（仅在发现新版本时显示） */}
                        {updateStatus === 'has-update' && (
                            <button
                                onClick={applyUpdate}
                                className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
                            >
                                <RotateCcw size={16} />
                                立即更新并重启
                            </button>
                        )}

                        {/* 状态消息 */}
                        {updateMessage && (
                            <div className={`flex items-center gap-2 text-sm font-medium ${updateStatus === 'has-update' ? 'text-accent-blue' :
                                updateStatus === 'up-to-date' ? 'text-emerald-500 dark:text-emerald-400' :
                                    updateStatus === 'error' ? 'text-red-500 dark:text-red-400' :
                                        updateStatus === 'restarting' ? 'text-amber-500 dark:text-amber-400' :
                                            'text-secondary'
                                }`}>
                                {updateStatus === 'up-to-date' && <CheckCircle2 size={16} />}
                                {updateStatus === 'has-update' && <Download size={16} />}
                                {updateStatus === 'error' && <AlertCircle size={16} />}
                                {updateStatus === 'restarting' && <RefreshCw size={16} className="animate-spin" />}
                                {updateMessage}
                                {updateStatus === 'restarting' && countdown > 0 && (
                                    <span className="ml-2 font-mono text-xs bg-amber-400/10 px-2 py-1 rounded">
                                        {countdown}s 后自动刷新
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Warnings */}
                <div className="mt-6 p-6 rounded-2xl bg-f1-red/5 border border-f1-red/20 flex gap-4">
                    <AlertCircle className="text-f1-red shrink-0" size={24} />
                    <div>
                        <h4 className="text-f1-red font-bold mb-1 italic tracking-wider">警告：请注意数据完整性</h4>
                        <p className="text-secondary text-sm leading-relaxed">
                            上传 CSV 将会触发数据库全量重算。请确保 CSV 文件格式符合规范，否则可能会导致同步管线中断。
                            在关键操作前建议通过 <code className="bg-f1-red/10 border border-f1-red/20 px-2 py-0.5 rounded text-f1-red">python scripts/sync_f1_data.py</code> 进行本地手动校验。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataManagementPage;
