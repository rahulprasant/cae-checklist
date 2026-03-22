import { useState } from 'react';
import Layout from './components/Layout.jsx';
import MachineManagement from './pages/MachineManagement.jsx';
import GenerateChecklist from './pages/GenerateChecklist.jsx';
import StockDashboard from './pages/StockDashboard.jsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState('checklist-generater');

  let content = null;
  if (currentPage === 'checklist-generater') content = <GenerateChecklist />;
  else if (currentPage === 'mange-machines') content = <MachineManagement />;
  else if (currentPage === 'stock-details') content = <StockDashboard />;
  else if (currentPage === 'manage-stock') content = <StockDashboard />;

  return (
    <Layout currentPage={currentPage} onChangePage={setCurrentPage}>
      {content}
    </Layout>
  );
}
