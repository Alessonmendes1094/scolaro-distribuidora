import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/empresas', label: 'Empresas' },
  { to: '/fornecedores', label: 'Fornecedores' },
  { to: '/produtos', label: 'Produtos' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/compras', label: 'Compras' },
  { to: '/vendas', label: 'Vendas' },
  { to: '/contas-pagar', label: 'Contas a Pagar' },
  { to: '/contas-receber', label: 'Contas a Receber' },
  { to: '/caixa', label: 'Caixa' },
  { to: '/relatorios', label: 'Relatórios' },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between bg-slate-900 text-slate-100 p-4">
        <span className="text-lg font-bold">Scolaro Distribuidora</span>
        <button
          onClick={() => setMenuAberto((v) => !v)}
          className="p-2 -mr-2"
          aria-label="Abrir menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuAberto ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </header>

      <aside
        className={`${
          menuAberto ? 'flex' : 'hidden'
        } md:flex w-full md:w-60 bg-slate-900 text-slate-100 flex-col md:min-h-screen`}
      >
        <div className="hidden md:block p-4 text-lg font-bold border-b border-slate-700">
          Scolaro Distribuidora
        </div>
        <nav className="flex-1 overflow-y-auto max-h-[70vh] md:max-h-none">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `block px-4 py-3 md:py-2 text-sm hover:bg-slate-800 ${
                  isActive ? 'bg-slate-800 font-semibold' : ''
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 text-sm">
          <div className="mb-2">{usuario?.nome}</div>
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1.5"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
