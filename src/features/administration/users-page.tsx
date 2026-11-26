import { Search, UserPlus, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { UserSummary } from '@shared/api-contract'
import { AREA_LABELS, AREAS, ASSIGNABLE_ROLES, type AccountStatus, type AssignableRole } from '@shared/domain'
import { ALLOWED_EMAIL_DOMAIN, isAllowedEmail } from '@shared/identity'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useGatewayMutation, useGatewayQuery } from '@/hooks/use-gateway'
import { ROLE_LABELS } from '@/types/domain'
import { FormField } from '@/components/ui/form-field'
import { ACCOUNT_STATUS_UI, ROLE_DESCRIPTIONS } from './labels'
import { t } from '@/i18n'

export function UsersPage() {
  const users = useGatewayQuery('admin.users.list', {})
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [registering, setRegistering] = useState(false)
  const [managingId, setManagingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = users.data ?? []
    return q ? list.filter((u) => `${u.fullName} ${u.email} ${u.position} ${u.bureau}`.toLowerCase().includes(q)) : list
  }, [users.data, query])
  const managing = users.data?.find((u) => u.profileId === managingId) ?? null

  return (
    <section aria-labelledby="users-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="users-heading" className="sr-only">
          {t('Pengguna')}
        </h2>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">{t('Cari pengguna')}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Cari nama, e-mel, jawatan…')}
            className="h-10 w-full rounded-input border border-line bg-paper pr-3 pl-9 text-body focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none"
          />
        </label>
        <Button onClick={() => setRegistering(true)}>
          <UserPlus />
          {t('Daftar pengguna')}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {users.isPending ? (
          <div className="space-y-3 p-5" aria-busy="true" aria-label={t('Memuatkan pengguna')}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users.isError ? (
          <EmptyState
            icon={Users}
            title={t('Senarai pengguna tidak dapat dimuatkan')}
            description={users.error.message}
            action={
              <Button variant="secondary" onClick={() => void users.refetch()}>
                {t('Cuba lagi')}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? t('Tiada padanan') : t('Belum ada pengguna')}
            description={query ? t('Cuba istilah carian lain.') : t('Daftarkan akaun DELIMa ahli JPP untuk memberi mereka akses.')}
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-caption">
              <thead>
                <tr className="border-b border-line bg-ice text-micro uppercase tracking-wide text-slate">
                  <th scope="col" className="px-5 py-3 font-semibold">{t('Pengguna')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('Jawatan / Biro')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('Peranan')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('Status')}</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">{t('Tindakan')}</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.profileId} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-heading">{u.fullName}</p>
                      <p className="font-mono text-micro text-slate">{u.email}</p>
                    </td>
                    <td className="px-5 py-3 text-ink">{[u.position, u.bureau].filter(Boolean).join(' · ') || <span className="text-slate">—</span>}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span key={r} className="rounded bg-blue-100 px-1.5 py-0.5 text-micro font-semibold text-link">
                            {t(ROLE_LABELS[r])}
                          </span>
                        ))}
                        {!u.roles.length && <span className="text-slate">{t('Tiada')}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={ACCOUNT_STATUS_UI[u.accountStatus].tone}>{ACCOUNT_STATUS_UI[u.accountStatus].label}</StatusBadge>
                      {!u.linked && u.accountStatus !== 'invited' && <p className="mt-1 text-micro text-slate">{t('Belum log masuk')}</p>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setManagingId(u.profileId)} aria-label={t('Urus {fullName}', { fullName: u.fullName })}>
                        {t('Urus')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-micro text-slate">{t('Keperluan: ADM-01, ADM-02, ADM-06 · Setiap perubahan direkodkan dalam log audit.')}</p>

      <RegisterDialog open={registering} onClose={() => setRegistering(false)} />
      <ManageUserDialog user={managing} onClose={() => setManagingId(null)} />
    </section>
  )
}

// ---------------------------------------------------------------------------

function RegisterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useAuth()
  const hasSession = state.status === 'signed_in' && Boolean(state.me.activeSession)
  const toast = useToast()
  const register = useGatewayMutation('admin.users.register', ['admin.users.list'])
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roles, setRoles] = useState<AssignableRole[]>(['member'])
  const [position, setPosition] = useState('')
  const [bureau, setBureau] = useState('')
  const [publicListing, setPublicListing] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; fullName?: string; roles?: string }>({})

  const close = () => {
    setEmail('')
    setFullName('')
    setRoles(['member'])
    setPosition('')
    setBureau('')
    setPublicListing(false)
    setErrors({})
    register.reset()
    onClose()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!isAllowedEmail(email)) next.email = t('Mesti akaun DELIMa (@{ALLOWED_EMAIL_DOMAIN}).', { ALLOWED_EMAIL_DOMAIN: ALLOWED_EMAIL_DOMAIN })
    if (!fullName.trim()) next.fullName = t('Nama penuh diperlukan.')
    if (!roles.length) next.roles = t('Pilih sekurang-kurangnya satu peranan.')
    setErrors(next)
    if (Object.keys(next).length) return
    register.mutate(
      { email, fullName, roles, position: position || undefined, bureau: bureau || undefined, publicListing },
      {
        onSuccess: (u) => {
          toast.success(t('{fullName} didaftarkan. Mereka boleh log masuk dengan akaun DELIMa.', { fullName: u.fullName }))
          close()
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('Daftar pengguna')}
      description={t('Pengguna log masuk dengan akaun DELIMa mereka sendiri. Tiada kata laluan atau e-mel jemputan dihantar.')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('Batal')}
          </Button>
          <Button type="submit" form="register-form" loading={register.isPending}>
            {t('Daftar')}
          </Button>
        </>
      }
    >
      <form id="register-form" noValidate onSubmit={submit} className="space-y-4">
        <FormField
          label={t('E-mel DELIMa')}
          type="email"
          autoComplete="off"
          placeholder={`nama@${ALLOWED_EMAIL_DOMAIN}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <FormField label={t('Nama penuh')} value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} maxLength={120} required />

        <fieldset>
          <legend className="mb-1.5 text-caption font-medium text-ink">
            {t('Peranan')} <span className="text-red" aria-hidden>*</span>
          </legend>
          <div className="grid gap-2">
            {ASSIGNABLE_ROLES.map((r) => (
              <label key={r} className="flex cursor-pointer items-start gap-3 rounded-input border border-line p-3 has-[:checked]:border-blue has-[:checked]:bg-blue-100/40">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--color-blue)]"
                  checked={roles.includes(r)}
                  onChange={(e) => setRoles((cur) => (e.target.checked ? [...cur, r] : cur.filter((x) => x !== r)))}
                />
                <span>
                  <span className="block text-caption font-semibold text-heading">{t(ROLE_LABELS[r])}</span>
                  <span className="block text-micro text-slate">{t(ROLE_DESCRIPTIONS[r])}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.roles && <p className="mt-1 text-micro text-red">{errors.roles}</p>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Jawatan')} value={position} onChange={(e) => setPosition(e.target.value)} maxLength={80} disabled={!hasSession} />
          <FormField label={t('Biro')} value={bureau} onChange={(e) => setBureau(e.target.value)} maxLength={80} disabled={!hasSession} />
        </div>
        <p className="-mt-2 text-micro text-slate">
          {hasSession ? t('Jawatan dan biro direkodkan untuk sesi JPP aktif (pilihan).') : t('Aktifkan sesi JPP untuk merekod jawatan dan biro.')}
        </p>
        <label className="flex items-start gap-2 text-caption">
          <input type="checkbox" checked={publicListing} disabled={!hasSession} onChange={(e) => setPublicListing(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-blue)]" />
          <span>{t('Papar nama, jawatan dan biro dalam senarai kepimpinan awam (Mengenai JPP). Hanya dengan persetujuan ahli.')}</span>
        </label>

        {register.isError && (
          <p role="alert" className="rounded-input border border-red/30 bg-red-100 p-3 text-caption text-red">
            {register.error.message}
          </p>
        )}
      </form>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------

type Pending =
  | { kind: 'status'; status: Exclude<AccountStatus, 'invited'> }
  | { kind: 'revoke'; role: AssignableRole }
  | null

const STATUS_ACTIONS: { status: Exclude<AccountStatus, 'invited'>; label: string; confirm: string }[] = [
  { status: 'active', label: 'Aktifkan', confirm: 'Pengguna akan mendapat semula akses mengikut peranan mereka.' },
  { status: 'suspended', label: 'Gantung', confirm: 'Akses akan ditarik serta-merta. Rekod pengguna kekal.' },
  { status: 'deactivated', label: 'Nyahaktif', confirm: 'Gunakan apabila ahli tamat perkhidmatan. Akses ditarik serta-merta; rekod kekal.' },
]

function ManageUserDialog({ user, onClose }: { user: UserSummary | null; onClose: () => void }) {
  const toast = useToast()
  const invalidate = ['admin.users.list'] as const
  const setStatus = useGatewayMutation('admin.users.setStatus', invalidate)
  const grant = useGatewayMutation('admin.roles.grant', invalidate)
  const revoke = useGatewayMutation('admin.roles.revoke', invalidate)
  const grantArea = useGatewayMutation('admin.areas.grant', invalidate)
  const revokeArea = useGatewayMutation('admin.areas.revoke', invalidate)
  const membership = useGatewayMutation('admin.users.setMembership', [...invalidate, 'public.leaders'])
  const [pending, setPending] = useState<Pending>(null)
  const [member, setMember] = useState<{ id: string; position: string; bureau: string; publicListing: boolean } | null>(null)
  const busy = setStatus.isPending || grant.isPending || revoke.isPending || grantArea.isPending || revokeArea.isPending
  const error = setStatus.error ?? grant.error ?? revoke.error ?? grantArea.error ?? revokeArea.error ?? membership.error

  const close = () => {
    setPending(null)
    setStatus.reset()
    grant.reset()
    revoke.reset()
    grantArea.reset()
    revokeArea.reset()
    membership.reset()
    setMember(null)
    onClose()
  }
  if (!user) return null
  const m = member?.id === user.profileId ? member : { id: user.profileId, position: user.position, bureau: user.bureau, publicListing: user.publicListing }

  const confirmPending = () => {
    if (!pending) return
    const done = (msg: string) => () => {
      toast.success(msg)
      setPending(null)
    }
    if (pending.kind === 'status') {
      setStatus.mutate({ profileId: user.profileId, status: pending.status }, { onSuccess: done(t('Status akaun dikemas kini.')) })
    } else {
      revoke.mutate({ profileId: user.profileId, role: pending.role }, { onSuccess: done(t('Peranan {v1} ditarik balik.', { v1: t(ROLE_LABELS[pending.role]) })) })
    }
  }

  const statusAction = pending?.kind === 'status' ? STATUS_ACTIONS.find((a) => a.status === pending.status) : null

  return (
    <Dialog open onClose={close} size="lg" title={user.fullName} description={<span className="font-mono">{user.email}</span>}>
      <div className="space-y-6">
        <section aria-labelledby="status-h">
          <div className="flex items-center justify-between gap-3">
            <h3 id="status-h" className="text-body font-bold">
              {t('Status akaun')}
            </h3>
            <StatusBadge tone={ACCOUNT_STATUS_UI[user.accountStatus].tone}>{ACCOUNT_STATUS_UI[user.accountStatus].label}</StatusBadge>
          </div>
          {user.accountStatus === 'invited' && (
            <p className="mt-1 text-micro text-slate">{t('Akaun akan aktif secara automatik apabila pengguna log masuk kali pertama.')}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_ACTIONS.filter((a) => a.status !== user.accountStatus && !(a.status === 'active' && user.accountStatus === 'invited')).map((a) => (
              <Button
                key={a.status}
                size="sm"
                variant={a.status === 'active' ? 'secondary' : 'destructive'}
                disabled={busy}
                onClick={() => setPending({ kind: 'status', status: a.status })}
              >
                {t(a.label)}
              </Button>
            ))}
          </div>
        </section>

        <section aria-labelledby="roles-h">
          <h3 id="roles-h" className="text-body font-bold">
            {t('Peranan')}
          </h3>
          <ul className="mt-3 divide-y divide-line rounded-input border border-line">
            {ASSIGNABLE_ROLES.map((r) => {
              const held = user.roles.includes(r)
              return (
                <li key={r} className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <p className="text-caption font-semibold text-heading">{t(ROLE_LABELS[r])}</p>
                    <p className="text-micro text-slate">{t(ROLE_DESCRIPTIONS[r])}</p>
                  </div>
                  {held ? (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPending({ kind: 'revoke', role: r })}>
                      {t('Tarik balik')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        grant.mutate({ profileId: user.profileId, role: r }, { onSuccess: () => toast.success(t('Peranan {v1} diberikan.', { v1: t(ROLE_LABELS[r]) })) })
                      }
                    >
                      {t('Berikan')}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="areas-h">
          <h3 id="areas-h" className="text-body font-bold">
            {t('Bidang kuasa tambahan (Jika diberi)')}
          </h3>
          <p className="mt-1 text-micro text-slate">{t('Kuasa kelulusan nombor rujukan tidak boleh diwakilkan; hanya SUAK. SUAK memiliki semua bidang di bawah secara automatik.')}</p>
          <ul className="mt-3 divide-y divide-line rounded-input border border-line">
            {AREAS.map((a) => {
              const held = user.areas.includes(a)
              return (
                <li key={a} className="flex items-center justify-between gap-4 p-3">
                  <span className="text-caption font-semibold text-heading">{t(AREA_LABELS[a])}</span>
                  {held ? (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => revokeArea.mutate({ profileId: user.profileId, area: a }, { onSuccess: () => toast.success(t('Bidang kuasa ditarik balik.')) })}>
                      {t('Tarik balik')}
                    </Button>
                  ) : (
                    <Button size="sm" disabled={busy} onClick={() => grantArea.mutate({ profileId: user.profileId, area: a }, { onSuccess: () => toast.success(t('{v1} diberikan.', { v1: t(AREA_LABELS[a]) })) })}>
                      {t('Berikan')}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="mem-h">
          <h3 id="mem-h" className="text-body font-bold">
            {t('Keahlian sesi aktif')}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FormField label={t('Jawatan')} value={m.position} maxLength={80} onChange={(e) => setMember({ ...m, position: e.target.value })} />
            <FormField label={t('Biro')} value={m.bureau} maxLength={80} onChange={(e) => setMember({ ...m, bureau: e.target.value })} />
          </div>
          <label className="mt-3 flex items-start gap-2 text-caption">
            <input type="checkbox" checked={m.publicListing} onChange={(e) => setMember({ ...m, publicListing: e.target.checked })} className="mt-0.5 size-4 accent-[var(--color-blue)]" />
            <span>{t('Papar dalam senarai kepimpinan awam (dengan persetujuan ahli)')}</span>
          </label>
          <Button size="sm" className="mt-3" loading={membership.isPending} disabled={!member} onClick={() => membership.mutate({ profileId: user.profileId, position: m.position, bureau: m.bureau, publicListing: m.publicListing }, { onSuccess: () => (toast.success(t('Keahlian disimpan.')), setMember(null)) })}>
            {t('Simpan keahlian')}
          </Button>
        </section>

        {pending && (
          <div role="alertdialog" aria-labelledby="confirm-h" className="rounded-input border border-amber/40 bg-amber-100/70 p-4">
            <p id="confirm-h" className="text-caption font-semibold text-ink">
              {pending.kind === 'status' ? t('{label} akaun {fullName}?', { label: t(statusAction?.label ?? ''), fullName: user.fullName }) : t('Tarik balik peranan {v1}?', { v1: t(ROLE_LABELS[pending.role]) })}
            </p>
            <p className="mt-1 text-caption text-slate">
              {pending.kind === 'status' ? (statusAction ? t(statusAction.confirm) : null) : t('Keupayaan berkaitan ditarik pada permintaan seterusnya pengguna.')}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPending(null)} disabled={busy}>
                {t('Batal')}
              </Button>
              <Button size="sm" variant="destructive" onClick={confirmPending} loading={busy}>
                {t('Sahkan')}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-input border border-red/30 bg-red-100 p-3 text-caption text-red">
            {error.message}
          </p>
        )}
      </div>
    </Dialog>
  )
}
