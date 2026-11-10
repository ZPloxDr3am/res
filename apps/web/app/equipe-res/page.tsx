import { redirect } from 'next/navigation';

// O painel da equipe virou o painel da empresa (D-083).
export default function EquipeRes() {
  redirect('/empresa');
}
