import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PageOne from './pages/PageOne';
import PageTwo from './pages/PageTwo';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PageOne />} />
        <Route path="/results" element={<PageTwo />} />
      </Routes>
    </Router>
  );
}

export default App;
