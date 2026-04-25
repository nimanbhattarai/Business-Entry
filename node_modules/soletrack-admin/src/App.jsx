import React, { useState } from "react";

const API = "http://localhost:4000/api";

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
    const res = await fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setDashboard(data);
  };

  const loadReport = async (period) => {
    const res = await fetch(`${API}/reports/${period}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setReport(data);
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
