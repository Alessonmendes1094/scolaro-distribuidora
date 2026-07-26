import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/', label: 'Dashboard', end: true },
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

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-4 text-lg font-bold border-b border-slate-700">
          Scolaro Distribuidora
        </div>
        <nav className="flex-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm hover:bg-slate-800 ${
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
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
