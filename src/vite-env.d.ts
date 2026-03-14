/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
    readonly PACKAGE_VERSION: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
