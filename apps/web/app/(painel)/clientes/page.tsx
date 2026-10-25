import { buscarClientes } from './actions';
import { ListaClientes } from '@/components/clientes/lista-clientes';

export const dynamic = 'force-dynamic';

export default async function Clientes() {
  const recentes = await buscarClientes('', 50);
  return <ListaClientes inicial={recentes} />;
}
