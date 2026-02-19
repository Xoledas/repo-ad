import React from 'react';
import Header from '../components/Header';
import './PageOne.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function PageOne() {
  return (
    <div className="page-one">
      <Header />
      <main className="page-one-body">
        <div className="button-group">
          <a
            href={`${BACKEND_URL}/auth/login`}
            className="action-button primary-link"
          >
            Authenticate
          </a>
        </div>
      </main>
    </div>
  );
}

export default PageOne;
