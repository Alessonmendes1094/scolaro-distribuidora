import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Truck,
  Package,
  Users,
  ShoppingCart,
  Receipt,
  Wallet,
  HandCoins,
  Landmark,
  FileBarChart,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/empresas', label: 'Empresas', icon: Building2 },
  { to: '/fornecedores', label: 'Fornecedores', icon: Truck },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/vendas', label: 'Vendas', icon: Receipt },
  { to: '/contas-pagar', label: 'Contas a Pagar', icon: Wallet },
  { to: '/contas-receber', label: 'Contas a Receber', icon: HandCoins },
  { to: '/caixa', label: 'Caixa', icon: Landmark },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
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
          {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-3 md:py-2 text-sm hover:bg-slate-800 ${
                    isActive ? 'bg-slate-800 font-semibold' : ''
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700 text-sm">
          <div className="mb-2">{usuario?.nome}</div>
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1.5 flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
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
