import { useEffect, useRef, useState } from 'react';
import api from '../apiClient.js';
import Spinner from '../components/Spinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';

export default function StockDashboard() {
  const [stock, setStock] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const loadStock = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stock');
      setStock(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load stock');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const res = await api.get('/materials');
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load materials');
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
    loadMaterials();
  }, []);

  const handleChange = (id, field, value) => {
    setStock((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleMaterialCheckbox = (materialId) => {
    setSelectedMaterials((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  const handleSave = async (row) => {
    setError('');
    try {
      setSavingId(row.id);
      await api.put(`/stock/${row.id}`, {
        available_quantity: Number(row.available_quantity),
        minimum_threshold: Number(row.minimum_threshold),
      });
      await loadStock();
    } catch (err) {
      console.error(err);
      setError('Failed to update stock');
    } finally {
      setSavingId(null);
    }
  };

  const handleExportData = async () => {
    setError('');
    try {
      setBackupLoading(true);
      const response = await api.get('/data/export', { responseType: 'blob' });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `cae-checklist-backup-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      setError('Failed to export data');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    try {
      setBackupLoading(true);
      const fileContent = await file.text();
      const payload = JSON.parse(fileContent);

      await api.post('/data/import', payload);
      await loadStock();
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.error || 'Failed to import data';
      setError(message);
    } finally {
      setBackupLoading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Stock Management</h2>
        <p className="text-sm text-slate-500">
          Maintain product stock levels and minimum thresholds. When loading checklists are
          generated, stock is automatically reduced and low stock items are highlighted here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleExportData}
          disabled={backupLoading}
          className="inline-flex items-center px-3 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium shadow-md hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60"
        >
          {backupLoading ? 'Please wait...' : 'Export Data'}
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          disabled={backupLoading}
          className="inline-flex items-center px-3 py-2 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs font-medium shadow-md hover:from-sky-600 hover:to-indigo-600 disabled:opacity-60"
        >
          {backupLoading ? 'Please wait...' : 'Import Data'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />

      <section className="border border-slate-200 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-slate-50">
        <h3 className="text-md font-semibold text-slate-800 mb-3">Materials</h3>
        {materialsLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-center font-medium text-slate-700 w-12">
                    <input
                      type="checkbox"
                      checked={selectedMaterials.size === materials.length && materials.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMaterials(new Set(materials.map((m) => m.id)));
                        } else {
                          setSelectedMaterials(new Set());
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-slate-700 w-16">
                    S.No
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Material Name</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-700 w-32">
                    Category
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-slate-700 w-24">
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, idx) => (
                  <tr key={material.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedMaterials.has(material.id)}
                        onChange={() => handleMaterialCheckbox(material.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-700 text-center">{idx + 1}</td>
                    <td className="px-3 py-2 text-slate-800 font-medium">{material.name}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          material.category === 'raw'
                            ? 'bg-blue-100 text-blue-800'
                            : material.category === 'fabrication'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {material.category === 'raw'
                          ? 'Raw'
                          : material.category === 'fabrication'
                          ? 'Fabrication'
                          : 'Purchase'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{material.unit}</td>
                  </tr>
                ))}
                {materials.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400 text-sm">
                      No materials defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border border-emerald-100 rounded-lg p-4 bg-gradient-to-br from-emerald-50 to-emerald-50">
        <h3 className="text-md font-semibold text-slate-800 mb-3">Stock Management</h3>
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-emerald-100">
                <tr>
                  <th className="px-3 py-2 text-center font-medium text-emerald-700 w-16">
                    S.No
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-emerald-700">Material</th>
                  <th className="px-3 py-2 text-right font-medium text-emerald-700 w-28">
                    Available
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-emerald-700 w-32">
                    Minimum Threshold
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-emerald-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((row, idx) => {
                  const below = Number(row.available_quantity) < Number(row.minimum_threshold);
                  return (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-emerald-50">
                      <td className="px-3 py-2 text-slate-700 text-center">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-800">{row.material_name}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.available_quantity}
                          onChange={(e) =>
                            handleChange(row.id, 'available_quantity', e.target.value)
                          }
                          className="w-24 text-right rounded-md border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.minimum_threshold}
                          onChange={(e) =>
                            handleChange(row.id, 'minimum_threshold', e.target.value)
                          }
                          className="w-24 text-right rounded-md border border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              below
                                ? 'bg-red-100 text-red-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {below ? 'Low' : 'OK'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSave(row)}
                            disabled={savingId === row.id}
                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs font-medium shadow-md hover:from-sky-600 hover:to-indigo-600 disabled:opacity-60"
                          >
                            {savingId === row.id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {stock.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-slate-400 text-sm"
                    >
                      No stock items defined yet.
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
