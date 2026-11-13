'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };
const feito = (): R => {
  revalidatePath('/estoque');
  return { ok: true };
};

export async function definirModoEstoque(compartilhado: boolean): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('definir_modo_estoque', { p_loja: ctx.lojaId, p_compartilhado: compartilhado });
  return error ? { ok: false, erro: error.message } : feito();
}

export async function salvarInsumo(id: string | null, dados: { nome: string; unidade: string; categoria?: string | null; minimo?: number | null; controla?: boolean; aceita_negativo?: boolean }): Promise<R<{ id: string }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('salvar_insumo', { p_loja: ctx.lojaId, p_id: id, p_dados: dados });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/estoque');
  return { ok: true, id: data as string };
}

export async function excluirInsumo(id: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('excluir_insumo', { p_loja: ctx.lojaId, p_id: id });
  return error ? { ok: false, erro: error.message } : feito();
}

/** tipo: entrada (com custo em centavos por unidade), perda ou contagem (quantidade contada). */
export async function ajustarEstoque(insumoId: string, tipo: 'entrada' | 'perda' | 'contagem', quantidade: number, custo: number | null, motivo: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('ajustar_estoque', { p_loja: ctx.lojaId, p_insumo: insumoId, p_tipo: tipo, p_qtd: quantidade, p_custo: custo, p_motivo: motivo });
  return error ? { ok: false, erro: error.message } : feito();
}

export async function vinculosFornecedor(cnpj: string): Promise<Record<string, { insumo_id: string; fator: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('vinculos_fornecedor', { p_loja: ctx.lojaId, p_cnpj: cnpj });
  return ((data as { vinculos?: Record<string, { insumo_id: string; fator: number }> } | null)?.vinculos) ?? {};
}

export type ItemImportar = {
  n: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  custo_total: number;
  acao: 'vincular' | 'novo' | 'ignorar';
  insumo_id?: string | null;
  novo?: { nome: string; unidade: string } | null;
  fator: number;
};
export async function importarNFe(nfe: { chave: string; numero: string; serie: string; emissao: string | null; emitente_cnpj: string; emitente_nome: string; valor_total: number; itens: ItemImportar[] }): Promise<R<{ entradas: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('importar_nfe', { p_loja: ctx.lojaId, p_nfe: nfe });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/estoque');
  return { ok: true, entradas: (data as { entradas: number }).entradas };
}

/** lojaId: outra loja do grupo (Meu estoque → Todas as lojas); o banco confere se a pessoa cuida do estoque dela. */
export async function salvarFicha(produtoId: string | null, opcaoId: string | null, itens: { insumo_id: string; quantidade: number }[], lojaId?: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_ficha', { p_loja: lojaId ?? ctx.lojaId, p_produto: produtoId, p_opcao: opcaoId, p_itens: itens });
  return error ? { ok: false, erro: error.message } : feito();
}

export type FiltroMovimentos = { de: string; ate: string; tipos: string[]; fornecedor: string; insumo: string; produto: string; busca: string };
/** Movimentações com filtros, resumo do período e lista (até 500). */
export async function buscarMovimentos(f: FiltroMovimentos): Promise<{ ok: true; dados: import('@/lib/estoque').MovimentosFiltrados } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('movimentos_estoque_filtro', { p_loja: ctx.lojaId, p_filtro: f });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, dados: data as import('@/lib/estoque').MovimentosFiltrados };
}

/** Leva a ficha do produto para o de mesmo nome nas outras lojas do grupo (D-038). */
export async function copiarFicha(lojaId: string | undefined, produtoId: string): Promise<R<{ copiadas: string[]; fora: { loja: string; faltam: string[] }[] }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('copiar_ficha', { p_loja: lojaId ?? ctx.lojaId, p_produto: produtoId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/estoque');
  return { ok: true, ...(data as { copiadas: string[]; fora: { loja: string; faltam: string[] }[] }) };
}

/** Contagem inteira de uma vez: o saldo de cada item vira o contado (D-038). */
export async function salvarContagem(itens: { insumo_id: string; quantidade: number }[], obs: string): Promise<R<{ mudaram: number; diferenca: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('salvar_contagem', { p_loja: ctx.lojaId, p_itens: itens, p_obs: obs });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/estoque');
  return { ok: true, ...(data as { mudaram: number; diferenca: number }) };
}

/** Tamanho de cada pizza para os sabores: {produto_id: fator} (1 = 100%) (D-040). */
export async function salvarFatoresSabor(fatores: Record<string, number>): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_fatores_sabor', { p_loja: ctx.lojaId, p_fatores: fatores });
  return error ? { ok: false, erro: error.message } : feito();
}

/** Grava a mesma ficha em todas as opções do sabor (uma por grupo de tamanho, quando há). */
export async function salvarFichaSabor(opcaoIds: string[], itens: { insumo_id: string; quantidade: number }[]): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  for (const id of opcaoIds) {
    const { error } = await supabase.rpc('salvar_ficha', { p_loja: ctx.lojaId, p_produto: null, p_opcao: id, p_itens: itens });
    if (error) return { ok: false, erro: error.message };
  }
  return feito();
}

// ---- Caixa de entrada de NF-e (D-102): certificado A1 e busca automática na SEFAZ

const MAX_PFX = 50 * 1024;

/** Recebe o .pfx e a senha, confere no servidor (abre, CNPJ, validade) e guarda; já faz a primeira busca. */
export async function nfeSalvarCertificado(form: FormData): Promise<R<{ mensagem: string }>> {
  const ctx = await contextoLoja();
  const arquivo = form.get('arquivo');
  const senha = String(form.get('senha') ?? '');
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: 'Escolha o arquivo do certificado (.pfx ou .p12).' };
  if (arquivo.size > MAX_PFX) return { ok: false, erro: 'Arquivo grande demais para um certificado A1.' };
  if (!senha) return { ok: false, erro: 'Digite a senha do certificado.' };
  const { lerCertificado, ErroCertificado } = await import('@/lib/nfe/certificado');
  const pfx = Buffer.from(await arquivo.arrayBuffer());
  let cert;
  try {
    cert = lerCertificado(pfx, senha);
  } catch (e) {
    return { ok: false, erro: e instanceof ErroCertificado ? e.message : 'Não consegui abrir o certificado.' };
  }
  if (!cert.cnpj) return { ok: false, erro: 'Este certificado não é de empresa (e-CNPJ). A busca de notas precisa do A1 do CNPJ da loja.' };
  if (cert.validoAte.getTime() < Date.now()) return { ok: false, erro: `Este certificado venceu em ${cert.validoAte.toLocaleDateString('pt-BR')}.` };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('nfe_auto_salvar_certificado', {
    p_loja: ctx.lojaId,
    p_pfx_base64: pfx.toString('base64'),
    p_senha: senha,
    p_cnpj_certificado: cert.cnpj,
    p_titular: cert.titular,
    p_validade: cert.validoAte.toISOString(),
  });
  if (error) return { ok: false, erro: error.message };
  const { sincronizarLoja } = await import('@/lib/nfe/sefaz');
  const r = await sincronizarLoja(ctx.lojaId);
  revalidatePath('/estoque');
  return { ok: true, mensagem: `Certificado de ${cert.titular} salvo (válido até ${cert.validoAte.toLocaleDateString('pt-BR')}). Primeira busca: ${r.mensagem}` };
}

export async function nfeRemoverCertificado(): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('nfe_auto_remover', { p_loja: ctx.lojaId });
  return error ? { ok: false, erro: error.message } : feito();
}

/** "Buscar agora": respeita a regra de 1 hora da SEFAZ (avisa quando pode). */
export async function nfeBuscarAgora(): Promise<R<{ mensagem: string }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('nfe_auto_situacao', { p_loja: ctx.lojaId }); // confere o acesso
  if (error) return { ok: false, erro: error.message };
  const { sincronizarLoja } = await import('@/lib/nfe/sefaz');
  const r = await sincronizarLoja(ctx.lojaId);
  revalidatePath('/estoque');
  return r.ok ? { ok: true, mensagem: r.mensagem } : { ok: false, erro: r.mensagem };
}

export async function nfeXmlRecebida(id: string): Promise<R<{ xml: string }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('nfe_auto_xml', { p_loja: ctx.lojaId, p_id: id });
  return error ? { ok: false, erro: error.message } : { ok: true, xml: data as string };
}

export async function nfeIgnorarRecebida(id: string, ignorar: boolean): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('nfe_auto_ignorar', { p_loja: ctx.lojaId, p_id: id, p_ignorar: ignorar });
  return error ? { ok: false, erro: error.message } : feito();
}
