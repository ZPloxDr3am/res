# RES Motoboy (Android)

App Android que abre o app do motoboy do RES (`/m`) com a câmera liberada para ler o QR da comanda e o login guardado. Feito com Capacitor: o app carrega o site, então toda melhoria no RES já aparece no app sem atualizar o APK.

- Gerado pelo GitHub Actions (`.github/workflows/motoboy-app.yml`) e publicado em
  https://github.com/ZPloxDr3am/res/releases/download/motoboy-latest/RES-Motoboy.apk
- Assinatura: com os segredos `MOTOBOY_KEYSTORE_B64` (keystore em base64, alias `motoboy`) e `MOTOBOY_KEYSTORE_PASS` cadastrados no GitHub (Settings → Secrets → Actions), versões novas instalam por cima. Sem eles, cada build usa uma chave nova e é preciso desinstalar antes de instalar a versão nova — como o app só carrega o site, isso quase nunca é necessário.
- Instalar: abrir o link no celular → baixar → permitir "instalar apps desconhecidos" para o navegador → Instalar.
