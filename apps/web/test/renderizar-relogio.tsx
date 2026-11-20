// Monta no "servidor" (renderToString) um pedaço de quadro que depende da hora.
// Rodado pelo teste em dois processos com fusos diferentes (TZ=UTC e TZ=America/Sao_Paulo).
import { renderToString } from 'react-dom/server';
import { rotuloHorario, tempoDecorrido } from '@res/core';
import { Relogio, useAgora } from '../components/relogio';

const FUSO = 'America/Sao_Paulo';
const AGORA = Date.parse('2026-11-20T21:47:30-03:00'); // hora "do servidor", fixa
const criado = '2026-11-20T21:20:10-03:00';
const saiu = '2026-11-20T21:41:00-03:00';
const agendado = new Date('2026-11-21T19:30:00-03:00');

function Cartao() {
  const agora = useAgora();
  const hora = (t: string) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO });
  return (
    <div>
      <span>{tempoDecorrido(new Date(criado), new Date(agora))}</span>
      <span>{`Saiu · ${hora(saiu)}`}</span>
      <span>{rotuloHorario(agendado, FUSO, new Date(agora))}</span>
    </div>
  );
}

process.stdout.write(
  renderToString(
    <Relogio inicio={AGORA}>
      <Cartao />
    </Relogio>,
  ),
);
