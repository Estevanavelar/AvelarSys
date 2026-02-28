import { redirect } from 'next/navigation'

export default function RegisterCNPJPage() {
  redirect('/register?type=cnpj')
}
