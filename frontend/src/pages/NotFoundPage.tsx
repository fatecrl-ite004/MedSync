import { ArrowLeft, HeartPulse } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="not-found">
      <span className="not-found__mark"><HeartPulse size={36} /></span>
      <span className="eyebrow">Erro 404</span>
      <h1>Esta página não está por aqui.</h1>
      <p>O endereço pode ter mudado ou não fazer parte do MedSync.</p>
      <Link className="button button--primary" to="/"><ArrowLeft size={18} /> Voltar ao início</Link>
    </main>
  )
}
