import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import './PageTwo.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function PageTwo() {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const accessToken = searchParams.get('access_token');

  useEffect(() => {
    if (!accessToken) {
      setError('No access token provided. Please authenticate first.');
      setLoading(false);
      return;
    }

    const fetchAssets = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/assets/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bearerToken: accessToken }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        const hits = data?.hits?.results ?? [];
        setResults(hits);
      } catch (err) {
        console.error('Failed to fetch assets:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [accessToken]);

  return (
    <div className="page-two">
      <Header />
      <main className="page-two-body">
        {loading && <p className="status-text">Loading assets…</p>}
        {error && <p className="status-text error">Error: {error}</p>}

        {!loading && !error && results.length === 0 && (
          <p className="status-text">No results found.</p>
        )}

        <div className="tile-grid">
          {results.map((item, index) => {
            const repoName = item?.repositoryMetadata?.['repo:name'] || '';
            const lastDot = repoName.lastIndexOf('.');
            const seoName = lastDot > 0 ? repoName.substring(0, lastDot) : repoName;
            const format = lastDot > 0 ? repoName.substring(lastDot + 1) : 'jpeg';
            const description = item?.assetMetadata?.['autogen:description'] || '';

            const imgSrc = `${BACKEND_URL}/api/getMedia?assetId=${encodeURIComponent(item.assetId)}&seoName=${encodeURIComponent(seoName)}&format=${encodeURIComponent(format)}&bearerToken=${encodeURIComponent(accessToken)}`;

            return (
              <div className="asset-tile" key={item.assetId || index}>
                <img
                  src={imgSrc}
                  alt={repoName || item.assetId}
                  className="asset-image"
                />
                {description && (
                  <div className="asset-description">{description}</div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default PageTwo;
