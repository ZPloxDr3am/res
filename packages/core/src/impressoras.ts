// Catálogo de impressoras térmicas com a configuração homologada (Projeto ACBr, a mesma lista que o
// BeeFood oferece — estudo-beefood/impressao.md). O dono escolhe o modelo e os parâmetros vêm prontos.

export type Protocolo = 'EscPosEpson' | 'EscBematech' | 'EscDaruma' | 'EscGPrinter' | 'CustomPos';
export type PaginaCodigo = '860' | '850' | '1252' | 'UTF8';

export interface ModeloImpressora {
  id: string;
  marca: string;
  nome: string;
  protocolo: Protocolo;
  pagina: PaginaCodigo;
  colunas: number;
  /** espaço entre linhas (unidades ESC 3); null = padrão da impressora */
  espaco: number | null;
  /** linhas em branco antes do corte */
  pular: number;
  papel: 58 | 80;
  homologada: boolean;
  nota?: string;
}

const m = (id: string, marca: string, nome: string, protocolo: Protocolo, pagina: PaginaCodigo, colunas: number, espaco: number | null, pular: number | null, nota?: string): ModeloImpressora => ({
  id, marca, nome, protocolo, pagina, colunas, espaco, pular: pular ?? 4, papel: colunas <= 32 ? 58 : 80, homologada: true, nota,
});

export const MODELOS_IMPRESSORA: readonly ModeloImpressora[] = [
  m('epson-tm-t20x', 'Epson', 'TM-T20X', 'EscPosEpson', '860', 48, 40, 5),
  m('epson-tm-t20', 'Epson', 'TM-T20', 'EscPosEpson', '860', 48, 40, 4),
  m('epson-tm-t88v', 'Epson', 'TM-T88V', 'EscPosEpson', '860', 42, 40, 5),
  m('elgin-i9', 'Elgin', 'i9', 'EscPosEpson', '860', 48, 30, 3),
  m('elgin-i7', 'Elgin', 'i7', 'EscPosEpson', '860', 48, null, null),
  m('elgin-rm22', 'Elgin', 'RM22', 'EscPosEpson', '860', 32, 1, 2),
  m('bematech-mp4200', 'Bematech', 'MP-4200 TH', 'EscBematech', 'UTF8', 50, null, 0),
  m('bematech-mp2800', 'Bematech', 'MP-2800 TH', 'EscPosEpson', '860', 48, 40, 4),
  m('bematech-mp5100', 'Bematech', 'MP-5100 TH', 'EscBematech', '850', 48, null, null),
  m('bematech-mp100s', 'Bematech', 'MP-100S TH', 'EscBematech', '850', 48, null, null),
  m('bematech-pp10', 'Bematech', 'PP-10', 'EscPosEpson', '860', 48, 30, 3),
  m('daruma-drm380', 'Daruma', 'DRM-380', 'EscPosEpson', '860', 48, null, null, 'Usa EscPosEpson, não EscDaruma.'),
  m('daruma-dr800', 'Daruma', 'DR-800 D-Printer', 'EscDaruma', '850', 48, 40, 7),
  m('tanca-tp650', 'Tanca', 'TP-650', 'EscPosEpson', '850', 48, null, null),
  m('tanca-tp550', 'Tanca', 'TP-550', 'EscPosEpson', '850', 48, null, null),
  m('tanca-tp620', 'Tanca', 'TP-620+', 'EscPosEpson', '850', 48, 0, 4),
  m('sweda-si300s', 'Sweda', 'SI-300S', 'EscPosEpson', '860', 42, null, null),
  m('controlid-printid', 'Control iD', 'Print iD', 'EscPosEpson', '860', 48, 10, 0),
  m('dimep-dprint250', 'Dimep', 'D-Print 250', 'EscPosEpson', '860', 48, null, 4),
  m('jetway-jp800', 'Jetway', 'JP-800', 'EscGPrinter', '860', 48, 25, 5),
  m('waytec-wp100', 'Waytec', 'WP-100', 'EscGPrinter', '850', 48, 0, 4),
  m('gertec-g250', 'Gertec', 'G250', 'EscPosEpson', '850', 48, null, null),
  m('tectoy-q4', 'TecToy', 'Q4', 'EscPosEpson', '850', 48, null, null),
  { id: 'generica-80', marca: 'Genérica', nome: '80 mm (ESC/POS)', protocolo: 'EscPosEpson', pagina: '860', colunas: 48, espaco: 0, pular: 4, papel: 80, homologada: false },
  { id: 'generica-80-alt', marca: 'Genérica', nome: '80 mm (alternativa)', protocolo: 'CustomPos', pagina: '850', colunas: 48, espaco: 0, pular: 4, papel: 80, homologada: false },
  { id: 'generica-58', marca: 'Genérica', nome: '58 mm', protocolo: 'CustomPos', pagina: '860', colunas: 32, espaco: 0, pular: 2, papel: 58, homologada: false },
];

export const modeloPorId = (id: string) => MODELOS_IMPRESSORA.find((x) => x.id === id) ?? null;
export const nomeModelo = (id: string) => {
  const x = modeloPorId(id);
  return x ? `${x.marca} ${x.nome}` : id;
};

/** Ordem para testar quando a acentuação sai errada (dica do ACBr). */
export const PAGINAS_CODIGO: readonly PaginaCodigo[] = ['860', '850', '1252', 'UTF8'];
