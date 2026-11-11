// Dados da empresa no cadastro (D-077): CNPJ/CPF com dígito verificador, CEP, telefone e a leitura
// das respostas públicas da BrasilAPI (Receita Federal e CEP). Sem rede aqui: só regras e formatos.

export const soDigitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

export function cnpjValido(c: string): boolean {
  const d = soDigitos(c);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (base: string, pesos: number[]) => {
    const s = pesos.reduce((t, p, i) => t + Number(base[i]) * p, 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = dv(d, p1);
  const d2 = dv(d, [6, ...p1]);
  return d1 === Number(d[12]) && d2 === Number(d[13]);
}

export function cpfValido(c: string): boolean {
  const d = soDigitos(c);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export const cepValido = (c: string) => soDigitos(c).length === 8;
/** Fixo ou celular com DDD (10 ou 11 dígitos; aceita +55 na frente). */
export function telefoneValido(t: string): boolean {
  let d = soDigitos(t);
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return (d.length === 10 || d.length === 11) && Number(d.slice(0, 2)) >= 11;
}

export function formatarCnpj(c: string): string {
  const d = soDigitos(c).slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}
export function formatarCpf(c: string): string {
  const d = soDigitos(c).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
export function formatarCep(c: string): string {
  const d = soDigitos(c).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
export function formatarTelefone(t: string): string {
  let d = soDigitos(t);
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const;

export interface EnderecoEmpresa {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  lat?: number | null;
  lng?: number | null;
}
export interface DadosReceita extends EnderecoEmpresa {
  razao_social: string;
  nome_fantasia: string;
  telefone: string;
  email: string;
  situacao: string;
  ativa: boolean;
  atividade: string;
}

const t = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const titulo = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s/-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase())
    .replace(/\b(D[aeo]s?|E|Em|Na|No)\b/g, (m) => m.toLowerCase())
    .replace(/\b([IVXL]{1,5})\b/gi, (m) => (/^(?=[MDCLXVI])M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$/i.test(m) ? m.toUpperCase() : m));

/** Resposta da BrasilAPI /api/cnpj/v1/{cnpj} → campos do cadastro. */
export function dadosDaReceita(j: Record<string, unknown>): DadosReceita {
  const tipo = t(j.descricao_tipo_de_logradouro);
  const rua = t(j.logradouro);
  const situacao = t(j.descricao_situacao_cadastral);
  return {
    razao_social: t(j.razao_social),
    nome_fantasia: titulo(t(j.nome_fantasia)),
    cep: formatarCep(t(j.cep)),
    logradouro: titulo([tipo, rua].filter(Boolean).join(' ')),
    numero: t(j.numero),
    complemento: titulo(t(j.complemento)),
    bairro: titulo(t(j.bairro)),
    cidade: titulo(t(j.municipio)),
    uf: t(j.uf).toUpperCase(),
    telefone: formatarTelefone(t(j.ddd_telefone_1)),
    email: t(j.email).toLowerCase(),
    situacao: situacao || 'desconhecida',
    ativa: situacao.toUpperCase() === 'ATIVA',
    atividade: t(j.cnae_fiscal_descricao),
  };
}

/** Resposta da BrasilAPI /api/cep/v2 (ou ViaCEP) → endereço. */
export function enderecoDoCep(j: Record<string, unknown>): Omit<EnderecoEmpresa, 'numero' | 'complemento'> {
  const loc = (j.location as { coordinates?: { latitude?: string | number; longitude?: string | number } } | undefined)?.coordinates;
  const lat = Number(loc?.latitude);
  const lng = Number(loc?.longitude);
  return {
    cep: formatarCep(t(j.cep)),
    logradouro: t(j.street ?? j.logradouro),
    bairro: t(j.neighborhood ?? j.bairro),
    cidade: t(j.city ?? j.localidade),
    uf: t(j.state ?? j.uf).toUpperCase(),
    lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
    lng: Number.isFinite(lng) && lng !== 0 ? lng : null,
  };
}

/** "Rua das Flores, 123, sala 2 - Centro" (o endereço de uma linha que a loja já usa). */
export const enderecoLinha = (e: Pick<EnderecoEmpresa, 'logradouro' | 'numero' | 'complemento' | 'bairro'>) =>
  [[e.logradouro, e.numero || 's/n', e.complemento].filter((x) => x && x.trim()).join(', '), e.bairro].filter((x) => x && x.trim()).join(' - ');

/** Perguntas comerciais do cadastro (vão para a conta; servem ao time comercial). */
export const QTD_LOJAS = [
  { id: '1', rotulo: '1 loja' },
  { id: '2-3', rotulo: '2 a 3 lojas' },
  { id: '4+', rotulo: '4 ou mais' },
] as const;
export const SISTEMA_ATUAL = ['Nenhum (papel/WhatsApp)', 'BeeFood', 'Anota AI', 'Goomer', 'Saipos', 'Consumer', 'Cardápio Web', 'Só iFood', 'Outro'] as const;
export const COMO_CONHECEU = ['Indicação', 'Instagram', 'Google', 'Vendedor do RES', 'Vi o cardápio de outro restaurante', 'Outro'] as const;
export const PEDIDOS_DIA = ['Até 20', '21 a 50', '51 a 100', 'Mais de 100'] as const;
