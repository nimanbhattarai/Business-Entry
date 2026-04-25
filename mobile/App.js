import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://localhost:4000/api";
const Tab = createBottomTabNavigator();

const AuthContext = createContext({
  token: "",
  setToken: () => {},
  logout: async () => {}
});

function useAuth() {
  return useContext(AuthContext);
}

async function apiFetch(url, options = {}, logout) {
  const resp = await fetch(url, options);
  if (resp.status === 401) {
    try {
      const data = await resp.json();
      if (data?.message === "Invalid token" || data?.message === "Unauthorized") {
        await logout();
        throw new Error("Session expired. Please login again.");
      }
    } catch (_e) {
      await logout();
      throw new Error("Session expired. Please login again.");
    }
  }
  return resp;
}

function Card({ title, value, tone = "blue" }) {
  const palette = {
    blue: { badge: "#DCE9FF", text: "#1C63F2" },
    green: { badge: "#DFF7EA", text: "#139A55" },
    amber: { badge: "#FFF1D6", text: "#C17A00" },
    red: { badge: "#FFE0E0", text: "#CE3434" }
  };
  const color = palette[tone] || palette.blue;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={[styles.cardBadge, { backgroundColor: color.badge }]}>
          <Text style={[styles.cardBadgeText, { color: color.text }]}>KPI</Text>
        </View>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

function WeeklyProductionChart({ data }) {
  if (!data?.length) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weekly Production Trend</Text>
        <Text style={styles.emptyChartText}>No weekly chart data yet</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.total), 1);

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Weekly Production Trend</Text>
      <View style={styles.chartBarsRow}>
        {data.map((item) => {
          const heightPercent = Math.max(12, Math.round((item.total / maxValue) * 100));
          const dayLabel = item._id.slice(5);
          return (
            <View key={item._id} style={styles.chartBarWrap}>
              <Text style={styles.chartValue}>{item.total}</Text>
              <View style={styles.chartTrack}>
                <View style={[styles.chartBar, { height: `${heightPercent}%` }]} />
              </View>
              <Text style={styles.chartLabel}>{dayLabel}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SearchableSelect({ label, value, options, onChange, onAddNew, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => o.name.toLowerCase().includes(query));
  }, [q, options]);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.selectBox} onPress={() => setOpen(true)}>
        <Text style={styles.selectValue}>{value || placeholder}</Text>
        <Text style={styles.selectChevron}>▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalWrap}>
          <Text style={styles.modalTitle}>{label}</Text>
          <TextInput
            style={styles.input}
            placeholder="Search..."
            placeholderTextColor="#8A96B2"
            value={q}
            onChangeText={setQ}
          />
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            {filtered.map((o) => (
              <Pressable
                key={o._id || o.name}
                style={styles.optionRow}
                onPress={() => {
                  onChange(o);
                  setOpen(false);
                  setQ("");
                }}
              >
                <Text style={styles.optionText}>{o.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {adding && (
            <View style={styles.addNewBox}>
              <Text style={styles.label}>New {label}</Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter ${label}`}
                placeholderTextColor="#8A96B2"
                value={newName}
                onChangeText={setNewName}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.button, { flex: 1 }]}
                  onPress={async () => {
                    const name = newName.trim();
                    if (!name) return Alert.alert("Missing", `Enter ${label}`);
                    const created = await onAddNew?.(name);
                    if (created) {
                      onChange(created);
                      setAdding(false);
                      setNewName("");
                      setOpen(false);
                      setQ("");
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, { flex: 1, backgroundColor: "#0C1A33" }]}
                  onPress={() => {
                    setAdding(false);
                    setNewName("");
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.button, { flex: 1 }]}
              onPress={() => {
                setAdding(true);
                setNewName(q.trim());
              }}
            >
              <Text style={styles.buttonText}>Add New</Text>
            </Pressable>
            <Pressable style={[styles.button, { flex: 1, backgroundColor: "#0C1A33" }]} onPress={() => setOpen(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DashboardScreen() {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadDashboard = async () => {
    const [dashboardRes, inventoryRes] = await Promise.all([
      apiFetch(`${API_URL}/dashboard`, { headers: authHeaders(token) }, logout),
      apiFetch(`${API_URL}/inventory`, { headers: authHeaders(token) }, logout)
    ]);
    const dashboardJson = await dashboardRes.json();
    const inventoryJson = await inventoryRes.json();
    setData(dashboardJson);
    setInventory(inventoryJson);
  };

  const loadReport = async (period) => {
    setLoadingReport(true);
    try {
      const res = await apiFetch(`${API_URL}/reports/${period}`, { headers: authHeaders(token) }, logout);
      const json = await res.json();
      setReport(json);
    } catch (e) {
      Alert.alert("Error", e.message || "Could not load report");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => {});
  }, []);

  if (!data) return <Text style={styles.sectionTitle}>Loading dashboard...</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <Text style={styles.heroOverline}>SoleTrack</Text>
        <Text style={styles.heroTitle}>Production Insights</Text>
        <Text style={styles.heroSubtitle}>Track stock, sales, and profit in one view</Text>
      </View>
      <Text style={styles.sectionTitle}>Today Overview</Text>
      <View style={styles.cardGrid}>
        <View style={styles.cardGridItem}>
          <Card title="Total Production" value={data.totalProductionToday} tone="blue" />
        </View>
        <View style={styles.cardGridItem}>
          <Card title="Total Sold" value={data.totalSoldToday} tone="green" />
        </View>
        <View style={styles.cardGridItem}>
          <Card title="Remaining Stock" value={data.remainingStock} tone="amber" />
        </View>
        <View style={styles.cardGridItem}>
          <Card title="Material Cost" value={`Rs ${data.totalMaterialCost}`} tone="red" />
        </View>
        <View style={styles.cardGridItem}>
          <Card title="Revenue" value={`Rs ${data.totalRevenue}`} tone="green" />
        </View>
        <View style={styles.cardGridItem}>
          <Card title="Profit / Loss" value={`Rs ${data.profitOrLoss}`} tone={data.profitOrLoss >= 0 ? "green" : "red"} />
        </View>
        <View style={styles.cardGridItem}>
          <Card title="Pending Payment" value={`Rs ${data.pendingPayment || 0}`} tone="amber" />
        </View>
        <View style={styles.cardGridItem}>
          <Card title="Expenses Today" value={`Rs ${data.totalExpensesToday || 0}`} tone="red" />
        </View>
        {inventory && (
          <View style={styles.cardGridItem}>
            <Card title="Low Stock Alert" value={inventory.lowStockWarning ? "Yes" : "No"} tone={inventory.lowStockWarning ? "red" : "green"} />
          </View>
        )}
      </View>
      <WeeklyProductionChart data={data.weeklyProduction} />
      {Array.isArray(data.productionByArticleToday) && data.productionByArticleToday.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Today's Production by Article</Text>
          {data.productionByArticleToday.slice(0, 8).map((row) => (
            <View key={row.article} style={styles.kpiRow}>
              <Text style={styles.kpiLeft}>{row.article}</Text>
              <Text style={styles.kpiRight}>{row.total} pcs</Text>
            </View>
          ))}
        </View>
      )}
      {Array.isArray(data.inventoryByArticle) && data.inventoryByArticle.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Current Stock by Article</Text>
          {data.inventoryByArticle.slice(0, 8).map((row) => (
            <View key={row.article} style={styles.kpiRow}>
              <Text style={styles.kpiLeft}>{row.article}</Text>
              <Text style={styles.kpiRight}>{row.stock} pcs</Text>
            </View>
          ))}
        </View>
      )}
      {data.expensesByCategoryMonth && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Expenses (This Month)</Text>
          {Object.entries(data.expensesByCategoryMonth).map(([k, v]) => (
            <View key={k} style={styles.kpiRow}>
              <Text style={styles.kpiLeft}>{formatLabel(k)}</Text>
              <Text style={styles.kpiRight}>Rs {v}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionSubtitle}>Reports</Text>
      <View style={styles.inlineButtons}>
        <Pressable style={styles.smallButton} onPress={() => loadReport("daily")}>
          <Text style={styles.buttonText}>Daily</Text>
        </Pressable>
        <Pressable style={styles.smallButton} onPress={() => loadReport("weekly")}>
          <Text style={styles.buttonText}>Weekly</Text>
        </Pressable>
        <Pressable style={styles.smallButton} onPress={() => loadReport("monthly")}>
          <Text style={styles.buttonText}>Monthly</Text>
        </Pressable>
      </View>

      {loadingReport && <Text style={styles.helperText}>Loading report...</Text>}
      {report && (
        <View style={styles.reportBox}>
          <Text style={styles.reportTitle}>Report Snapshot ({report.period})</Text>
          <Text style={styles.helperText}>Production: {report.production}</Text>
          <Text style={styles.helperText}>Sold: {report.sold}</Text>
          <Text style={styles.helperText}>Revenue: Rs {report.revenue}</Text>
          <Text style={styles.helperText}>Expense: Rs {report.expense}</Text>
          <Text style={styles.helperText}>Profit: Rs {report.profit}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function ProductionScreen() {
  return <ProductionEntryScreen />;
}

function SalesScreen() {
  return <SalesEntryScreen />;
}

function MaterialScreen() {
  return <ExpensesScreen />;
}

function SettingsScreen({ isDark, setIsDark }) {
  const { logout } = useAuth();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>Business Name</Text>
        <TextInput style={styles.input} placeholder="Sole Production House" placeholderTextColor="#8A96B2" />
        <Text style={styles.label}>Currency</Text>
        <TextInput style={styles.input} placeholder="NPR / INR / USD" placeholderTextColor="#8A96B2" />
      </View>
      <View style={styles.panel}>
        <View style={styles.row}>
          <Text style={styles.label}>Dark Mode</Text>
          <Switch value={isDark} onValueChange={setIsDark} />
        </View>
      </View>
      <Pressable
        style={[styles.button, { backgroundColor: "#0C1A33" }]}
        onPress={() => {
          logout();
          Alert.alert("Logged out", "Please login again.");
        }}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function ProductionEntryScreen() {
  const { token, logout } = useAuth();
  const [articles, setArticles] = useState([]);
  const [article, setArticle] = useState(null);
  const [date, setDate] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");

  const loadArticles = async () => {
    const res = await apiFetch(`${API_URL}/master/article`, { headers: authHeaders(token) }, logout);
    const json = await res.json();
    setArticles(json);
  };

  useEffect(() => {
    loadArticles().catch(() => {});
  }, []);

  const addArticle = async (name) => {
    const r = await apiFetch(
      `${API_URL}/master/article`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ name })
      },
      logout
    );
    const created = await r.json();
    await loadArticles();
    return created;
  };

  const save = async () => {
    try {
      if (!article?.name) return Alert.alert("Missing", "Please select an Article Number");
      const resp = await apiFetch(
        `${API_URL}/production`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
          body: JSON.stringify({
            date: date || new Date().toISOString(),
            articleId: article._id,
            articleName: article.name,
            quantity: Number(qty || 0),
            notes
          })
        },
        logout
      );
      if (!resp.ok) throw new Error("Save failed");
      Alert.alert("Saved", "Production saved");
      setQty("");
      setNotes("");
    } catch (e) {
      Alert.alert("Error", e.message || "Could not save");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Production</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} placeholder="Auto (today)" placeholderTextColor="#8A96B2" value={date} onChangeText={setDate} />
        <SearchableSelect
          label="Article Number"
          value={article?.name || ""}
          options={articles}
          onChange={setArticle}
          onAddNew={addArticle}
          placeholder="Select article"
        />
        <Text style={styles.label}>Quantity Produced</Text>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#8A96B2" keyboardType="numeric" value={qty} onChangeText={setQty} />
        <Text style={styles.label}>Production Notes</Text>
        <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#8A96B2" value={notes} onChangeText={setNotes} />
      </View>
      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

function ExpensesScreen() {
  const { token, logout } = useAuth();
  const [tab, setTab] = useState("rawMaterial");
  const [rawMaterials, setRawMaterials] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [machines, setMachines] = useState([]);

  const [rawMaterial, setRawMaterial] = useState(null);
  const [rmQty, setRmQty] = useState("");
  const [rmUnit, setRmUnit] = useState("kg");
  const [rmCost, setRmCost] = useState("");
  const [rmSupplier, setRmSupplier] = useState("");
  const [rmDate, setRmDate] = useState("");

  const [employee, setEmployee] = useState(null);
  const [salaryAmount, setSalaryAmount] = useState("");
  const [advancePayment, setAdvancePayment] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [salaryNotes, setSalaryNotes] = useState("");

  const [machine, setMachine] = useState(null);
  const [machineType, setMachineType] = useState("repair");
  const [machineCost, setMachineCost] = useState("");
  const [machineDate, setMachineDate] = useState("");
  const [machineNotes, setMachineNotes] = useState("");

  const loadMasters = async () => {
    const [rm, emp, mac] = await Promise.all([
      apiFetch(`${API_URL}/master/rawMaterial`, { headers: authHeaders(token) }, logout).then((r) => r.json()),
      apiFetch(`${API_URL}/master/employee`, { headers: authHeaders(token) }, logout).then((r) => r.json()),
      apiFetch(`${API_URL}/master/machine`, { headers: authHeaders(token) }, logout).then((r) => r.json())
    ]);
    setRawMaterials(rm);
    setEmployees(emp);
    setMachines(mac);
  };

  useEffect(() => {
    loadMasters().catch(() => {});
  }, []);

  const createMaster = async (type, name) => {
    const r = await apiFetch(
      `${API_URL}/master/${type}`,
      { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) }, body: JSON.stringify({ name }) },
      logout
    );
    const created = await r.json();
    await loadMasters();
    return created;
  };

  const saveExpense = async (payload) => {
    const r = await apiFetch(
      `${API_URL}/expenses`,
      { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) }, body: JSON.stringify(payload) },
      logout
    );
    if (!r.ok) throw new Error("Save failed");
    Alert.alert("Saved", "Expense saved");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Purchases / Expenses</Text>
      <View style={styles.inlineButtons}>
        <Pressable style={[styles.smallButton, tab === "rawMaterial" && styles.smallButtonActive]} onPress={() => setTab("rawMaterial")}>
          <Text style={styles.buttonText}>Raw Material</Text>
        </Pressable>
        <Pressable style={[styles.smallButton, tab === "salary" && styles.smallButtonActive]} onPress={() => setTab("salary")}>
          <Text style={styles.buttonText}>Salary</Text>
        </Pressable>
        <Pressable style={[styles.smallButton, tab === "machine" && styles.smallButtonActive]} onPress={() => setTab("machine")}>
          <Text style={styles.buttonText}>Machine</Text>
        </Pressable>
      </View>

      {tab === "rawMaterial" && (
        <>
          <View style={styles.panel}>
            <SearchableSelect
              label="Raw material name"
              value={rawMaterial?.name || ""}
              options={rawMaterials}
              onChange={setRawMaterial}
              onAddNew={(name) => createMaster("rawMaterial", name)}
              placeholder="Select raw material"
            />
            <Text style={styles.label}>Quantity</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#8A96B2" keyboardType="numeric" value={rmQty} onChangeText={setRmQty} />
            <Text style={styles.label}>Unit</Text>
            <TextInput style={styles.input} placeholder="kg / pcs / ltr" placeholderTextColor="#8A96B2" value={rmUnit} onChangeText={setRmUnit} />
            <Text style={styles.label}>Cost</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#8A96B2" keyboardType="numeric" value={rmCost} onChangeText={setRmCost} />
            <Text style={styles.label}>Supplier Name</Text>
            <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#8A96B2" value={rmSupplier} onChangeText={setRmSupplier} />
            <Text style={styles.label}>Date</Text>
            <TextInput style={styles.input} placeholder="Auto (today)" placeholderTextColor="#8A96B2" value={rmDate} onChangeText={setRmDate} />
          </View>
          <Pressable
            style={styles.button}
            onPress={async () => {
              try {
                if (!rawMaterial?.name) return Alert.alert("Missing", "Select raw material");
                await saveExpense({
                  category: "rawMaterial",
                  date: rmDate || new Date().toISOString(),
                  cost: Number(rmCost || 0),
                  rawMaterial: {
                    rawMaterialId: rawMaterial._id,
                    rawMaterialName: rawMaterial.name,
                    quantity: Number(rmQty || 0),
                    unit: rmUnit,
                    supplierName: rmSupplier
                  }
                });
                setRmQty("");
                setRmCost("");
                setRmSupplier("");
              } catch (e) {
                Alert.alert("Error", e.message || "Could not save");
              }
            }}
          >
            <Text style={styles.buttonText}>Save</Text>
          </Pressable>
        </>
      )}

      {tab === "salary" && (
        <>
          <View style={styles.panel}>
            <SearchableSelect
              label="Employee Name"
              value={employee?.name || ""}
              options={employees}
              onChange={setEmployee}
              onAddNew={(name) => createMaster("employee", name)}
              placeholder="Select employee"
            />
            <Text style={styles.label}>Salary Amount</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#8A96B2" keyboardType="numeric" value={salaryAmount} onChangeText={setSalaryAmount} />
            <Text style={styles.label}>Advance Payment (optional)</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#8A96B2" keyboardType="numeric" value={advancePayment} onChangeText={setAdvancePayment} />
            <Text style={styles.label}>Payment Date</Text>
            <TextInput style={styles.input} placeholder="Auto (today)" placeholderTextColor="#8A96B2" value={paymentDate} onChangeText={setPaymentDate} />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#8A96B2" value={salaryNotes} onChangeText={setSalaryNotes} />
          </View>
          <Pressable
            style={styles.button}
            onPress={async () => {
              try {
                if (!employee?.name) return Alert.alert("Missing", "Select employee");
                const s = Number(salaryAmount || 0);
                const adv = Number(advancePayment || 0);
                const remaining = Math.max(s - adv, 0);
                await saveExpense({
                  category: "salary",
                  date: paymentDate || new Date().toISOString(),
                  cost: s,
                  notes: salaryNotes,
                  salary: {
                    employeeId: employee._id,
                    employeeName: employee.name,
                    salaryAmount: s,
                    advancePayment: adv,
                    remainingSalary: remaining,
                    paymentDate: paymentDate || new Date().toISOString()
                  }
                });
                setSalaryAmount("");
                setAdvancePayment("");
                setSalaryNotes("");
              } catch (e) {
                Alert.alert("Error", e.message || "Could not save");
              }
            }}
          >
            <Text style={styles.buttonText}>Save</Text>
          </Pressable>
        </>
      )}

      {tab === "machine" && (
        <>
          <View style={styles.panel}>
            <SearchableSelect
              label="Machine name"
              value={machine?.name || ""}
              options={machines}
              onChange={setMachine}
              onAddNew={(name) => createMaster("machine", name)}
              placeholder="Select machine"
            />
            <Text style={styles.label}>Repair / Purchase</Text>
            <TextInput style={styles.input} placeholder="repair or purchase" placeholderTextColor="#8A96B2" value={machineType} onChangeText={setMachineType} />
            <Text style={styles.label}>Cost</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#8A96B2" keyboardType="numeric" value={machineCost} onChangeText={setMachineCost} />
            <Text style={styles.label}>Date</Text>
            <TextInput style={styles.input} placeholder="Auto (today)" placeholderTextColor="#8A96B2" value={machineDate} onChangeText={setMachineDate} />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#8A96B2" value={machineNotes} onChangeText={setMachineNotes} />
          </View>
          <Pressable
            style={styles.button}
            onPress={async () => {
              try {
                if (!machine?.name) return Alert.alert("Missing", "Select machine");
                await saveExpense({
                  category: "machine",
                  date: machineDate || new Date().toISOString(),
                  cost: Number(machineCost || 0),
                  notes: machineNotes,
                  machine: { machineId: machine._id, machineName: machine.name, type: (machineType || "repair").toLowerCase() }
                });
                setMachineCost("");
                setMachineNotes("");
              } catch (e) {
                Alert.alert("Error", e.message || "Could not save");
              }
            }}
          >
            <Text style={styles.buttonText}>Save</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function SalesEntryScreen() {
  const { token, logout } = useAuth();
  const [articles, setArticles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [article, setArticle] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const total = useMemo(() => Number(qty || 0) * Number(rate || 0), [qty, rate]);

  const load = async () => {
    const [a, c] = await Promise.all([
      apiFetch(`${API_URL}/master/article`, { headers: authHeaders(token) }, logout).then((r) => r.json()),
      apiFetch(`${API_URL}/master/customer`, { headers: authHeaders(token) }, logout).then((r) => r.json())
    ]);
    setArticles(a);
    setCustomers(c);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const createMaster = async (type, name) => {
    const r = await apiFetch(
      `${API_URL}/master/${type}`,
      { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) }, body: JSON.stringify({ name }) },
      logout
    );
    const created = await r.json();
    await load();
    return created;
  };

  const save = async () => {
    try {
      if (!customer?.name) return Alert.alert("Missing", "Select Party Name");
      if (!article?.name) return Alert.alert("Missing", "Select Article Number");
      const r = await apiFetch(
        `${API_URL}/sales`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
          body: JSON.stringify({
            date: date || new Date().toISOString(),
            customerId: customer._id,
            customerName: customer.name,
            articleId: article._id,
            articleName: article.name,
            quantity: Number(qty || 0),
            ratePerPiece: Number(rate || 0),
            paymentStatus,
            paymentMethod,
            paidAmount: paymentStatus === "partial" ? Number(paidAmount || 0) : paymentStatus === "paid" ? total : 0,
            notes
          })
        },
        logout
      );
      if (!r.ok) throw new Error("Save failed");
      Alert.alert("Saved", "Sale saved");
      setQty("");
      setRate("");
      setNotes("");
      setPaidAmount("");
    } catch (e) {
      Alert.alert("Error", e.message || "Could not save");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Sales</Text>
      <View style={styles.panel}>
        <SearchableSelect
          label="Party Name"
          value={customer?.name || ""}
          options={customers}
          onChange={setCustomer}
          onAddNew={(name) => createMaster("customer", name)}
          placeholder="Select party"
        />
        <SearchableSelect
          label="Article Number"
          value={article?.name || ""}
          options={articles}
          onChange={setArticle}
          onAddNew={(name) => createMaster("article", name)}
          placeholder="Select article"
        />
        <Text style={styles.label}>Quantity Sold</Text>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#8A96B2" keyboardType="numeric" value={qty} onChangeText={setQty} />
        <Text style={styles.label}>Rate per piece</Text>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#8A96B2" keyboardType="numeric" value={rate} onChangeText={setRate} />
        <Card title="Total Amount" value={`Rs ${total}`} tone="blue" />
        <Text style={styles.label}>Payment Status (paid/partial/pending)</Text>
        <TextInput style={styles.input} placeholder="paid" placeholderTextColor="#8A96B2" value={paymentStatus} onChangeText={setPaymentStatus} />
        {paymentStatus === "partial" && (
          <>
            <Text style={styles.label}>Paid Amount</Text>
            <TextInput style={styles.input} placeholder="0" placeholderTextColor="#8A96B2" keyboardType="numeric" value={paidAmount} onChangeText={setPaidAmount} />
          </>
        )}
        <Text style={styles.label}>Payment Method (cash/online/credit)</Text>
        <TextInput style={styles.input} placeholder="cash" placeholderTextColor="#8A96B2" value={paymentMethod} onChangeText={setPaymentMethod} />
        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} placeholder="Auto (today)" placeholderTextColor="#8A96B2" value={date} onChangeText={setDate} />
        <Text style={styles.label}>Notes</Text>
        <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#8A96B2" value={notes} onChangeText={setNotes} />
      </View>
      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

function EntryForm({ endpoint, fields, title }) {
  const { token, logout } = useAuth();
  const [form, setForm] = useState({});

  const totalSale = useMemo(() => {
    if (!form.quantity || !form.pricePerSole) return 0;
    return Number(form.quantity) * Number(form.pricePerSole);
  }, [form.quantity, form.pricePerSole]);

  const onSave = async () => {
    try {
      const payload = { ...form };
      if (!payload.date) payload.date = new Date().toISOString();
      const resp = await apiFetch(
        `${API_URL}/${endpoint}`,
        {
        method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify(payload)
        },
        logout
      );
      if (!resp.ok) throw new Error("Save failed");
      Alert.alert("Saved", `${title} saved successfully`);
      setForm({});
    } catch (e) {
      Alert.alert("Error", e.message || "Could not save entry");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.panel}>
      {fields.map((field) => (
        <View key={field}>
          <Text style={styles.label}>{formatLabel(field)}</Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${formatLabel(field)}`}
            placeholderTextColor="#8A96B2"
            value={form[field] ?? ""}
            onChangeText={(v) => setForm((p) => ({ ...p, [field]: v }))}
          />
        </View>
      ))}
      </View>
      {endpoint === "sales" && <Card title="Auto Sale Amount" value={`Rs ${totalSale}`} />}
      <Pressable style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token || ""}` };
}

function formatLabel(field) {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async () => {
    try {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Login failed");
      await AsyncStorage.setItem("soletrack-token", data.token);
      onLogin(data.token);
    } catch (e) {
      Alert.alert("Login failed", e.message);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <View style={styles.loginCard}>
        <Text style={styles.heroOverline}>Welcome</Text>
        <Text style={styles.sectionTitle}>SoleTrack Login</Text>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8A96B2" value={email} onChangeText={setEmail} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8A96B2"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>
      <Pressable style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>
    </View>
  );
}

function MasterDataScreen() {
  const { token, logout } = useAuth();
  const [type, setType] = useState("article");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);

  const load = async () => {
    const url = `${API_URL}/master/${type}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`;
    const res = await apiFetch(url, { headers: authHeaders(token) }, logout);
    const json = await res.json();
    setItems(json);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [type]);

  const add = async () => {
    const name = q.trim();
    if (!name) return Alert.alert("Missing", "Type a name in search box then press Add");
    try {
      const r = await apiFetch(
        `${API_URL}/master/${type}`,
        { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) }, body: JSON.stringify({ name }) },
        logout
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Could not add");
      }
      setQ("");
      await load();
    } catch (e) {
      Alert.alert("Error", e.message || "Could not add");
    }
  };

  const bootstrap = async () => {
    try {
      const r = await apiFetch(
        `${API_URL}/master/bootstrap/defaults`,
        { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) } },
        logout
      );
      if (!r.ok) throw new Error("Bootstrap failed");
      await load();
      Alert.alert("Done", "Default master data added");
    } catch (e) {
      Alert.alert("Error", e.message || "Could not bootstrap");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Master Data</Text>

      <View style={styles.inlineButtons}>
        {[
          ["article", "Articles"],
          ["rawMaterial", "Raw Materials"],
          ["customer", "Customers"],
          ["employee", "Employees"],
          ["supplier", "Suppliers"],
          ["machine", "Machines"],
          ["taxType", "Tax Types"]
        ].map(([k, label]) => (
          <Pressable key={k} style={[styles.smallButton, type === k && styles.smallButtonActive]} onPress={() => setType(k)}>
            <Text style={styles.buttonText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Search / Add</Text>
        <TextInput
          style={styles.input}
          placeholder="Type name here..."
          placeholderTextColor="#8A96B2"
          value={q}
          onChangeText={setQ}
        />
        <View style={styles.inlineButtons}>
          <Pressable style={[styles.smallButton, { backgroundColor: "#1C63F2" }]} onPress={() => load()}>
            <Text style={styles.buttonText}>Search</Text>
          </Pressable>
          <Pressable style={[styles.smallButton, { backgroundColor: "#0C1A33" }]} onPress={add}>
            <Text style={styles.buttonText}>Add</Text>
          </Pressable>
          <Pressable style={[styles.smallButton, { backgroundColor: "#139A55" }]} onPress={bootstrap}>
            <Text style={styles.buttonText}>Add Defaults</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Items ({items.length})</Text>
        {items.map((it) => (
          <View key={it._id} style={styles.kpiRow}>
            <Text style={styles.kpiLeft}>{it.name}</Text>
            <Text style={styles.kpiRight}>•</Text>
          </View>
        ))}
        {items.length === 0 && <Text style={styles.emptyChartText}>No items</Text>}
      </View>
    </ScrollView>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("soletrack-theme").then((t) => setIsDark(t === "dark"));
    AsyncStorage.getItem("soletrack-token").then((t) => {
      setToken(t || "");
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("soletrack-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const logout = async () => {
    await AsyncStorage.removeItem("soletrack-token");
    setToken("");
  };

  if (!token) {
    return <LoginScreen onLogin={setToken} />;
  }

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#1C63F2",
            tabBarInactiveTintColor: "#7E8AA8",
            tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6, borderTopWidth: 0, elevation: 8 }
          }}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Production" component={ProductionScreen} />
          <Tab.Screen name="Sales" component={SalesScreen} />
          <Tab.Screen name="Expenses" component={MaterialScreen} />
          <Tab.Screen name="Master" component={MasterDataScreen} />
          <Tab.Screen name="Settings">
            {() => <SettingsScreen isDark={isDark} setIsDark={setIsDark} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: "#F4F7FF" },
  sectionTitle: { fontSize: 24, fontWeight: "800", marginBottom: 8, color: "#0E1C3F" },
  sectionSubtitle: { fontSize: 16, fontWeight: "700", marginTop: 6, color: "#0E1C3F" },
  heroCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#1C63F2",
    overflow: "hidden"
  },
  heroGlowOne: {
    position: "absolute",
    right: -20,
    top: -15,
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: "#3E7AFA"
  },
  heroGlowTwo: {
    position: "absolute",
    right: 50,
    bottom: -30,
    width: 90,
    height: 90,
    borderRadius: 50,
    backgroundColor: "#2D6BF6"
  },
  heroOverline: { color: "#CFE0FF", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  heroTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 4 },
  heroSubtitle: { color: "#E6EEFF", marginTop: 6, fontSize: 13 },
  cardGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  cardGridItem: { width: "50%", paddingHorizontal: 4, marginBottom: 8 },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAF8",
    shadowColor: "#1C63F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  cardBadgeText: { fontSize: 10, fontWeight: "800" },
  cardTitle: { fontSize: 12, color: "#6A7898", fontWeight: "600" },
  cardValue: { fontSize: 20, fontWeight: "800", marginTop: 8, color: "#0A1D4E" },
  panel: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E4EAF8" },
  label: { fontWeight: "700", marginBottom: 6, marginTop: 8, color: "#22345E" },
  input: {
    borderWidth: 1,
    borderColor: "#D8E1F2",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F8FAFF",
    color: "#0E1C3F"
  },
  button: { backgroundColor: "#1C63F2", padding: 13, borderRadius: 12, marginTop: 10 },
  smallButton: { backgroundColor: "#1C63F2", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, minWidth: 88 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "800" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  inlineButtons: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  reportBox: { backgroundColor: "#0C1A33", borderRadius: 12, padding: 12, marginTop: 6 },
  reportTitle: { color: "#C5D4FF", fontWeight: "700", marginBottom: 6 },
  helperText: { color: "#C5D4FF" },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4EAF8",
    marginTop: 2,
    shadowColor: "#1C63F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2
  },
  chartTitle: { fontSize: 15, fontWeight: "800", color: "#0E1C3F", marginBottom: 10 },
  chartBarsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8, minHeight: 170 },
  chartBarWrap: { alignItems: "center", flex: 1 },
  chartTrack: {
    width: "100%",
    maxWidth: 36,
    height: 110,
    borderRadius: 10,
    backgroundColor: "#EAF0FF",
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  chartBar: {
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#1C63F2"
  },
  chartLabel: { marginTop: 6, fontSize: 11, color: "#6A7898", fontWeight: "700" },
  chartValue: { marginBottom: 4, fontSize: 11, color: "#243A69", fontWeight: "700" },
  emptyChartText: { color: "#6A7898", fontSize: 13 },
  loginContainer: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: "#F4F7FF", gap: 12 },
  loginCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E4EAF8" },
  selectBox: {
    borderWidth: 1,
    borderColor: "#D8E1F2",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F8FAFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  selectValue: { color: "#0E1C3F", fontWeight: "700" },
  selectChevron: { color: "#6A7898", fontWeight: "900" },
  modalWrap: { flex: 1, padding: 16, backgroundColor: "#F4F7FF" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#0E1C3F", marginBottom: 10 },
  optionRow: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E4EAF8", marginBottom: 8 },
  optionText: { color: "#0E1C3F", fontWeight: "800" },
  modalActions: { flexDirection: "row", gap: 10, paddingTop: 10 },
  addNewBox: { paddingTop: 10 },
  kpiRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#EEF3FF" },
  kpiLeft: { color: "#22345E", fontWeight: "800" },
  kpiRight: { color: "#1C63F2", fontWeight: "900" },
  smallButtonActive: { backgroundColor: "#0C1A33" }
});
