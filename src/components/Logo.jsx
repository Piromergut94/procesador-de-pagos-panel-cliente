import React from 'react'
import { Link } from 'react-router-dom'
import { useCompany } from '../CompanyContext'
import './Logo.css'

const CLUB_LOGO = 'https://ovukfntlauhftpwymvdr.supabase.co/storage/v1/object/public/assets/logo-cds.jpeg'

function Logo() {
  const company = useCompany()
  const logo = company.branding?.logo_url || CLUB_LOGO
  const home = company.mode === 'path' && company.slug ? `/${company.slug}` : '/'
  return (
    <Link to={home} className="logo-container">
      <img
        src={logo}
        alt={company.branding?.display_name || 'Clubdelseguro'}
        className="logo-image"
      />
    </Link>
  )
}

export default Logo

