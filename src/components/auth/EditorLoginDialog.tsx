import { useState, type FormEvent } from 'react'
import { LockKeyhole, LoaderCircle } from 'lucide-react'
import { signInEditor } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSignedIn: () => void }
export function EditorLoginDialog({ open, onOpenChange, onSignedIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try { await signInEditor(email, password); onOpenChange(false); onSignedIn() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión.') }
    finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><LockKeyhole size={22} /></div>
    <DialogTitle className="text-xl font-bold tracking-tight text-[#11264a]">Acceso de editora</DialogTitle>
    <DialogDescription className="mt-1 text-sm leading-6 text-slate-500">Inicia sesión para administrar la disponibilidad y los pases.</DialogDescription>
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="field-label">Correo electrónico<input className="field-input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="field-label">Contraseña<input className="field-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button className="w-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin" size={16} />}Iniciar sesión</Button>
    </form>
  </DialogContent></Dialog>
}
