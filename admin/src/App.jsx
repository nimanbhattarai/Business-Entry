import React, { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function Card({ title, value }) {
  return (
    <div className="card">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("soletrack_admin_token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [report, setReport] = useState(null);

  const logout = () => {
    localStorage.removeItem("soletrack_admin_token");
    setToken("");
    setDashboard(null);
    setReport(null);
  };

  const authFetch = async (url) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      logout();
      throw new Error(data.message || "Session expired. Please login again.");
    }
    return res;
  };

  const login = async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message || "Login failed");
    localStorage.setItem("soletrack_admin_token", data.token);
    setToken(data.token);
  };

  const loadDashboard = async () => {
    try {
      const res = await authFetch(`${API}/dashboard`);
      const data = await res.json();
      setDashboard(data);
    } catch (e) {
      alert(e.message);
    }
  };

  const loadReport = async (period) => {
    try {
      const res = await authFetch(`${API}/reports/${period}`);
      const data = await res.json();
      setReport(data);
    } catch (e) {
      alert(e.message);
    }
  };

  if (!token) {
    return (
      <div className="layout">
        <h1>SoleTrack Admin Login</h1>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div className="layout">
      <h1>SoleTrack Admin Panel</h1>
      <div className="row">
        <button onClick={loadDashboard}>Refresh Dashboard</button>
        <button onClick={() => loadReport("daily")}>Daily Report</button>
        <button onClick={() => loadReport("weekly")}>Weekly Report</button>
        <button onClick={() => loadReport("monthly")}>Monthly Report</button>
        <button onClick={logout} style={{ background: "#0c1a33" }}>
          Logout
        </button>
      </div>

      {dashboard && (
        <div className="grid">
          <Card title="Production Today" value={dashboard.totalProductionToday} />
          <Card title="Sold Today" value={dashboard.totalSoldToday} />
          <Card title="Revenue" value={dashboard.totalRevenue} />
          <Card title="Profit/Loss" value={dashboard.profitOrLoss} />
        </div>
      )}

      {report && <pre className="report">{JSON.stringify(report, null, 2)}</pre>}
    </div>
  );
}
