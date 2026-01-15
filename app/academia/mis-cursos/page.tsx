import { redirect } from 'next/navigation'

/**
 * Redirect legacy /academia/mis-cursos to /mi-cuenta/cursos
 * The courses page is now part of the unified user dashboard
 */
export default function MisCursosRedirectPage() {
  redirect('/mi-cuenta/cursos')
}
