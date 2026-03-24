const navItems = [
  { id: 'checklist-generater', label: 'Checklist Generater' },
  { id: 'manage-machines', label: 'Manage Machines' },
  { id: 'stock-details', label: 'Stock Details' },
  { id: 'manage-stock', label: 'Manage Stock' },
];

export default function Sidebar({ currentPage, onChangePage }) {
  return (
    <aside className="sticky top-0 h-screen w-64 bg-gradient-to-b from-emerald-950 via-teal-950 to-emerald-950 text-emerald-50 flex flex-col border-r border-emerald-900/80 shadow-xl">
      <div className="px-4 py-5 border-b border-emerald-900/80">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/70">
          CAE
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-base font-semibold text-emerald-50">
            Production Details
          </p>
          <span className="inline-flex items-center justify-center h-7 px-2 rounded-full bg-emerald-400/15 text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-400/50">
            Production
          </span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangePage(item.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between gap-2 ${
                active
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-950/40'
                  : 'text-emerald-100 hover:bg-emerald-900/70 hover:text-white hover:shadow-md hover:shadow-emerald-950/40'
              }`}
            >
              <span>{item.label}</span>
              {active && (
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
