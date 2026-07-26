import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Fornecedores from './pages/Fornecedores.jsx';
import Produtos from './pages/Produtos.jsx';
import Clientes from './pages/Clientes.jsx';
import Compras from './pages/Compras.jsx';
import Vendas from './pages/Vendas.jsx';
import ContasPagar from './pages/ContasPagar.jsx';
import ContasReceber from './pages/ContasReceber.jsx';
import Caixa from './pages/Caixa.jsx';
import Relatorios from './pages/Relatorios.jsx';

function RotaPrivada({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RotaPrivada>
            <Layout />
          </RotaPrivada>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="fornecedores" element={<Fornecedores />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="compras" element={<Compras />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="contas-pagar" element={<ContasPagar />} />
        <Route path="contas-receber" element={<ContasReceber />} />
        <Route path="caixa" element={<Caixa />} />
        <Route path="relatorios" element={<Relatorios />} />
      </Route>
    </Routes>
  );
}
