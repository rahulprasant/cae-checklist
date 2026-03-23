import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../apiClient.js';
import Spinner from '../components/Spinner.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';

export default function GenerateChecklist() {
  const [machines, setMachines] = useState([]);
  const [selectedMachineQuantities, setSelectedMachineQuantities] = useState({});
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [siteName, setSiteName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  const loadMachines = async () => {
    try {
      setLoadingMachines(true);
      const res = await api.get('/machines');
      setMachines(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load machines');
    } finally {
      setLoadingMachines(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  const toggleMachine = (id) => {
    const key = String(id);
    setSelectedMachineQuantities((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: 1 };
    });
  };

  const updateMachineQuantity = (id, quantity) => {
    const key = String(id);
    const safeQuantity = Number.isFinite(Number(quantity))
      ? Math.max(1, Math.floor(Number(quantity)))
      : 1;

    setSelectedMachineQuantities((prev) => ({
      ...prev,
      [key]: safeQuantity,
    }));
  };

  const formatDateForDisplay = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}/${year}`;
  };

  const handleGenerate = async () => {
    setError('');
    setResults(null);
    setLowStockAlerts([]);
    setPdfBlob(null);
    setPdfPreviewUrl(null);
    if (!siteName.trim()) {
      setError('Please enter site name');
      return;
    }
    if (!deliveryDate.trim()) {
      setError('Please enter delivery date');
      return;
    }
    const selectedMachineIds = Object.keys(selectedMachineQuantities);
    if (selectedMachineIds.length === 0) {
      setError('Please select at least one machine');
      return;
    }

    const expandedMachineIds = selectedMachineIds.flatMap((id) => {
      const quantity = Math.max(1, Math.floor(Number(selectedMachineQuantities[id] || 1)));
      return Array(quantity).fill(Number(id));
    });

    try {
      setLoadingChecklist(true);
      const res = await api.post('/checklists/generate', {
        machineIds: expandedMachineIds,
      });
      setResults(res.data);
      setLowStockAlerts(res.data.lowStockAlerts || []);
      generateProfessionalPDF({
        rawMaterials: res.data.rawMaterials || [],
        fabricationParts: res.data.fabricationParts || [],
        purchaseMaterials: res.data.purchaseMaterials || [],
        loadingChecklist: res.data.loadingChecklist || [],
        machineWiseMaterials: res.data.machineWiseMaterials || {},
        machineWiseGroups: res.data.machineWiseGroups || {},
      });
    } catch (err) {
      console.error(err);
      setError('Failed to generate checklist');
    } finally {
      setLoadingChecklist(false);
    }
  };

  // Generate professional industrial checklist PDF with new design
  const generateProfessionalPDF = (checklistData) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = { left: 10, right: 10, top: 10, bottom: 10 };
    let yPosition = margins.top;

    const addPageHeader = () => {
      // Header background - Light blue
      doc.setFillColor(120, 255, 255); // Light blue (#ADD8E6)
      doc.rect(0, 0, pageWidth, 12, 'F');

      // Title - Black texts
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('COIR ALL EQUIPMENTS', pageWidth / 2, 5.5, { align: 'center' });

      // Subtitle
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('CHECK LIST', pageWidth / 2, 9.5, { align: 'center' });

      return 16;
    };

    const addInfoSection = () => {
      const now = new Date();
      const currentDate = now.toLocaleDateString('en-GB');
      const formattedDeliveryDate = formatDateForDisplay(deliveryDate);

      // Light yellow background for info
      doc.setFillColor(255, 255, 200); // Light yellow
      doc.rect(margins.left, yPosition - 1.5, pageWidth - margins.left - margins.right, 10, 'F');

      // Black text
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      // Site Name
      doc.text(`Site Name: ${siteName}`, margins.left + 2, yPosition + 1);
      doc.text(`Date: ${currentDate}`, margins.left + 2, yPosition + 5);
      doc.text(`Date of Delivery: ${formattedDeliveryDate}`, pageWidth - margins.right - 2, yPosition + 5, {
        align: 'right',
      });

      yPosition += 11;
    };

    const addMachineSection = (machineName, materials, machineNames = []) => {
      // Check if new page needed
      if (yPosition > pageHeight - 35) {
        doc.addPage();
        yPosition = addPageHeader();
      }

      // Machine name heading - Light green background
      doc.setFillColor(144, 238, 144); // Light green (#90EE90)
      doc.rect(margins.left, yPosition - 1.5, pageWidth - margins.left - margins.right, 5, 'F');
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(`${machineName}`, margins.left + 2, yPosition + 1.2);
      yPosition += 5.5;

      // Prepare table data with empty checkbox cells
      const machineRows = machineNames.map((name, index) => [
        index + 1,
        name,
        '',
        '',
        '',
      ]);

      const materialRows = materials.map((item, index) => [
        machineRows.length + index + 1,
        item.name,
        item.total_quantity,
        item.unit,
        '',
      ]);

      const tableBody = [...machineRows, ...materialRows];

      autoTable(doc, {
        startY: yPosition,
        margin: { left: margins.left, right: margins.right },
        tableWidth: pageWidth - margins.left - margins.right,
        theme: 'grid',
        head: [['S.No', 'Material', 'Quantity', 'Unit', 'Check Box']],
        body: tableBody,
        headStyles: {
          fillColor: [173, 216, 230], // Light blue
          textColor: [0, 0, 0], // Black text
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 1.8,
          fontSize: 8,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
        },
        bodyStyles: {
          textColor: [0, 0, 0],
          cellPadding: 1.5,
          fontSize: 8,
          lineWidth: 0.5,
          lineColor: [200, 200, 200],
        },
        alternateRowStyles: {
          fillColor: [240, 248, 255], // Alice blue (very light blue)
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14, fontSize: 8 },
          1: { halign: 'left', cellWidth: 106 },
          2: { halign: 'center', cellWidth: 24 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 28 },
        },
        didDrawPage: (data) => {
          // Page number at bottom
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Page ${doc.internal.pages.length}`,
            pageWidth / 2,
            pageHeight - 5,
            { align: 'center' }
          );
        },
      });

      yPosition = doc.lastAutoTable.finalY + 4;
    };

    // Start PDF generation
    yPosition = addPageHeader();
    addInfoSection();

    // Get machine-wise materials
    const machineWiseGroups = checklistData.machineWiseGroups || {};
    const machineGroupNames = Object.keys(machineWiseGroups);

    if (machineGroupNames.length > 0) {
      // Add sections by machine
      machineGroupNames.forEach((machineName) => {
        const group = machineWiseGroups[machineName] || {};
        addMachineSection(machineName, group.materials || [], group.machines || []);
      });
    } else {
      // Fallback: Show sections
      if (checklistData.rawMaterials && checklistData.rawMaterials.length > 0) {
        addMachineSection('RAW MATERIALS', checklistData.rawMaterials);
      }

      if (checklistData.fabricationParts && checklistData.fabricationParts.length > 0) {
        addMachineSection('PARTS FOR FABRICATION', checklistData.fabricationParts);
      }

      if (checklistData.purchaseMaterials && checklistData.purchaseMaterials.length > 0) {
        addMachineSection('MATERIALS FOR PURCHASE', checklistData.purchaseMaterials);
      }

      if (checklistData.loadingChecklist && checklistData.loadingChecklist.length > 0) {
        addMachineSection('LOADING CHECKLIST', checklistData.loadingChecklist);
      }
    }

    // Generate PDF blob and preview URL
    const pdfOutput = doc.output('blob');
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(pdfOutput);
    setPdfBlob(pdfOutput);
    setPdfPreviewUrl(previewUrl);
  };

  const handleDownloadChecklist = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `industrial-checklist-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedMachineList = machines
    .filter((m) => selectedMachineQuantities[String(m.id)])
    .map((m) => ({
      id: m.id,
      name: m.name,
      quantity: Number(selectedMachineQuantities[String(m.id)] || 1),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Production Checklist Generator</h2>
        <p className="text-sm text-slate-500">
          Select machines for a production batch, then generate raw materials, fabrication parts,
          purchase materials, and the combined loading checklist.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />

      <section className="border border-indigo-100 rounded-lg p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-sky-50">
        <h3 className="text-md font-semibold text-slate-800 mb-4">Project Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Site Name
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Enter site name"
              className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date of Delivery (DD/MM/YYYY)
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="border border-sky-100 rounded-lg p-4 bg-gradient-to-br from-sky-50 via-slate-50 to-emerald-50">
        <h3 className="text-md font-semibold text-slate-800 mb-2">Select Machines</h3>
        {loadingMachines ? (
          <Spinner />
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2">
            {machines.map((m) => {
              const checked = Boolean(selectedMachineQuantities[String(m.id)]);
              return (
                <label
                  key={m.id}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    checked
                      ? 'border-sky-500 bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm'
                      : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMachine(m.id)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                  />
                  <span>{m.name}</span>
                </label>
              );
            })}
            {machines.length === 0 && (
              <p className="text-sm text-slate-400">No machines available.</p>
            )}
          </div>
        )}

        {selectedMachineList.length > 0 && (
          <div className="mt-4 border border-slate-200 rounded-md bg-white/90 p-3 space-y-2">
            <h4 className="text-sm font-semibold text-slate-700">Selected Machines</h4>
            <div className="space-y-2">
              {selectedMachineList.map((machine, index) => (
                <div key={machine.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2">
                  <div className="text-sm text-slate-700">
                    {index + 1}. {machine.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateMachineQuantity(machine.id, machine.quantity - 1)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={machine.quantity}
                      onChange={(e) => updateMachineQuantity(machine.id, e.target.value)}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-center"
                    />
                    <button
                      type="button"
                      onClick={() => updateMachineQuantity(machine.id, machine.quantity + 1)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loadingChecklist}
            className="inline-flex items-center px-4 py-2 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-medium shadow-md hover:from-sky-600 hover:to-indigo-600 disabled:opacity-60"
          >
            {loadingChecklist ? 'Generating...' : 'Generate Checklist'}
          </button>
        </div>
      </section>

      {lowStockAlerts.length > 0 && (
        <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <h3 className="font-semibold mb-1">Low Stock Alerts</h3>
          <ul className="list-disc pl-5 space-y-1">
            {lowStockAlerts.map((s) => (
              <li key={s.id}>
                {s.material_name}: available {s.available_quantity} (min {s.minimum_threshold})
              </li>
            ))}
          </ul>
        </section>
      )}

      {loadingChecklist && <Spinner />}

      {results && !loadingChecklist && (
        <div className="space-y-4">
          {pdfPreviewUrl && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h3 className="text-md font-semibold text-slate-800 mb-3">PDF Preview</h3>
                <div className="rounded-md overflow-hidden shadow-md" style={{ height: '600px' }}>
                  <iframe
                    src={pdfPreviewUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    title="PDF Preview"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleDownloadChecklist}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium shadow-md hover:from-emerald-600 hover:to-teal-600"
                >
                  Download Checklist (PDF)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
