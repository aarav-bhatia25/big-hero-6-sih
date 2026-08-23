import { redirect } from 'next/navigation';

/** The former standalone SOS page was a non-functional duplicate. */
export default function SosPage() {
  redirect('/citizen');
}
