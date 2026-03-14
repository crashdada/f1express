import sharp from 'sharp';

async function generateAssets() {
    const logoPath = './assets/logo.svg';

    // 先预生成缩放后的 F1 SVG Buffer (用于桌面图标 600px 宽)
    const logoBuffer = await sharp(logoPath)
        .resize(600)
        .toBuffer();

    // 先预生成缩放后的 F1 SVG Buffer (用于闪屏 1000px 宽)
    const splashLogoBuffer = await sharp(logoPath)
        .resize(1000)
        .toBuffer();

    // 1. icon-foreground.png (1024x1024, 完全透明底)
    await sharp({
        create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } }
    })
        .composite([{ input: logoBuffer, gravity: 'center' }])
        .png()
        .toFile('./assets/icon-foreground.png');
    console.log('Generated assets/icon-foreground.png');

    // 2. icon-background.png (1024x1024, 纯白底)
    await sharp({
        create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
    })
        .png()
        .toFile('./assets/icon-background.png');
    console.log('Generated assets/icon-background.png');

    // 3. icon.png (Fallback for older Android / iOS) (1024x1024, 纯白底 + Logo)
    await sharp({
        create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
    })
        .composite([{ input: logoBuffer, gravity: 'center' }])
        .png()
        .toFile('./assets/icon.png');
    console.log('Generated assets/icon.png');

    // 4. splash.png (2732x2732, 纯白底 + Logo)
    await sharp({
        create: { width: 2732, height: 2732, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
    })
        .composite([{ input: splashLogoBuffer, gravity: 'center' }])
        .png()
        .toFile('./assets/splash.png');
    console.log('Generated assets/splash.png');
}

generateAssets().catch(console.error);
