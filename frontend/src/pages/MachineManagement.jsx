import { useEffect, useMemo, useState } from 'react';
import api from '../apiClient.js';
import Spinner from '../components/Spinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';

const CATEGORY_PURCHASE = 'purchase';

function getApiErrorMessage(err, fallback) {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.message === 'Network Error') {
    return 'Cannot reach backend API. Start backend on port 4000.';
  }
  return fallback;
}

function MaterialsSection({
  title,
  category,
  materials,
  selectedMachineId,
  onMaterialAdded,
  onMaterialDeleted,
}) {
  const [form, setForm] = useState({ name: '', quantity: '', unit: '' });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () => (category ? materials.filter((m) => m.category === category) : materials),
    [materials, category]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMachineId) return;
    if (!form.name.trim() || !form.quantity || !form.unit.trim()) return;

    try {
      setSaving(true);
      await api.post('/materials', {
        machine_id: Number(selectedMachineId),
        category: category || CATEGORY_PURCHASE,
        name: form.name.trim(),
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
      });
      setForm({ name: '', quantity: '', unit: '' });
      await onMaterialAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <span className="inline-flex h-1.5 w-6 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400" />
        <span>{title}</span>
      </h3>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end text-sm"
      >
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Name
          </label>
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-md border-slate-300 bg-white/90 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            placeholder="e.g. Steel Sheet"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Quantity
          </label>
          <input
            name="quantity"
            type="number"
            min="0"
            step="0.01"
            value={form.quantity}
            onChange={handleChange}
            className="w-full rounded-md border-slate-300 bg-white/90 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            placeholder="e.g. 10"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Unit
          </label>
          <input
            name="unit"
            type="text"
            value={form.unit}
            onChange={handleChange}
            className="w-full rounded-md border-slate-300 bg-white/90 shadow-sm focus:border-sky-500 focus:ring-sky-500"
            placeholder="e.g. kg, pcs"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={!selectedMachineId || saving}
            className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs font-medium shadow-md hover:from-sky-600 hover:to-indigo-600 disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto border border-slate-200/80 rounded-lg bg-white/90 shadow-sm">
        <table className="min-w-full text-xs">
          <thead className="bg-sky-50">
            <tr>
              <th className="px-3 py-2 text-center font-medium text-sky-800 w-16">
                S.No
              </th>
              <th className="px-3 py-2 text-left font-medium text-sky-800">Name</th>
              <th className="px-3 py-2 text-right font-medium text-sky-800 w-24">
                Quantity
              </th>
              <th className="px-3 py-2 text-left font-medium text-sky-800">Unit</th>
              <th className="px-3 py-2 text-right font-medium text-sky-800">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, idx) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-700 text-center">{idx + 1}</td>
                <td className="px-3 py-2 text-slate-800">{m.name}</td>
                <td className="px-3 py-2 text-slate-700 text-right">{m.quantity}</td>
                <td className="px-3 py-2 text-slate-700">{m.unit}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onMaterialDeleted(m.id)}
                    className="text-[11px] font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-slate-400 text-xs"
                >
                  No items in this list yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MachineManagement() {
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [newMachineName, setNewMachineName] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [savingMachine, setSavingMachine] = useState(false);
  const [deletingMachineId, setDeletingMachineId] = useState(null);
  const [error, setError] = useState('');

  const loadMachines = async () => {
    try {
      setLoadingMachines(true);
      const res = await api.get('/machines');
      setMachines(res.data);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to load machines'));
    } finally {
      setLoadingMachines(false);
    }
  };

  const loadMaterials = async (machineIdToUse) => {
    const id = machineIdToUse || selectedMachineId;
    if (!id) {
      setMaterials([]);
      return;
    }
    try {
      setLoadingMaterials(true);
      const res = await api.get('/materials', {
        params: { machineId: id },
      });
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to load materials'));
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    if (selectedMachineId) {
      loadMaterials(selectedMachineId);
    }
  }, [selectedMachineId]);

  const handleAddMachine = async (e) => {
    e.preventDefault();
    setError('');
    if (!newMachineName.trim()) {
      setError('Machine name is required');
      return;
    }
    try {
      setSavingMachine(true);
      const res = await api.post('/machines', { name: newMachineName.trim() });
      setNewMachineName('');
      await loadMachines();

      // After creating a machine, select it so the user can
      // immediately add raw materials required for that machine.
      if (res?.data?.id) {
        setSelectedMachineId(String(res.data.id));
        await loadMaterials(res.data.id);
      }
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to create machine'));
    } finally {
      setSavingMachine(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await api.delete(`/materials/${id}`);
      await loadMaterials();
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to delete material'));
    }
  };

  const handleDeleteMachine = async (id) => {
    if (!window.confirm('Delete this machine and all its materials?')) return;
    setError('');
    try {
      setDeletingMachineId(id);
      await api.delete(`/machines/${id}`);

      if (String(selectedMachineId) === String(id)) {
        setSelectedMachineId('');
        setMaterials([]);
      }

      await loadMachines();
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to delete machine'));
    } finally {
      setDeletingMachineId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Machine Management</h2>
        <p className="text-sm text-slate-500">
          Add machines and define their required loading materials.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left side: machines list + add form */}
        <div className="lg:col-span-1 space-y-4">
          <section className="border border-sky-100 rounded-lg p-4 bg-gradient-to-br from-sky-50 via-slate-50 to-indigo-50">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Add Machine</h3>
            <form onSubmit={handleAddMachine} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Machine Name
                </label>
                <input
                  type="text"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  className="w-full rounded-md border-slate-300 bg-white/90 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                  placeholder="e.g. CNC Mill"
                />
              </div>
              <button
                type="submit"
                disabled={savingMachine}
                className="inline-flex items-center px-3 py-2 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs font-medium shadow-md hover:from-sky-600 hover:to-indigo-600 disabled:opacity-60"
              >
                {savingMachine ? 'Saving…' : 'Save Machine'}
              </button>
            </form>
          </section>

          <section className="border border-indigo-100 rounded-lg p-4 bg-white/95 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Machines</h3>
            {loadingMachines ? (
              <Spinner />
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto text-sm">
                {machines.map((m) => {
                  const active = String(m.id) === String(selectedMachineId);
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMachineId(String(m.id))}
                        className={`flex-1 text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                          active
                            ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        {m.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMachine(m.id)}
                        disabled={deletingMachineId === m.id}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
                      >
                        {deletingMachineId === m.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  );
                })}
                {machines.length === 0 && (
                  <p className="text-xs text-slate-400">No machines yet. Add one above.</p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right side: materials by category for selected machine */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Materials for Selected Machine
            </h3>
            <span className="text-xs text-slate-500">
              {selectedMachineId
                ? 'Editing materials for the highlighted machine on the left.'
                : 'Select a machine on the left to manage its materials.'}
            </span>
          </div>

          {loadingMaterials && <Spinner />}

          {!loadingMaterials && selectedMachineId && (
            <div className="space-y-5">
              <MaterialsSection
                title="Loading Materials Required"
                materials={materials}
                selectedMachineId={selectedMachineId}
                onMaterialAdded={loadMaterials}
                onMaterialDeleted={handleDeleteMaterial}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
