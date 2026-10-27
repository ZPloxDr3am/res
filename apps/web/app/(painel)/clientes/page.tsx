import { listarClientes } from './actions';
import { ListaClientes } from '@/components/clientes/lista-clientes';

export const dynamic = 'force-dynamic';

export default async function Clientes() {
  const inicial = await listarClientes(null);
  return <ListaClientes inicial={inicial ?? { contagens: {}, sem_pedido: 0, total: 0, clientes: [] }} />;
}
