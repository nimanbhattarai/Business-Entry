import React, { useEffect, useMemo, useState } from "react";
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
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://localhost:4000/api";
const Tab = createBottomTabNavigator();

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

function DashboardScreen() {
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadDashboard = async () => {
    const [dashboardRes, inventoryRes] = await Promise.all([
      fetch(`${API_URL}/dashboard`, { headers: authHeaders() }),
      fetch(`${API_URL}/inventory`, { headers: authHeaders() })
    ]);
    const dashboardJson = await dashboardRes.json();
    const inventoryJson = await inventoryRes.json();
    setData(dashboardJson);
    setInventory(inventoryJson);
  };

  const loadReport = async (period) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`${API_URL}/reports/${period}`, { headers: authHeaders() });
      const json = await res.json();
      setReport(json);
    } catch (_e) {
      Alert.alert("Error", "Could not load report");
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
        {inventory && (
          <View style={styles.cardGridItem}>
            <Card title="Low Stock Alert" value={inventory.lowStockWarning ? "Yes" : "No"} tone={inventory.lowStockWarning ? "red" : "green"} />
          </View>
        )}
      </View>
      <WeeklyProductionChart data={data.weeklyProduction} />

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
  return <EntryForm endpoint="production" fields={["date", "soleType", "quantity", "notes"]} title="Daily Production Entry" />;
}

function SalesScreen() {
  return (
    <EntryForm
      endpoint="sales"
      fields={["date", "customerName", "quantity", "pricePerSole", "paymentMethod"]}
      title="Sales Entry"
    />
  );
}

function MaterialScreen() {
  return (
    <EntryForm
      endpoint="materials"
      fields={["date", "rawMaterialName", "quantityPurchased", "cost", "supplierName"]}
      title="Material Cost Entry"
    />
  );
}

function SettingsScreen({ isDark, setIsDark }) {
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
    </ScrollView>
  );
}

function EntryForm({ endpoint, fields, title }) {
  const [form, setForm] = useState({});

  const totalSale = useMemo(() => {
    if (!form.quantity || !form.pricePerSole) return 0;
    return Number(form.quantity) * Number(form.pricePerSole);
  }, [form.quantity, form.pricePerSole]);

  const onSave = async () => {
    try {
      const payload = { ...form };
      if (!payload.date) payload.date = new Date().toISOString();
      const resp = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error("Save failed");
      Alert.alert("Saved", `${title} saved successfully`);
      setForm({});
    } catch (_e) {
      Alert.alert("Error", "Could not save entry");
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

function authHeaders() {
  return { Authorization: `Bearer ${globalThis.__SOLETRACK_TOKEN || ""}` };
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
      globalThis.__SOLETRACK_TOKEN = data.token;
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

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("soletrack-theme").then((t) => setIsDark(t === "dark"));
    AsyncStorage.getItem("soletrack-token").then((t) => {
      globalThis.__SOLETRACK_TOKEN = t || "";
      setToken(t || "");
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("soletrack-theme", isDark ? "dark" : "light");
  }, [isDark]);

  if (!token) {
    return <LoginScreen onLogin={setToken} />;
  }

  return (
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
        <Tab.Screen name="Materials" component={MaterialScreen} />
        <Tab.Screen name="Settings">
          {() => <SettingsScreen isDark={isDark} setIsDark={setIsDark} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
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
  loginCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E4EAF8" }
});
