// Tipos e utilidades do app do motoboy (JSON de public.motoboy_painel / motoboy_despachar; centavos).
import { formatarReais, PAGAMENTO_ROTULO, type FormaPagamento } from '@res/core';

export type Entrega = {
  id: string;
  numero: number;
  status: string;
  loja: string;
  cidade: string | null;
  marca: string;
  cliente: string;
  telefone: string | null;
  endereco: { logradouro: string; numero?: string; complemento?: string; bairro: string; referencia?: string } | null;
  observacao: string | null;
  pagamento: FormaPagamento;
  total: number;
  troco_para: number | null;
  cobrar: boolean;
  /** marcado como pago no painel (ex.: Pix antecipado) */
  pago_em?: string | null;
  itens: { quantidade: number; nome: string }[];
  entregador: string | null;
  saiu_em: string | null;
};

export type PainelMotoboy = {
  nome: string;
  em_rota: Entrega[];
  prontos: { numero: number; loja: string; bairro: string | null; pronto_em: string | null; status: string }[];
  hoje: { entregas: number; cobrado_dinheiro: number; cobrado_outros: number; taxas: number };
};

/** Linha de endereço para o mapa (rua, número, bairro, cidade da loja). */
export function enderecoMapa(e: Entrega): string {
  const a = e.endereco;
  if (!a) return '';
  return [`${a.logradouro}${a.numero ? `, ${a.numero}` : ''}`, a.bairro, e.cidade].filter(Boolean).join(' - ');
}

/** Abre o Google Maps já com a rota (no celular abre o app do Maps). */
export const linkMaps = (e: Entrega) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoMapa(e))}&travelmode=driving`;
/** APK do app Android do motoboy (gerado pelo GitHub Actions, release motoboy-latest). */
export const LINK_APP_ANDROID = 'https://github.com/ZPloxDr3am/res/releases/download/motoboy-latest/RES-Motoboy.apk';

export const linkWaze = (e: Entrega) => `https://waze.com/ul?q=${encodeURIComponent(enderecoMapa(e))}&navigate=yes`;

const soDigitos = (t: string) => t.replace(/\D/g, '');
export const linkLigar = (tel: string) => `tel:+55${soDigitos(tel)}`;
export const linkWhats = (tel: string, texto: string) => `https://wa.me/55${soDigitos(tel)}?text=${encodeURIComponent(texto)}`;

/** O que o motoboy precisa saber do pagamento, em uma frase. */
export function cobranca(e: Entrega): { cobrar: boolean; titulo: string; detalhe: string } {
  if (!e.cobrar) return { cobrar: false, titulo: 'PAGO — NÃO COBRAR', detalhe: e.pagamento === 'online' ? 'O cliente já pagou online.' : `Pagamento (${PAGAMENTO_ROTULO[e.pagamento]}) já recebido pela loja.` };
  const valor = formatarReais(e.total);
  if (e.pagamento === 'dinheiro') {
    if (e.troco_para && e.troco_para > e.total) {
      return { cobrar: true, titulo: `COBRAR ${valor}`, detalhe: `Dinheiro · troco para ${formatarReais(e.troco_para)} → levar ${formatarReais(e.troco_para - e.total)} de troco` };
    }
    return { cobrar: true, titulo: `COBRAR ${valor}`, detalhe: 'Dinheiro · sem troco' };
  }
  const como = e.pagamento === 'pix' ? 'Pix na entrega' : e.pagamento.startsWith('cartao') ? `${PAGAMENTO_ROTULO[e.pagamento]} · levar a maquininha` : PAGAMENTO_ROTULO[e.pagamento];
  return { cobrar: true, titulo: `COBRAR ${valor}`, detalhe: como };
}
