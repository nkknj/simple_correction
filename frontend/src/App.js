import React, { useState } from 'react';

function App() {
  const [fileContent, setFileContent] = useState('');
  const [processed, setProcessed] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFileContent(reader.result);
    reader.readAsText(file);
  };

  const handleProcess = async () => {
    setLoading(true);
    const apiUrl = process.env.REACT_APP_API_URL || 'YOUR_API_URL_HERE';
    const res = await fetch(`${apiUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileContent }),
    });
    const data = await res.json();
    setProcessed(data.processedText);
    setLoading(false);
  };

  const handleDownload = () => {
    const blob = new Blob([processed], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'corrected.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="App">
      <h1>Simple Correction</h1>
      <input type="file" accept=".txt" onChange={handleFileChange} />
      <button onClick={handleProcess} disabled={!fileContent || loading}>
        {loading ? 'Processing...' : 'Process'}
      </button>
      {processed && (
        <>
          <button onClick={handleDownload}>Download</button>
          <pre>{processed}</pre>
        </>
      )}
    </div>
  );
}

export default App;
