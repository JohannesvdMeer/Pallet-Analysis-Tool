import React, { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Main App Component
const PalletAnalysisTool = () => {
  const [activeTab, setActiveTab] = useState('interface');
  const [rawData, setRawData] = useState('');
  // Verwijderde ongebruikte state: parsedData
  const [analysisResults, setAnalysisResults] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Handle pasting data
  const handlePasteData = async () => {
    try {
      setProcessing(true);
      setError('');

      // Try to read from clipboard
      const clipboardText = await navigator.clipboard.readText();
      setRawData(clipboardText);
      
      // Process the pasted data
      const processed = processData(clipboardText);
      if (processed) {
        // Verwijderde ongebruikte setParsedData aanroep
        setAnalysisResults(processed.results);
        setActiveTab('results');
      }
    } catch (err) {
      setError('Kan niet automatisch plakken. Kopieer de gegevens en plak ze in het tekstveld.');
    } finally {
      setProcessing(false);
    }
  };

  // Process the raw text data
  const processData = (text) => {
    if (!text.trim()) {
      setError('Geen gegevens gevonden. Kopieer eerst de data uit het verlaadprogramma.');
      return null;
    }

    // Split into rows
    const rows = text.trim().split('\n');
    if (rows.length < 2) {
      setError('Onvoldoende rijen in gegevens. Controleer de data.');
      return null;
    }

    // Find header row (look for "Pallet (" text)
    let headerRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].includes('Pallet (')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      setError('Geen geldige header rij gevonden. Controleer de data.');
      return null;
    }

    // Parse the header
    const headers = rows[headerRowIndex].split('\t');
    
    // Parse the data rows
    const parsedRows = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      if (rows[i].trim() === '') continue;
      
      const values = rows[i].split('\t');
      const rowData = {};
      
      for (let j = 0; j < headers.length && j < values.length; j++) {
        rowData[headers[j]] = values[j];
      }
      
      parsedRows.push(rowData);
    }

    // Calculate analysis results
    const results = calculateResults(parsedRows);
    
    return { data: parsedRows, results };
  };

  // Calculate results from parsed data
  const calculateResults = (data) => {
    // If we don't have data or it's empty, return null
    if (!data || data.length === 0) return null;

    // Track unique pallet numbers and their types
    const uniquePallets = new Set();
    const palletTypes = {};
    
    // Initial calculations
    let totalColli = 0;
    let totalWeight = 0;
    const customerDict = {};

    // Process each row and track unique pallets by type
    data.forEach(row => {
      // Extract the pallet number from the first column (format: "5839141")
      const palletNumber = row['Pallet (49)']?.trim() || '';
      const palletType = row['Omschrijving']?.trim() || 'Onbekend';
      const customer = row['Klant'] || 'Onbekend';
      const colli = parseFloat(row['Colli'] || 0);
      // Converteer komma naar punt voor correcte decimal handling in Nederlands formaat
      const weightStr = (row['Bruto'] || '0').replace(',', '.');
      const weight = parseFloat(weightStr);
      
      // Add to totals
      totalColli += colli;
      totalWeight += weight;
      
      // Track unique pallet by number
      uniquePallets.add(palletNumber);
      
      // Track palette types
      if (!palletTypes[palletType]) {
        palletTypes[palletType] = new Set();
      }
      palletTypes[palletType].add(palletNumber);
      
      // Update customer dictionary
      if (customerDict[customer]) {
        // Only increment pallet count if this is a new pallet number
        if (!customerDict[customer].palletNumbers.has(palletNumber)) {
          customerDict[customer].palletNumbers.add(palletNumber);
          customerDict[customer].pallets += 1;
        }
        customerDict[customer].colli += colli;
        customerDict[customer].weight += weight;
      } else {
        customerDict[customer] = {
          pallets: 1,
          palletNumbers: new Set([palletNumber]),
          colli: colli,
          weight: weight
        };
      }
    });

    // Convert pallet types to array of counts
    const palletTypeCounts = Object.keys(palletTypes).map(type => ({
      type: type,
      count: palletTypes[type].size
    }));
    
    // Sort pallet types by count (descending)
    palletTypeCounts.sort((a, b) => b.count - a.count);
    
    // Convert customer dictionary to array
    const customersArray = Object.keys(customerDict).map(customer => ({
      name: customer,
      pallets: customerDict[customer].pallets,
      colli: customerDict[customer].colli,
      weight: customerDict[customer].weight
    }));
    
    // Sort customers by pallet count
    customersArray.sort((a, b) => b.pallets - a.pallets);
    
    // Get top 5 customers
    const topCustomers = customersArray.slice(0, 5);
    
    return {
      totalPallets: uniquePallets.size,
      totalColli,
      totalWeight,
      uniqueCustomers: customersArray.length,
      palletTypes: palletTypeCounts,
      topCustomers,
      allCustomers: customersArray
    };
  };

  // Handle clearing all data
  const handleClearData = () => {
    setRawData('');
    // Verwijderde ongebruikte setParsedData aanroep
    setAnalysisResults(null);
    setError('');
    setActiveTab('interface');
  };

  // Manually process pasted text
  const handleProcessText = () => {
    if (!rawData.trim()) {
      setError('Geen gegevens gevonden. Plak eerst de data in het tekstveld.');
      return;
    }
    
    const processed = processData(rawData);
    if (processed) {
      // Verwijderde ongebruikte setParsedData aanroep
      setAnalysisResults(processed.results);
      setActiveTab('results');
    }
  };

  // UI color scheme
  const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">Pallet Analysis Tool</h1>
      </header>
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button 
          onClick={() => setActiveTab('interface')}
          className={`px-4 py-2 font-medium ${activeTab === 'interface' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600'}`}
        >
          Interface
        </button>
        <button 
          onClick={() => setActiveTab('data')}
          className={`px-4 py-2 font-medium ${activeTab === 'data' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600'}`}
        >
          Data
        </button>
        <button 
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 font-medium ${activeTab === 'results' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600'}`}
          disabled={!analysisResults}
        >
          Results
        </button>
      </div>
      
      {/* Main Content */}
      <main className="flex-grow p-4">
        {/* Interface Tab */}
        {activeTab === 'interface' && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Instructies gebruiker</h2>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
              <ol className="list-decimal pl-4">
                <li>Kopieer de gegevens uit het verlaadprogramma</li>
                <li>Druk vervolgens op de groene knop "PLAKKEN"</li>
                <li>De Analyse wordt automatisch uitgevoerd</li>
                <li>Resultaten worden weergegeven in het tabblad "Results"</li>
                <li>Gebruik de knop "VELD WISSEN" om nieuwe gegegevens te plakken</li>
              </ol>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={handlePasteData}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full"
                disabled={processing}
              >
                {processing ? 'BEZIG...' : 'PLAKKEN'}
              </button>
              <button 
                onClick={handleClearData}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full"
              >
                VELD WISSEN
              </button>
            </div>
            
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>
        )}
        
        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Data Invoer</h2>
            <textarea
              className="w-full h-64 p-2 border border-gray-300 rounded font-mono"
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder="Plak hier uw data uit het verlaadprogramma..."
            />
            <div className="mt-4 flex space-x-4">
              <button 
                onClick={handleProcessText}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                VERWERKEN
              </button>
              <button 
                onClick={() => setRawData('')}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                WISSEN
              </button>
            </div>
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>
        )}
        
        {/* Results Tab */}
        {activeTab === 'results' && analysisResults && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Pallet Analysis Results</h2>
            
            {/* Summary Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Samenvatting</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Totaal pallets:</div>
                  <div className="text-xl font-bold">{analysisResults.totalPallets.toLocaleString()}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Totaal colli:</div>
                  <div className="text-xl font-bold">{analysisResults.totalColli.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Totaal bruto (kg):</div>
                  <div className="text-xl font-bold">{analysisResults.totalWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Unieke klanten:</div>
                  <div className="text-xl font-bold">{analysisResults.uniqueCustomers}</div>
                </div>
              </div>
            </div>
            
            {/* Pallet Types Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Pallet Types</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Type Pallet</th>
                      <th className="py-2 px-4 border-b text-right">Aantal</th>
                      <th className="py-2 px-4 border-b text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResults.palletTypes.map((palletType, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-2 px-4 border-b">{palletType.type}</td>
                        <td className="py-2 px-4 border-b text-right">{palletType.count}</td>
                        <td className="py-2 px-4 border-b text-right">
                          {((palletType.count / analysisResults.totalPallets) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Customer Table */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Klanten</h3>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Klant</th>
                      <th className="py-2 px-4 border-b text-right">Aantal Pallets</th>
                      <th className="py-2 px-4 border-b text-right">Totaal Colli</th>
                      <th className="py-2 px-4 border-b text-right">Totaal Gewicht</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResults.allCustomers.map((customer, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-2 px-4 border-b">{customer.name}</td>
                        <td className="py-2 px-4 border-b text-right">{customer.pallets.toLocaleString()}</td>
                        <td className="py-2 px-4 border-b text-right">{customer.colli.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className="py-2 px-4 border-b text-right">{customer.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bar Chart - Customers */}
              <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-3">Top 5 Klanten (aantal pallets)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysisResults.topCustomers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Aantal Pallets', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="pallets" fill="#4472C4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Pie Chart - Customers */}
              <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-3">Verdeling per Klant</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analysisResults.topCustomers}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="pallets"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analysisResults.topCustomers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Pallet Types Chart */}
              <div className="bg-white p-4 rounded shadow mt-6">
                <h3 className="text-lg font-semibold mb-3">Verdeling per Pallet Type</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysisResults.palletTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis label={{ value: 'Aantal', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8BC34A" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Pie Chart - Pallet Types */}
              <div className="bg-white p-4 rounded shadow mt-6">
                <h3 className="text-lg font-semibold mb-3">Verdeling per Pallet Type (%)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analysisResults.palletTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="type"
                      label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analysisResults.palletTypes.map((entry, index) => (
                        <Cell key={`cell-type-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PalletAnalysisTool;
