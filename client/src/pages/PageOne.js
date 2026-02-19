import React from 'react';
import Header from '../components/Header';
import './PageOne.css';

/*
 * The "Authenticate" button navigates to the backend server,
 * which handles the redirect to the external auth provider.
 * All secrets (client_id, client_secret, etc.) stay server-side.
 */
const AUTH_SERVER_URL = 'https://localhost:4000/auth/login';

function PageOne() {
  return (
    <div className="page-one">
      <Header />
      <main className="page-one-body">
        <div className="button-group">
          <a
            href={AUTH_SERVER_URL}
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
