import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.f1datahub.app',
    appName: 'F1 Express',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
    android: {
        allowMixedContent: false,
        // 允许 WebAssembly (sql.js 需要)
        webContentsDebuggingEnabled: false,
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#0B101A',
            showSpinner: false,
        },
    },
};

export default config;
