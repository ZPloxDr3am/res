// Envio dos bytes à impressora: USB/compartilhada pelo spooler do Windows (modo RAW) ou rede (TCP 9100).
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PS_RAW = String.raw`
param([string]$Impressora, [string]$Arquivo, [string]$Documento)
$ErrorActionPreference = 'Stop'
if (-not ('ResRawPrinter' -as [type])) {
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ResRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] public static extern int StartDocPrinter(IntPtr h, int level, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool WritePrinter(IntPtr h, IntPtr p, int n, out int w);
  public static string Enviar(string impressora, byte[] dados, string doc) {
    IntPtr h;
    if (!OpenPrinter(impressora, out h, IntPtr.Zero)) return "Impressora não encontrada no Windows (erro " + Marshal.GetLastWin32Error() + ")";
    try {
      DOCINFO di = new DOCINFO(); di.pDocName = doc; di.pDataType = "RAW";
      if (StartDocPrinter(h, 1, di) == 0) return "Windows recusou o documento (erro " + Marshal.GetLastWin32Error() + ")";
      StartPagePrinter(h);
      IntPtr p = Marshal.AllocCoTaskMem(dados.Length);
      Marshal.Copy(dados, 0, p, dados.Length);
      int w;
      bool ok = WritePrinter(h, p, dados.Length, out w);
      Marshal.FreeCoTaskMem(p);
      EndPagePrinter(h);
      EndDocPrinter(h);
      return (ok && w == dados.Length) ? "OK" : "Falha ao enviar para a impressora (erro " + Marshal.GetLastWin32Error() + ")";
    } finally { ClosePrinter(h); }
  }
}
"@
}
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Write-Output ([ResRawPrinter]::Enviar($Impressora, [IO.File]::ReadAllBytes($Arquivo), $Documento))
`;

function powershell(args: string[], timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', ...args], { timeout: timeoutMs, windowsHide: true, encoding: 'utf8', maxBuffer: 1 << 20 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message).trim().split('\n').slice(-3).join(' ')));
      resolve(stdout.trim());
    });
  });
}

let scriptRaw: string | null = null;
function caminhoScript(dir: string) {
  if (!scriptRaw) {
    mkdirSync(dir, { recursive: true });
    scriptRaw = join(dir, 'imprimir-raw.ps1');
    // BOM para o PowerShell 5 ler os acentos das mensagens
    writeFileSync(scriptRaw, '﻿' + PS_RAW, 'utf8');
  }
  return scriptRaw;
}

/** Nomes das impressoras instaladas no Windows. */
export async function listarImpressorasWindows(): Promise<string[]> {
  const out = await powershell(['-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-Printer | Select-Object -ExpandProperty Name'], 20_000);
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

/** Envia bytes crus (ESC/POS) para uma impressora do Windows, sem passar pelo desenho do driver. */
export async function imprimirWindows(dirTrabalho: string, impressora: string, dados: Uint8Array, documento: string): Promise<void> {
  const arquivo = join(tmpdir(), `res-cupom-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
  writeFileSync(arquivo, dados);
  try {
    const r = await powershell(['-File', caminhoScript(dirTrabalho), impressora, arquivo, documento]);
    const ultima = r.split(/\r?\n/).pop() ?? '';
    if (ultima !== 'OK') throw new Error(ultima || 'Sem resposta do Windows');
  } finally {
    try {
      unlinkSync(arquivo);
    } catch {
      /* temporário */
    }
  }
}

function hostPorta(endereco: string): [string, number] {
  const [h, p] = endereco.trim().split(':');
  return [h!, Number(p) || 9100];
}

/** Impressora de rede (porta RAW 9100). */
export function imprimirRede(endereco: string, dados: Uint8Array): Promise<void> {
  const [host, porta] = hostPorta(endereco);
  return new Promise((resolve, reject) => {
    const s = createConnection({ host, port: porta, timeout: 8000 }, () => s.end(Buffer.from(dados)));
    s.on('timeout', () => s.destroy(new Error(`Sem resposta de ${host}:${porta}`)));
    s.on('error', (e) => reject(new Error(`Rede ${host}:${porta}: ${e.message}`)));
    s.on('close', (comErro) => (comErro ? undefined : resolve()));
  });
}

export function testarRede(endereco: string): Promise<boolean> {
  const [host, porta] = hostPorta(endereco);
  return new Promise((resolve) => {
    const s = createConnection({ host, port: porta, timeout: 3000 }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.on('error', () => resolve(false));
  });
}
