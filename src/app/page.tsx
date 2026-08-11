import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  Search,
  ShieldAlert,
  Sparkles,
  TimerReset,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function Home() {
  const kpis = [
    {
      label: "Total Employees",
      value: "2,846",
      delta: "+4.8%",
      icon: Users,
      tone: "blue",
      sparkline: "M2 26 C10 18 15 22 22 14 S36 10 44 5",
    },
    {
      label: "Active Employees",
      value: "2,731",
      delta: "96.0%",
      icon: Sparkles,
      tone: "green",
      sparkline: "M2 24 C10 23 15 16 22 17 S35 8 44 10",
    },
    {
      label: "Pending Services",
      value: "128",
      delta: "24 today",
      icon: Clock3,
      tone: "amber",
      sparkline: "M2 18 C9 8 16 13 23 11 S34 21 44 14",
    },
    {
      label: "Open Attention",
      value: "17",
      delta: "Needs review",
      icon: AlertCircle,
      tone: "red",
      sparkline: "M2 10 C10 19 17 12 24 18 S36 22 44 12",
    },
  ];

  const bars = [52, 72, 46, 84, 64, 92, 74, 58, 88, 68, 96, 78];
  const pendingItems = [
    {
      title: "Employee document verification",
      subtitle: "Waiting for HR Services validation",
      count: "8",
      tone: "orange",
      icon: FileWarning,
    },
    {
      title: "BPKB custody confirmation",
      subtitle: "Inventory handover requires review",
      count: "5",
      tone: "purple",
      icon: ShieldAlert,
    },
    {
      title: "SLIK / KYE review queue",
      subtitle: "Risk check needs supervisor action",
      count: "4",
      tone: "red",
      icon: AlertCircle,
    },
  ];
  const activities = [
    {
      time: "09:42",
      title: "Employee record updated",
      description: "Finance Operations profile was refreshed",
      status: "Synced",
      icon: CheckCircle2,
    },
    {
      time: "08:58",
      title: "Service request approved",
      description: "People Services approved one request",
      status: "Done",
      icon: Sparkles,
    },
    {
      time: "16:20",
      title: "Report package generated",
      description: "Monthly service summary is ready",
      status: "Ready",
      icon: TimerReset,
    },
  ];

  return (
    <AppShell>
      <section className="esm-hero">
        <div className="esm-orbit three" />
        <div className="esm-orbit one" />
        <div className="esm-orbit two" />
        <span className="esm-hero-planet" />
        <span className="esm-hero-sparkles" />
        <div>
          <p className="esm-eyebrow">
            <Sparkles size={16} />
            Enterprise HR Command Center
          </p>
          <h2>Good Morning</h2>
          <p>Welcome back to Employee Services Management</p>
        </div>
        <button className="esm-primary-button" type="button">
          View Daily Summary
          <ArrowUpRight size={17} />
        </button>
      </section>

      <section className="esm-kpi-grid" aria-label="Dashboard summary">
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <article className={`esm-card esm-kpi-card tone-${item.tone}`} key={item.label}>
              <div className="esm-kpi-icon">
                <Icon size={21} />
              </div>
              <div className="esm-kpi-copy">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
                <span>{item.delta}</span>
              </div>
              <svg className="esm-kpi-sparkline" viewBox="0 0 46 30" aria-hidden="true">
                <path d={item.sparkline} />
              </svg>
            </article>
          );
        })}
      </section>

      <section className="esm-dashboard-grid">
        <article className="esm-card esm-chart-card">
          <div className="esm-card-header">
            <div>
              <p>Service Flow</p>
              <h3>Monthly employee service activity</h3>
            </div>
            <span>2026</span>
          </div>
          <div className="esm-chart-placeholder" aria-label="Monthly service activity chart">
            {bars.map((height, index) => (
              <div className="esm-chart-bar" key={index}>
                <span style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
          <div className="esm-chart-legend" aria-hidden="true">
            <span>Jan</span>
            <span>Mar</span>
            <span>May</span>
            <span>Jul</span>
            <span>Sep</span>
            <span>Nov</span>
          </div>
        </article>

        <article className="esm-card esm-search-card">
          <div className="esm-card-header">
            <div>
              <p>Quick Lookup</p>
              <h3>Employee Search</h3>
            </div>
          </div>
          <label className="esm-employee-search" aria-label="Quick employee search">
            <Search size={18} />
            <input placeholder="Search by name, NIK, division..." />
          </label>
          <div className="esm-search-results">
            <div>
              <strong>Raka Pratama</strong>
              <span>Finance Operations</span>
            </div>
            <div>
              <strong>Dian Anggraini</strong>
              <span>People Services</span>
            </div>
          </div>
        </article>

        <article className="esm-card esm-attention-card">
          <div className="esm-card-header">
            <div>
              <p>Need Attention</p>
              <h3>Service queues requiring action</h3>
            </div>
            <span>17 open</span>
          </div>
          <div className="esm-attention-list">
            {pendingItems.map((item) => {
              const Icon = item.icon;

              return (
                <div className={`esm-attention-row tone-${item.tone}`} key={item.title}>
                  <div className="esm-attention-icon">
                    <Icon size={17} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                  <span className="esm-count-badge">{item.count}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="esm-card esm-activity-card">
          <div className="esm-card-header">
            <div>
              <p>Timeline</p>
              <h3>Recent Activity</h3>
            </div>
          </div>
          <div className="esm-timeline">
            {activities.map((item) => {
              const Icon = item.icon;

              return (
                <div className="esm-timeline-row" key={`${item.time}-${item.title}`}>
                  <time>{item.time}</time>
                  <span className="esm-timeline-icon">
                    <Icon size={15} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                  <span className="esm-status-badge">{item.status}</span>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
