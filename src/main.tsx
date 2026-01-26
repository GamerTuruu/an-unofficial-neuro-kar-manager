import React from "react";
import ReactDOM from "react-dom/client";
import { Route, HashRouter as Router, Routes } from "react-router-dom";
import "./global.css";
import Layout from "./components/Layout";
import DownloadPage from "./pages/Download";
import HomePage from "./pages/HomePage";
import InitPage from "./pages/InitPage";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<InitPage />} />
        <Route element={<Layout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/download" element={<DownloadPage />} />
        </Route>
      </Routes>
    </Router>
  </React.StrictMode>,
);
