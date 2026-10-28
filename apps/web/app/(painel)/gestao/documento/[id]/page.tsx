import Link from 'next/link';
import { notFound } from 'next/navigation';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { dataBr, dataExtenso, formatarCep, formatarCnpj, formatarCpf, type Empresa, type Funcionario, type Registro } from '@/lib/gestao';
import { BotaoImprimir } from '@/components/gestao/imprimir';

export const dynamic = 'force-dynamic';

const dias = (a: string, b: string | null) => (b ? Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400_000) + 1 : 1);

/** Termo de falta / advertência disciplinar para imprimir em duas vias e colher assinatura (D-050). */
export default async function Documento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await contextoLoja();
  if (ctx.papel !== 'dono' && ctx.papel !== 'gerente') notFound();
  const supabase = await criarClienteServidor();
  const { data: reg } = await supabase.from('funcionario_registros').select('*').eq('id', id).eq('loja_id', ctx.lojaId).maybeSingle();
  if (!reg) notFound();
  const r = reg as Registro;
  const [{ data: f }, { data: emp }] = await Promise.all([
    supabase.from('funcionarios').select('*').eq('id', r.funcionario_id).maybeSingle(),
    supabase.from('gestao_empresa').select('*').eq('loja_id', ctx.lojaId).maybeSingle(),
  ]);
  if (!f) notFound();
  const func = f as Funcionario;
  const e = (emp ?? {}) as Partial<Empresa>;
  const falta = r.tipo === 'falta';
  const n = dias(r.data, r.data_fim);
  const local = [e.cidade, e.uf].filter(Boolean).join(' - ') || '____________________';
  const faltam = [!e.razao_social && 'razão social', !e.cnpj && 'CNPJ', !func.cpf && 'CPF do funcionário'].filter(Boolean) as string[];

  const via = (qual: string) => (
    <article className="doc-folha" aria-label={qual}>
      <p className="doc-via">{qual}</p>
      <h1 className="doc-titulo">{falta ? 'Termo de ciência de falta ao trabalho' : 'Advertência disciplinar'}</h1>
      <p className="doc-numero">Nº {String(r.numero).padStart(3, '0')}/{r.data.slice(0, 4)}</p>

      <section className="doc-bloco">
        <h2>Empregador</h2>
        <p>
          <b>{e.razao_social || ctx.lojaNome}</b>
          {e.razao_social && ctx.lojaNome && e.razao_social !== ctx.lojaNome ? ` (${ctx.lojaNome})` : ''}
          <br />CNPJ: {e.cnpj ? formatarCnpj(e.cnpj) : '__.___.___/____-__'}
          {e.endereco && <><br />{e.endereco}{e.cidade ? `, ${e.cidade}` : ''}{e.uf ? ` - ${e.uf}` : ''}{e.cep ? `, CEP ${formatarCep(e.cep)}` : ''}</>}
        </p>
      </section>

      <section className="doc-bloco">
        <h2>Empregado(a)</h2>
        <p>
          <b>{func.nome}</b>
          <br />CPF: {func.cpf ? formatarCpf(func.cpf) : '___.___.___-__'}
          {func.rg ? ` · RG: ${func.rg}` : ''}
          {func.ctps ? ` · CTPS: ${func.ctps}` : ''}
          {func.pis ? ` · PIS: ${func.pis}` : ''}
          <br />Função: {func.cargo || '____________________'}
          {func.admissao ? ` · Admissão: ${dataBr(func.admissao)}` : ''}
          {func.endereco && <><br />Endereço: {func.endereco}</>}
        </p>
      </section>

      {falta ? (
        <section className="doc-texto">
          <p>
            Pelo presente termo, o(a) empregado(a) acima qualificado(a) declara estar ciente de que <b>não compareceu ao trabalho</b>{' '}
            {r.data_fim ? <>no período de <b>{dataBr(r.data)}</b> a <b>{dataBr(r.data_fim)}</b> ({n} dias)</> : <>no dia <b>{dataBr(r.data)}</b></>}, pelo motivo:{' '}
            <b>{r.motivo}</b>.
          </p>
          {r.justificada ? (
            <p>
              A ausência foi <b>justificada</b> perante a empresa (atestado ou motivo previsto em lei, como os do art. 473 da CLT), e por isso não gera desconto no salário nem no
              descanso semanal remunerado.
            </p>
          ) : (
            <p>
              A ausência ocorreu <b>sem justificativa</b> aceita por lei. O(a) empregado(a) fica ciente de que a falta injustificada poderá ser descontada do salário, juntamente com o
              descanso semanal remunerado (DSR) da respectiva semana (Lei nº 605/1949, art. 6º), poderá ser considerada na contagem dos dias de férias (CLT, art. 130), e que a
              repetição poderá levar à aplicação de medidas disciplinares.
            </p>
          )}
          {r.descricao && <p>Observações: {r.descricao}</p>}
        </section>
      ) : (
        <section className="doc-texto">
          <p>Prezado(a) Sr(a). <b>{func.nome}</b>,</p>
          <p>
            Pela presente, fica V.Sa. <b>ADVERTIDO(A)</b> em razão do fato descrito abaixo, ocorrido em <b>{dataBr(r.data)}</b>, que contraria as normas da empresa e as
            obrigações do contrato de trabalho.
          </p>
          <p>
            <b>Motivo:</b> {r.motivo}
          </p>
          <p className="doc-descricao">
            <b>O que aconteceu:</b> {r.descricao}
          </p>
          <p>
            Esta advertência tem caráter educativo e busca evitar que a conduta se repita. Informamos que a reincidência poderá levar à aplicação de penalidades mais severas, como a
            suspensão e, em casos graves ou repetidos, a rescisão do contrato de trabalho por justa causa, nos termos do art. 482 da Consolidação das Leis do Trabalho (CLT).
          </p>
        </section>
      )}

      <p className="doc-local">{local}, {dataExtenso(new Date(r.criado_em).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))}.</p>

      <section className="doc-assinaturas">
        <div>
          <span />
          <p>
            <b>{func.nome}</b>
            <br />Empregado(a){func.cpf ? ` · CPF ${formatarCpf(func.cpf)}` : ''}
            <br />
            <small>{falta ? 'Declaro estar ciente deste termo.' : 'Declaro ter recebido uma via desta advertência (a assinatura indica o recebimento, não concordância).'}</small>
          </p>
        </div>
        <div>
          <span />
          <p>
            <b>{e.responsavel || '____________________'}</b>
            <br />
            {e.cargo_responsavel || 'Responsável'} · {e.razao_social || ctx.lojaNome}
          </p>
        </div>
      </section>

      <section className="doc-testemunhas">
        <p className="doc-nota">Se o(a) empregado(a) se recusar a assinar, as testemunhas abaixo confirmam que ele(a) tomou conhecimento deste documento.</p>
        <div className="doc-assinaturas">
          {[r.testemunha1, r.testemunha2].map((t, i) => (
            <div key={i}>
              <span />
              <p>
                Testemunha {i + 1}: {t || '____________________'}
                <br />CPF: ___.___.___-__
              </p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );

  return (
    <div className="grade doc">
      <div className="linha nao-imprimir">
        <Link href={`/gestao?aba=${falta ? 'faltas' : 'advertencias'}`}>← Voltar</Link>
        <BotaoImprimir />
      </div>
      {faltam.length > 0 && (
        <p className="erro nao-imprimir" style={{ margin: 0 }}>
          Falta preencher: {faltam.join(', ')}. O documento sai com o espaço em branco para completar à mão.
        </p>
      )}
      <p className="dica nao-imprimir" style={{ margin: 0 }}>
        Sai em duas vias (empresa e empregado). Modelo de referência: em caso de dúvida, principalmente antes de uma suspensão ou justa causa, confirme com seu contador ou advogado
        trabalhista.
      </p>
      {via('1ª via — Empresa')}
      {via('2ª via — Empregado(a)')}
    </div>
  );
}
