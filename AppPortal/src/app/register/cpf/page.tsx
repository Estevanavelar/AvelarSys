import { redirect } from 'next/navigation'

export default function RegisterCPFPage() {
  redirect('/register?type=cpf')
}
