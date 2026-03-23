import { useState, useLayoutEffect } from 'react';
import Layout from './components/Layout.jsx';
import MachineManagement from './pages/MachineManagement.jsx';
import GenerateChecklist from './pages/GenerateChecklist.jsx';
import StockDashboard from './pages/StockDashboard.jsx';
import PublicMachine from './pages/PublicMachine.jsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState('checklist-generater');
  const [publicMachineId, setPublicMachineId] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    // Check if URL contains public machine path - do this synchronously at startup
    const path = window.location.pathname;
    const publicMatch = path.match(/\/public\/machines\/(\d+)/);
    if (publicMatch) {
      const machineId = parseInt(publicMatch[1]);
      console.log('Detected public machine route:', machineId);
      setPublicMachineId(machineId);
    }
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  // If viewing public machine, don't show layout
  if (publicMachineId) {
    return <PublicMachine machineId={publicMachineId} />;
  }

  let content = null;
  if (currentPage === 'checklist-generater') content = <GenerateChecklist />;
  else if (currentPage === 'manage-machines') content = <MachineManagement />;
  else if (currentPage === 'stock-details') content = <StockDashboard />;
  else if (currentPage === 'manage-stock') content = <StockDashboard />;

  return (
    <Layout currentPage={currentPage} onChangePage={setCurrentPage}>
      {content}
    </Layout>
  );
}
