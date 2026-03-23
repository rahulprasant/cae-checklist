import { useEffect, useMemo, useState } from 'react';
import api from '../apiClient.js';
import Spinner from '../components/Spinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';

const categories = [
  { value: 'raw', label: 'Raw Materials' },
  { value: 'fabrication', label: 'Parts for Fabrication' },
  { value: 'purchase', label: 'Materials for Purchase' },
];

export default function ManageMaterials() {
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({
    category: 'raw',
    name: '',
    quantity: '',
    unit: '',
  });
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredMaterials = useMemo(() => {
    if (!selectedMachineId) return [];
    return materials.filter((m) => m.machine_id === Number(selectedMachineId));
  }, [materials, selectedMachineId]);

  const loadMachines = async () => {
    try {
      setLoadingMachines(true);
      const res = await api.get('/machines');
      setMachines(res.data);
      if (!selectedMachineId && res.data.length > 0) {
        setSelectedMachineId(String(res.data[0].id));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load machines');
    } finally {
      setLoadingMachines(false);
    }
  };

  const loadMaterials = async () => {
    if (!selectedMachineId) return;
    try {
      setLoadingMaterials(true);
      const res = await api.get('/materials', {
        params: { machineId: selectedMachineId },
      });
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load materials');
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    if (selectedMachineId) {
      loadMaterials();
    }
  }, [selectedMachineId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedMachineId) {
      setError('Please select a machine');
      return;
    }
    if (!form.name.trim() || !form.quantity || !form.unit.trim()) {
      setError('All fields are required');
      return;
    }
    try {
      setSaving(true);
      await api.post('/materials', {
        machine_id: Number(selectedMachineId),
        category: form.category,
        name: form.name.trim(),
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
      });
      setForm({ category: form.category, name: '', quantity: '', unit: '' });
      await loadMaterials();
    } catch (err) {
      console.error(err);
      setError('Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await api.delete(`/materials/${id}`);
      await loadMaterials();
    } catch (err) {
      console.error(err);
      setError('Failed to delete material');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Manage Materials</h2>
        <p className="text-sm text-slate-500">
          Define raw materials, fabrication parts, and purchase materials per machine.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />

      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="w-full md:w-64">
          <label htmlFor="machine-select" className="block text-sm font-medium text-slate-700 mb-1">
            Select Machine
          </label>
          {loadingMachines ? (
            <Spinner />
          ) : (
            <select
              id="machine-select"
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
            >
              <option value="">Select...</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="category-select" className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              id="category-select"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="material-name" className="block text-sm font-medium text-slate-700 mb-1">
              Name
            </label>
            <input
              id="material-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
              placeholder="e.g. Steel Sheet"
            />
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1">
              Quantity
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              step="0.01"
              value={form.quantity}
              onChange={handleChange}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
              placeholder="e.g. 10"
            />
          </div>
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
            <input
              id="unit"
              name="unit"
              type="text"
              value={form.unit}
              onChange={handleChange}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
              placeholder="e.g. kg, pcs"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium shadow hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Add Material'}
        </button>
      </form>

      <section>
        <h3 className="text-md font-semibold text-slate-800 mb-3">Materials for Machine</h3>
        {loadingMaterials ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">S.No</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Category</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Quantity</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Unit</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((m, idx) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                    <td className="px-3 py-2 text-slate-700">{m.category}</td>
                    <td className="px-3 py-2 text-slate-800">{m.name}</td>
                    <td className="px-3 py-2 text-slate-700">{m.quantity}</td>
                    <td className="px-3 py-2 text-slate-700">{m.unit}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMaterials.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-slate-400 text-sm"
                    >
                      No materials defined for this machine.
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
