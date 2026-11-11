// Ajusta o projeto Android gerado pelo Capacitor: câmera, GPS da entrega, versão, assinatura e ícones.
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
// GPS da entrega em segundo plano (D-026): localização, serviço em primeiro plano e o aviso fixo
const permissoes = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
];
for (const p of permissoes) {
  if (!m.includes(p)) m = m.replace('<application', `<uses-permission android:name="${p}" />\n    <application`);
}
if (!m.includes('android.hardware.location.gps')) {
  m = m.replace('<application', '<uses-feature android:name="android.hardware.location.gps" android:required="false" />\n\n    <application');
}
writeFileSync(man, m);

// nome do canal do aviso fixo ("RES Motoboy · compartilhando sua rota")
const strings = join(app, 'src', 'main', 'res', 'values', 'strings.xml');
let st = readFileSync(strings, 'utf8');
if (!st.includes('capacitor_background_geolocation_notification_channel_name')) {
  st = st.replace('</resources>', '    <string name="capacitor_background_geolocation_notification_channel_name">Rota da entrega</string>\n</resources>');
  writeFileSync(strings, st);
}

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
