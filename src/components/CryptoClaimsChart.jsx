import React from "react";
import { NEON, FONT, INK_60, LINE } from "../data/tokens.js";
import cryptoClaimsData from "../data/crypto-claims.json";

/**
 * CryptoClaimsChart — Two-chart visualization of crypto bankruptcy claims:
 * 1. Recovery Rates (column chart)
 * 2. Claims Status Overview (summary stats)
 */
export default function CryptoClaimsChart() {
  const claims = cryptoClaimsData.claims || [];

  // Calculate totals for the second chart
  const totalClaims = claims.reduce((sum, c) => sum + c.claimsTotal, 0);
  const totalResolved = claims.reduce((sum, c) => sum + c.claimsResolved, 0);
  const totalPending = totalClaims - totalResolved;
  const overallRecoveryRate = totalClaims > 0 ? Math.round((totalResolved / totalClaims) * 100) : 0;

  return (
    <div style={{
      background: "#000",
      color: "#fff",
      padding: "3rem clamp(1rem, 3vw, 3rem)",
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: "0 auto", marginBottom: "3rem" }}>
        <h2 style={{
          fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem",
          letterSpacing: "-0.02em",
        }}>
          {cryptoClaimsData.title}
        </h2>
        <p style={{
          fontSize: "1rem", color: INK_60, marginBottom: 0,
        }}>
          {cryptoClaimsData.subtitle}
        </p>
      </div>

      {/* Charts Grid */}
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem",
      }}>
        {/* Chart 1: Recovery Rates */}
        <RecoveryRatesChart claims={claims} />

        {/* Chart 2: Claims Status Overview */}
        <ClaimsStatusOverview
          totalClaims={totalClaims}
          totalResolved={totalResolved}
          totalPending={totalPending}
          overallRecoveryRate={overallRecoveryRate}
          claims={claims}
        />
      </div>
    </div>
  );
}

/**
 * RecoveryRatesChart — Column chart showing recovery rate for each bankruptcy
 */
function RecoveryRatesChart({ claims }) {
  const width = 100;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 60, left: 40 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Sort by recovery rate descending
  const sorted = [...claims].sort((a, b) => b.recoveryRate - a.recoveryRate);

  // Calculate scales
  const maxRate = Math.max(...sorted.map(c => c.recoveryRate), 100);
  const barWidth = chartWidth / sorted.length;
  const barGap = barWidth * 0.15;
  const actualBarWidth = barWidth - barGap;

  return (
    <div style={{
      background: "#0a0a0a", border: `1px solid ${LINE}`,
      borderRadius: "0.5rem", padding: "1.5rem",
    }}>
      <h3 style={{
        fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem",
        letterSpacing: "-0.01em",
      }}>
        Recovery Rates by Bankruptcy
      </h3>

      <svg
        width="100%" height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block" }}
      >
        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map(val => (
          <g key={`y-${val}`}>
            <line
              x1={margin.left}
              y1={margin.top + (chartHeight * (100 - val)) / 100}
              x2={margin.left + chartWidth}
              y2={margin.top + (chartHeight * (100 - val)) / 100}
              stroke={LINE}
              strokeWidth="0.5"
              opacity="0.3"
            />
            <text
              x={margin.left - 4}
              y={margin.top + (chartHeight * (100 - val)) / 100 + 2}
              fontSize="8"
              fill={INK_60}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {val}%
            </text>
          </g>
        ))}

        {/* Bars */}
        {sorted.map((claim, idx) => {
          const x = margin.left + idx * barWidth + (barWidth - actualBarWidth) / 2;
          const barHeight = (chartHeight * claim.recoveryRate) / maxRate;
          const y = margin.top + chartHeight - barHeight;

          return (
            <g key={claim.id}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={actualBarWidth}
                height={barHeight}
                fill={NEON}
                opacity="0.85"
                rx="2"
              />
              {/* Rate label on top of bar */}
              <text
                x={x + actualBarWidth / 2}
                y={y - 4}
                fontSize="9"
                fontWeight="700"
                fill={NEON}
                textAnchor="middle"
                dominantBaseline="text-after-edge"
              >
                {claim.recoveryRate}%
              </text>
              {/* X-axis label */}
              <text
                x={x + actualBarWidth / 2}
                y={margin.top + chartHeight + 12}
                fontSize="8"
                fill={INK_60}
                textAnchor="middle"
                dominantBaseline="hanging"
              >
                {claim.name}
              </text>
            </g>
          );
        })}
      </svg>

      <p style={{
        fontSize: "0.75rem", color: INK_60, marginTop: "1rem", marginBottom: 0,
      }}>
        Estimated recovery rates as % of total claims value
      </p>
    </div>
  );
}

/**
 * ClaimsStatusOverview — Summary stats and pie chart of resolved vs pending
 */
function ClaimsStatusOverview({ totalClaims, totalResolved, totalPending, overallRecoveryRate, claims }) {
  const width = 100;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 35;

  const resolvedPercent = totalClaims > 0 ? (totalResolved / totalClaims) * 100 : 0;
  const pendingPercent = 100 - resolvedPercent;

  // Calculate pie slices
  const resolvedAngle = (resolvedPercent / 100) * 360;
  const _pendingStartAngle = resolvedAngle;

  const _pie = {
    resolved: { percent: resolvedPercent, angle: resolvedAngle, color: NEON, label: "Resolved" },
    pending: { percent: pendingPercent, angle: 360 - resolvedAngle, color: "#444", label: "Pending" },
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "1.5rem",
    }}>
      {/* Status cards grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem",
      }}>
        <StatCard
          label="Overall Recovery"
          value={`${overallRecoveryRate}%`}
          color={NEON}
        />
        <StatCard
          label="Active Bankruptcies"
          value={claims.filter(c => c.status === "Active").length}
          color={NEON}
        />
        <StatCard
          label="Total Claims Value"
          value={formatBillion(totalClaims)}
          color="#999"
        />
        <StatCard
          label="Resolved Value"
          value={formatBillion(totalResolved)}
          color="#999"
        />
      </div>

      {/* Pie chart */}
      <div style={{
        background: "#0a0a0a", border: `1px solid ${LINE}`,
        borderRadius: "0.5rem", padding: "1.5rem",
      }}>
        <h3 style={{
          fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem",
          letterSpacing: "-0.01em",
        }}>
          Claims Resolution Status
        </h3>

        <div style={{
          display: "flex", alignItems: "center", gap: "2rem",
        }}>
          {/* Pie chart SVG */}
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ flex: "0 0 auto" }}
          >
            {/* Resolved slice */}
            <PieSlice
              cx={centerX}
              cy={centerY}
              r={radius}
              startAngle={0}
              endAngle={resolvedAngle}
              color={NEON}
            />
            {/* Pending slice */}
            <PieSlice
              cx={centerX}
              cy={centerY}
              r={radius}
              startAngle={resolvedAngle}
              endAngle={360}
              color="#444"
            />
            {/* Center circle for donut effect */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.6}
              fill="#000"
            />
            {/* Center text */}
            <text
              x={centerX}
              y={centerY - 4}
              fontSize="18"
              fontWeight="700"
              fill={NEON}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {Math.round(resolvedPercent)}%
            </text>
            <text
              x={centerX}
              y={centerY + 8}
              fontSize="8"
              fill={INK_60}
              textAnchor="middle"
              dominantBaseline="hanging"
            >
              resolved
            </text>
          </svg>

          {/* Legend */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem",
          }}>
            <LegendItem
              label="Resolved"
              value={formatBillion(totalResolved)}
              color={NEON}
              percent={Math.round(resolvedPercent)}
            />
            <LegendItem
              label="Pending"
              value={formatBillion(totalPending)}
              color="#444"
              percent={Math.round(pendingPercent)}
            />
          </div>
        </div>

        <p style={{
          fontSize: "0.75rem", color: INK_60, marginTop: "1rem", marginBottom: 0,
        }}>
          Aggregate claims resolution across all tracked bankruptcies
        </p>
      </div>
    </div>
  );
}

/**
 * StatCard — Individual metric display
 */
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: "#0a0a0a", border: `1px solid ${LINE}`,
      borderRadius: "0.5rem", padding: "1rem",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: "0.75rem", color: INK_60, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: "0.5rem",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "1.4rem", fontWeight: 800, color,
        letterSpacing: "-0.01em",
      }}>
        {value}
      </div>
    </div>
  );
}

/**
 * LegendItem — Legend entry with color and percentage
 */
function LegendItem({ label, value, color, percent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: "2px",
        background: color, flexShrink: 0,
      }} />
      <div style={{ flex: 1, fontSize: "0.9rem" }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: "0.8rem", color: INK_60 }}>{value}</div>
      </div>
      <div style={{
        fontSize: "0.9rem", fontWeight: 700, color,
        textAlign: "right",
      }}>
        {percent}%
      </div>
    </div>
  );
}

/**
 * PieSlice — SVG path for pie chart slice
 */
function PieSlice({ cx, cy, r, startAngle, endAngle, color }) {
  const start = degreesToRadians(startAngle);
  const end = degreesToRadians(endAngle);

  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  const pathData = [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    `Z`,
  ].join(" ");

  return (
    <path d={pathData} fill={color} stroke="none" />
  );
}

/**
 * Utility functions
 */
function degreesToRadians(degrees) {
  return ((degrees - 90) * Math.PI) / 180;
}

function formatBillion(value) {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(0)}M`;
  }
  return `$${value}`;
}
