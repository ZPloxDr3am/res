// Ajusta o projeto Android gerado pelo Capacitor: câmera, versão, assinatura e ícones.
import { readFileSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const app = join('android', 'app');
const run = Number(process.env.GITHUB_RUN_NUMBER || 1);

// câmera (leitor de QR) e internet
const man = join(app, 'src', 'main', 'AndroidManifest.xml');
let m = readFileSync(man, 'utf8');
if (!m.includes('android.permission.CAMERA')) {
  m = m.replace('<application', '<uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n\n    <application');
}
writeFileSync(man, m);

// versão (sobe a cada build) e assinatura fixa (mesma chave → atualiza por cima sem desinstalar)
const gradle = join(app, 'build.gradle');
let g = readFileSync(gradle, 'utf8');
g = g.replace(/versionCode \d+/, `versionCode ${run}`).replace(/versionName "[^"]*"/, `versionName "1.0.${run}"`);
if (!g.includes('signingConfigs')) {
  g = g.replace(/android \{/, `android {
    signingConfigs {
        release {
            storeFile file('motoboy.keystore')
            storePassword System.getenv('KS_PASS')
            keyAlias 'motoboy'
            keyPassword System.getenv('KS_PASS')
        }
    }`);
  g = g.replace(/buildTypes \{\s*release \{/, (s) => `${s}\n            signingConfig signingConfigs.release`);
}
writeFileSync(gradle, g);

// ícones
const res = join(app, 'src', 'main', 'res');
for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  const pasta = join(res, `mipmap-${d}`);
  copyFileSync(join('icones', `ic_launcher-${d}.png`), join(pasta, 'ic_launcher.png'));
  copyFileSync(join('icones', `ic_launcher_round-${d}.png`), join(pasta, 'ic_launcher_round.png'));
  copyFileSync(join('icones', `ic_launcher-${d}.png`), join(pasta, 'ic_launcher_foreground.png'));
}
// sem ícone adaptativo: o Android usa os PNG acima
const adapt = join(res, 'mipmap-anydpi-v26');
if (existsSync(adapt)) rmSync(adapt, { recursive: true, force: true });

console.log(`Android ajustado: versão 1.0.${run}`);
