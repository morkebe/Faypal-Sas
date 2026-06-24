import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const riskTrendData = [
  { month: "Jan", risk: 28, cases: 38 },
  { month: "Feb", risk: 24, cases: 31 },
  { month: "Mar", risk: 31, cases: 42 },
  { month: "Apr", risk: 45, cases: 68 },
  { month: "May", risk: 62, cases: 95 },
  { month: "Jun", risk: 71, cases: 124 },
  { month: "Jul", risk: 78, cases: 148 },
  { month: "Aug", risk: 82, cases: 162 },
  { month: "Sep", risk: 74, cases: 138 },
  { month: "Oct", risk: 58, cases: 104 },
  { month: "Nov", risk: 41, cases: 72 },
  { month: "Dec", risk: 33, cases: 55 },
];

const mosquitoActivityData = [
  { week: "W1", anopheles: 42, culex: 18, aedes: 8 },
  { week: "W2", anopheles: 55, culex: 22, aedes: 10 },
  { week: "W3", anopheles: 68, culex: 28, aedes: 13 },
  { week: "W4", anopheles: 79, culex: 31, aedes: 15 },
  { week: "W5", anopheles: 88, culex: 35, aedes: 18 },
  { week: "W6", anopheles: 95, culex: 38, aedes: 21 },
  { week: "W7", anopheles: 105, culex: 42, aedes: 24 },
  { week: "W8", anopheles: 134, culex: 48, aedes: 28 },
];

const climateRiskData = [
  { month: "Jan", rainfall: 2, temperature: 24, humidity: 42, risk: 28 },
  { month: "Feb", rainfall: 3, temperature: 26, humidity: 40, risk: 24 },
  { month: "Mar", rainfall: 8, temperature: 29, humidity: 45, risk: 31 },
  { month: "Apr", rainfall: 18, temperature: 32, humidity: 52, risk: 45 },
  { month: "May", rainfall: 48, temperature: 34, humidity: 62, risk: 62 },
  { month: "Jun", rainfall: 95, temperature: 33, humidity: 74, risk: 71 },
  { month: "Jul", rainfall: 185, temperature: 31, humidity: 82, risk: 78 },
  { month: "Aug", rainfall: 220, temperature: 30, humidity: 86, risk: 82 },
  { month: "Sep", rainfall: 140, temperature: 31, humidity: 80, risk: 74 },
  { month: "Oct", rainfall: 48, temperature: 32, humidity: 65, risk: 58 },
  { month: "Nov", rainfall: 8, temperature: 29, humidity: 50, risk: 41 },
  { month: "Dec", rainfall: 2, temperature: 26, humidity: 44, risk: 33 },
];

const tooltipStyle = {
  backgroundColor: "#0F172A",
  border: "none",
  borderRadius: "8px",
  padding: "10px 14px",
  color: "#F8FAFC",
  fontSize: "12px",
  fontFamily: "var(--font-family-mono)",
};

export function RiskTrendChart() {
  return (
    <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-border h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
        <div>
          <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "var(--foreground)", fontSize: "clamp(12px, 3vw, 14px)" }}>
            Tendance du risque paludisme
          </h3>
          <p style={{ fontSize: "clamp(11px, 2vw, 12px)", color: "var(--muted-foreground)", marginTop: "2px" }}>Indice 12 mois</p>
        </div>
        <span className="px-2 py-0.5 sm:py-1 rounded-md text-xs flex-shrink-0" style={{ backgroundColor: "#EFF6FF", color: "#1A56DB", fontFamily: "var(--font-family-mono)", fontWeight: 600 }}>
          2024–2025
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={riskTrendData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A56DB" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#1A56DB" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis dataKey="month" tick={{ fontSize: "clamp(8px, 1.5vw, 10px)", fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: "clamp(8px, 1.5vw, 10px)", fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="risk" stroke="#1A56DB" strokeWidth={2} fill="url(#riskGrad)" name="Indice risque" />
          <Area type="monotone" dataKey="cases" stroke="#0D9488" strokeWidth={2} fill="url(#caseGrad)" name="Cas" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MosquitoActivityChart() {
  return (
    <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-border h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
        <div>
          <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "var(--foreground)", fontSize: "clamp(12px, 3vw, 14px)" }}>
            Activité moustiques — Hebdomadaire
          </h3>
          <p style={{ fontSize: "clamp(11px, 2vw, 12px)", color: "var(--muted-foreground)", marginTop: "2px" }}>Répartition par espèce</p>
        </div>
        <span className="px-2 py-0.5 sm:py-1 rounded-md text-xs flex-shrink-0" style={{ backgroundColor: "#F0FDF4", color: "#15803D", fontFamily: "var(--font-family-mono)", fontWeight: 600 }}>
          LIVE
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={mosquitoActivityData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis dataKey="week" tick={{ fontSize: "clamp(8px, 1.5vw, 10px)", fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: "clamp(8px, 1.5vw, 10px)", fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: "clamp(10px, 2vw, 11px)", fontFamily: "var(--font-family-mono)" }} />
          <Bar dataKey="anopheles" name="Anopheles" fill="#EF4444" radius={[3, 3, 0, 0]} />
          <Bar dataKey="culex" name="Culex" fill="#F97316" radius={[3, 3, 0, 0]} />
          <Bar dataKey="aedes" name="Aedes" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClimateRiskChart() {
  return (
    <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-border h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
        <div>
          <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "var(--foreground)", fontSize: "clamp(12px, 3vw, 14px)" }}>
            Climat × Risque
          </h3>
          <p style={{ fontSize: "clamp(11px, 2vw, 12px)", color: "var(--muted-foreground)", marginTop: "2px" }}>Impact pluies et humidité</p>
        </div>
        <span className="px-2 py-0.5 sm:py-1 rounded-md text-xs flex-shrink-0" style={{ backgroundColor: "#FFF7ED", color: "#B45309", fontFamily: "var(--font-family-mono)", fontWeight: 600 }}>
          AI MODEL
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={climateRiskData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis dataKey="month" tick={{ fontSize: "clamp(8px, 1.5vw, 10px)", fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: "clamp(8px, 1.5vw, 10px)", fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: "clamp(10px, 2vw, 11px)", fontFamily: "var(--font-family-mono)" }} />
          <Line type="monotone" dataKey="rainfall" name="Pluies" stroke="#1A56DB" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="humidity" name="Humidité" stroke="#0D9488" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="risk" name="Risque" stroke="#EF4444" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
