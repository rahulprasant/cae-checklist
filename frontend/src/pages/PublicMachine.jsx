import { useEffect, useState } from 'react';
import apiClient from '../apiClient';
import Spinner from '../components/Spinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';

export default function PublicMachine({ machineId }) {
  const [machine, setMachine] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!machineId) {
      setError('No machine ID provided');
      setLoading(false);
      return;
    }

    const fetchMachineData = async () => {
      try {
        setLoading(true);
        console.log('Fetching machine:', machineId);
        const machineRes = await apiClient.get(`/machines/${machineId}`);
        console.log('Machine data:', machineRes.data);

        const materialsRes = await apiClient.get('/materials', { 
          params: { machineId } 
        });
        console.log('Materials data:', materialsRes.data);

        setMachine(machineRes.data);
        setMaterials(materialsRes.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching machine data:', err);
        const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch machine data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchMachineData();
  }, [machineId]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/public/machines/${machineId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {error && <ErrorAlert message={error} />}

        {machine && (
          <>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{machine.name}</h1>
            <p className="text-gray-500 text-sm mb-6">
              Created: {new Date(machine.created_at).toLocaleDateString()}
            </p>

            {/* Share Button */}
            <button
              onClick={handleCopyLink}
              className={`mb-8 px-4 py-2 rounded-lg font-semibold transition ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {copied ? '✓ Link Copied!' : 'Copy Shareable Link'}
            </button>

            {/* Materials Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Required Materials</h2>
              {materials.length === 0 ? (
                <p className="text-gray-500">No materials assigned</p>
              ) : (
                <div className="space-y-3">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">{material.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Quantity:</span> {material.quantity}{' '}
                            {material.unit}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Category:</span>{' '}
                            <span className="capitalize">{material.category}</span>
                          </p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                          {material.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!machine && !loading && !error && (
          <p className="text-gray-500">Machine not found</p>
        )}
      </div>
    </div>
  );
}
