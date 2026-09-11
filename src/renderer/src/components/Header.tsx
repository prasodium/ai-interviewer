import { NavLink } from 'react-router-dom'
import { APP_NAME } from '@shared/constants/appConfig'

export default function Header(): JSX.Element {
  return (
    <header className="app-header">
      <span className="app-header__brand">{APP_NAME}</span>
      <nav className="app-header__nav">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/history">History</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
    </header>
  )
}
