// RES Impressão — agente do Windows.
// 1ª vez: pede o código de pareamento (gerado no painel em Impressoras → Conectar computador),
// se instala em %LOCALAPPDATA% e liga junto com o Windows. Depois fica buscando os cupons da fila
// a cada poucos segundos e imprime direto na térmica (USB pelo spooler em modo RAW, ou rede TCP 9100).
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync, renameSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { hostname } from 'node:os';
import { join, dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { montarCupom, type CupomDados, type CupomTeste, type LayoutCupom } from '../../core/src/cupom.js';
import { gerarEscPos } from './escpos.js';
import type { Pagina } from './codepage.js';
import { imprimirRede, imprimirWindows, listarImpressorasWindows, testarRede } from './saida.js';

const VERSAO = '1.0.0';
const PAINEL_PADRAO = 'https://res-iqzs.vercel.app';
const INTERVALO_MS = 3000;

const base = process.env.APPDATA ?? process.env.HOME ?? '.';
const DIR = join(base, 'RES Impressao');
const ARQ_CONFIG = join(DIR, 'config.json');
const ARQ_LOG = join(DIR, 'agente.log');
const DIR_PROGRAMA = join(process.env.LOCALAPPDATA ?? DIR, 'RES Impressao');

type Config = { painel: string; supabaseUrl?: string; anonKey?: string; token?: string; loja?: string; computador?: string };
type Impressora = {
  id: string;
  nome: string;
  protocolo: string;
  conexao: 'usb' | 'rede';
  endereco: string | null;
  colunas: number;
  pagina_codigo: Pagina;
  espaco_linhas: number;
  pular_linhas: number;
  corte: boolean;
  gaveta: boolean;
};
type Cupom = { id: string; tipo: 'cozinha' | 'pedido' | 'teste'; motivo: string; titulo: string; conteudo: CupomDados | CupomTeste; layout: LayoutCupom; impressora_id: string };

// ---------------------------------------------------------------- utilidades
const hora = () => new Date().toLocaleTimeString('pt-BR');
function log(msg: string) {
  const linha = `[${new Date().toLocaleString('pt-BR')}] ${msg}`;
  console.log(`${hora()}  ${msg}`);
  try {
    mkdirSync(DIR, { recursive: true });
    if (existsSync(ARQ_LOG) && statSync(ARQ_LOG).size > 2_000_000) renameSync(ARQ_LOG, ARQ_LOG + '.1');
    appendFileSync(ARQ_LOG, linha + '\r\n', 'utf8');
  } catch {
    /* log é só ajuda */
  }
}
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function lerConfig(): Config {
  try {
    return { painel: PAINEL_PADRAO, ...JSON.parse(readFileSync(ARQ_CONFIG, 'utf8')) };
  } catch {
    return { painel: PAINEL_PADRAO };
  }
}
function salvarConfig(c: Config) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(ARQ_CONFIG, JSON.stringify(c, null, 2), 'utf8');
}

function argumento(nome: string): string | null {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] ?? '' : null;
}

async function perguntar(texto: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(texto)).trim();
  } finally {
    rl.close();
  }
}

class TokenInvalido extends Error {}

async function rpc<T>(c: Config, funcao: string, corpo: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${c.supabaseUrl}/rest/v1/rpc/${funcao}`, {
    method: 'POST',
    headers: { apikey: c.anonKey!, Authorization: `Bearer ${c.anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(15_000),
  });
  const txt = await r.text();
  if (!r.ok) {
    let m = txt;
    try {
      m = JSON.parse(txt).message ?? txt;
    } catch {
      /* texto puro */
    }
    if (/desconectado/i.test(m)) throw new TokenInvalido(m);
    throw new Error(`${funcao}: ${m}`);
  }
  return (txt ? JSON.parse(txt) : null) as T;
}

// ---------------------------------------------------------------- instalação
/** Copia o .exe para %LOCALAPPDATA%\RES Impressao e liga junto com o Windows (só do usuário, sem admin). */
function instalar() {
  const exe = process.execPath;
  if (!/\.exe$/i.test(exe) || /node\.exe$/i.test(exe)) return; // rodando em desenvolvimento
  const destino = join(DIR_PROGRAMA, 'RES-Impressao.exe');
  try {
    if (exe.toLowerCase() !== destino.toLowerCase()) {
      mkdirSync(dirname(destino), { recursive: true });
      try {
        copyFileSync(exe, destino);
      } catch {
        /* já aberto (atualização com o programa rodando): segue com o atual */
      }
    }
    execFile('reg', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', 'RES Impressao', '/t', 'REG_SZ', '/d', `"${existsSync(destino) ? destino : exe}"`, '/f'], { windowsHide: true }, (e) => {
      if (e) log(`Não consegui ligar junto com o Windows: ${e.message}`);
      else log('Configurado para abrir junto com o Windows.');
    });
  } catch (e) {
    log(`Instalação: ${(e as Error).message}`);
  }
}

async function parear(c: Config): Promise<Config> {
  console.log('');
  console.log('  Para conectar este computador à sua loja:');
  console.log('  1. No painel do RES, abra Impressoras → "Conectar computador".');
  console.log('  2. Digite aqui o código que aparecer (ex.: ABCD-2345).');
  console.log('');
  for (;;) {
    const codigo = argumento('--codigo') ?? (await perguntar('  Código: '));
    if (!codigo) continue;
    try {
      const r = await fetch(`${c.painel}/api/agente/parear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, nome: hostname(), versao: VERSAO }),
        signal: AbortSignal.timeout(20_000),
      });
      const j = (await r.json()) as { ok: boolean; erro?: string; token?: string; loja?: string; supabaseUrl?: string; anonKey?: string };
      if (!j.ok) {
        console.log(`  ✗ ${j.erro ?? 'Não deu certo.'}\n`);
        if (argumento('--codigo') !== null) process.exit(1);
        continue;
      }
      const novo: Config = { ...c, token: j.token, loja: j.loja, supabaseUrl: j.supabaseUrl, anonKey: j.anonKey, computador: hostname() };
      salvarConfig(novo);
      log(`Conectado à loja ${j.loja}.`);
      instalar();
      return novo;
    } catch (e) {
      console.log(`  ✗ Sem conexão com o painel (${(e as Error).message}). Confira a internet e tente de novo.\n`);
      await esperar(5000);
    }
  }
}

// ---------------------------------------------------------------- laço principal
let impressorasWin: string[] = [];
let impressorasWinEm = 0;
const redeOk = new Map<string, { ok: boolean; em: number }>();

async function atualizarWindows() {
  if (Date.now() - impressorasWinEm < 30_000) return;
  try {
    impressorasWin = await listarImpressorasWindows();
  } catch (e) {
    log(`Não consegui listar as impressoras do Windows: ${(e as Error).message}`);
  }
  impressorasWinEm = Date.now();
}

const acharWindows = (endereco: string | null) => {
  if (!endereco) return null;
  const alvo = endereco.trim().toLowerCase();
  return impressorasWin.find((n) => n.toLowerCase() === alvo) ?? null;
};

async function alcance(imps: Impressora[]) {
  const out: { id: string; ok: boolean; erro?: string }[] = [];
  for (const i of imps) {
    if (i.conexao === 'usb') {
      if (!i.endereco) out.push({ id: i.id, ok: false, erro: 'Escolha no painel qual impressora do Windows ela é.' });
      else if (acharWindows(i.endereco)) out.push({ id: i.id, ok: true });
      // impressora de outro computador da loja: não informa (outro agente cuida)
    } else if (i.endereco) {
      const cache = redeOk.get(i.endereco);
      let ok = cache?.ok ?? false;
      if (!cache || Date.now() - cache.em > 30_000) {
        ok = await testarRede(i.endereco);
        redeOk.set(i.endereco, { ok, em: Date.now() });
      }
      out.push(ok ? { id: i.id, ok: true } : { id: i.id, ok: false, erro: `Sem resposta em ${i.endereco}` });
    }
  }
  return out;
}

async function imprimir(c: Config, cupom: Cupom, imp: Impressora) {
  const linhas = montarCupom(cupom.tipo, cupom.conteudo, imp.colunas, cupom.layout ?? {}, cupom.motivo === 'reimpressao');
  const dados = gerarEscPos(linhas, imp);
  if (imp.conexao === 'rede') await imprimirRede(imp.endereco!, dados);
  else await imprimirWindows(DIR, acharWindows(imp.endereco) ?? imp.endereco!, dados, `RES ${cupom.titulo}`);
  void c;
}

async function rodar(c: Config) {
  let imps: Impressora[] = [];
  let ultimoResumo = '';
  let falhas = 0;
  for (;;) {
    try {
      await atualizarWindows();
      const r = await rpc<{ loja: string; impressoras: Impressora[]; cupons: Cupom[] }>(c, 'agente_sincronizar', {
        p_token: c.token,
        p_estado: { versao: VERSAO, impressoras_windows: impressorasWin, alcance: await alcance(imps) },
      });
      const primeira = imps.length === 0 && r.impressoras.length > 0;
      imps = r.impressoras;
      falhas = 0;
      for (const cupom of r.cupons) {
        const imp = imps.find((i) => i.id === cupom.impressora_id);
        if (!imp) continue;
        try {
          await imprimir(c, cupom, imp);
          await rpc(c, 'agente_resultado', { p_token: c.token, p_impressao: cupom.id, p_ok: true });
          log(`✓ ${cupom.titulo} → ${imp.nome}`);
        } catch (e) {
          const m = (e as Error).message;
          await rpc(c, 'agente_resultado', { p_token: c.token, p_impressao: cupom.id, p_ok: false, p_erro: m }).catch(() => undefined);
          log(`✗ ${cupom.titulo} → ${imp.nome}: ${m}`);
        }
      }
      const alc = await alcance(imps);
      const resumo = `${r.loja} · ${imps.map((i) => `${i.nome}: ${alc.find((a) => a.id === i.id)?.ok ? 'pronta' : i.conexao === 'usb' && !acharWindows(i.endereco) ? 'não está neste computador' : 'sem resposta'}`).join(' · ') || 'nenhuma impressora cadastrada'}`;
      if (resumo !== ultimoResumo) {
        log(resumo);
        ultimoResumo = resumo;
      }
      if (primeira) continue; // já sabe quais alcança: sincroniza de novo sem esperar
    } catch (e) {
      if (e instanceof TokenInvalido) {
        log('Este computador foi desconectado no painel. Vamos parear de novo.');
        const { token: _t, ...resto } = c;
        void _t;
        c = await parear(resto);
        continue;
      }
      falhas++;
      if (falhas === 1 || falhas % 20 === 0) log(`Sem conexão (${(e as Error).message}). Tentando de novo…`);
    }
    await esperar(INTERVALO_MS);
  }
}

async function main() {
  process.title = 'RES Impressão';
  console.log('');
  console.log(`  RES Impressão ${VERSAO}`);
  console.log('  Mantenha esta janela aberta (pode minimizar). Os pedidos saem sozinhos na impressora.');
  console.log(`  Registro: ${ARQ_LOG}`);
  let c = lerConfig();
  const painel = argumento('--painel');
  if (painel) c.painel = painel.replace(/\/$/, '');
  if (process.argv.includes('--desconectar')) {
    salvarConfig({ painel: c.painel });
    console.log('  Desconectado. Abra de novo para parear com outra loja.');
    return;
  }
  if (!c.token || !c.supabaseUrl || !c.anonKey) c = await parear(c);
  else instalar();
  log(`Conectado à loja ${c.loja ?? ''} como "${c.computador ?? hostname()}".`);
  await rodar(c);
}

main().catch((e) => {
  log(`Erro inesperado: ${(e as Error).stack ?? e}`);
  setTimeout(() => process.exit(1), 5000);
});
