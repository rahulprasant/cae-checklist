import { useEffect, useState } from 'react';
import api from '../apiClient.js';
import Spinner from '../components/Spinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';

export default function AddMachine() {
  const [machines, setMachines] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');

  const loadMachines = async () => {
    try {
      setLoadingList(true);
      const res = await api.get('/machines');
      setMachines(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load machines');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Machine name is required');
      return;
    }
    try {
      setLoading(true);
      await api.post('/machines', { name: name.trim() });
      setName('');
      await loadMachines();
    } catch (err) {
      console.error(err);
      setError('Failed to create machine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Add Machine</h2>
        <p className="text-sm text-slate-500">Create and manage production machines.</p>
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="machine-name" className="block text-sm font-medium text-slate-700 mb-1">Machine Name</label>
          <input
            id="machine-name"
            type="text"
            name="machine-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
            placeholder="e.g. CNC Mill"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium shadow hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Machine'}
        </button>
      </form>

      <section>
        <h3 className="text-md font-semibold text-slate-800 mb-3">Existing Machines</h3>
        {loadingList ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">S.No</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Name</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m, idx) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                    <td className="px-3 py-2 text-slate-800">{m.name}</td>
                  </tr>
                ))}
                {machines.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-4 text-center text-slate-400 text-sm"
                    >
                      No machines yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
