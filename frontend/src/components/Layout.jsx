import Sidebar from './Sidebar.jsx';

const pageTitles = {
  'checklist-generater': 'Checklist Generater',
  'mange-machines': 'Mange Machines',
  'stock-details': 'Stock Details',
  'manage-stock': 'Manage Stock',
};

export default function Layout({ currentPage, onChangePage, children }) {
  const activeTitle = pageTitles[currentPage] || 'Dashboard';

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <Sidebar currentPage={currentPage} onChangePage={onChangePage} />
      <main className="flex-1 px-4 lg:px-8 py-4 lg:py-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                CAE Production Studio
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-emerald-950 tracking-tight">
                Industrial Production Checklist
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 shadow-sm">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              <span>{activeTitle}</span>
            </div>
          </header>
          <div className="rounded-2xl bg-white/90 backdrop-blur border border-emerald-200/80 shadow-[0_22px_55px_rgba(6,78,59,0.12)] p-4 lg:p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
