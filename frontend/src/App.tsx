import React, { useEffect, useRef, useState } from 'react';
import { MarineMap } from './components/MarineMap';
import { ExplainPage } from './components/ExplainPage';
import { fetchZones, fetchScenarios, runInvestigation } from './services/api';
import type { Zone, ScenarioMeta, InvestigationRecord, SeverityLevel } from './types/api';
import {
  Activity,
  AlertTriangle,
  Anchor,
  BookOpen,
  ChevronRight,
  Fish,
  Gauge,
  LifeBuoy,
  Lightbulb,
  ListChecks,
  Radio,
  Sparkles,
  TrendingUp,
  Waves,
} from 'lucide-react';

interface MarineFact {
  fact: string;
  whyItMatters: string;
  concept: string;
  relevance: string;
}

const SCIENTIFIC_FACTS: MarineFact[] = [
  {
    fact: "Phytoplankton generate roughly 50 percent of Earth's atmospheric oxygen via marine photosynthesis.",
    whyItMatters: "Rapid population spikes deplete water column oxygen when organic matter decays, generating benthic dead zones.",
    concept: "Oceanic Carbon & Oxygen Cycling",
    relevance: "Satellite optical reflectance detects chlorophyll signatures days before benthic sensor decline."
  },
  {
    fact: "A halocline forms when freshwater runoff layers over dense saline seawater, suppressing vertical mixing.",
    whyItMatters: "Stratification traps deoxygenated water near the seafloor, accelerating benthic marine suffocation.",
    concept: "Water Column Density Stratification",
    relevance: "In-situ buoys monitor salinity gradients to corroborate optical bloom risk."
  },
  {
    fact: "Upwelling currents carry deep, nutrient-dense cold waters into sunlit surface layers.",
    whyItMatters: "Upwelling triggers rapid diatom blooms that can be mistaken for chemical discharge or artificial runoff.",
    concept: "Coastal Hydrodynamics & Ekman Transport",
    relevance: "Deterministic arbitration compares SST drops against chlorophyll spikes to filter false alarms."
  },
  {
    fact: "A single teaspoon of healthy seawater can hold over a million phytoplankton cells.",
    whyItMatters: "That density is exactly why small nutrient shifts cascade into visible blooms within days.",
    concept: "Microscale Productivity",
    relevance: "Chlorophyll-a ratios in telemetry are a proxy for this invisible population boom."
  },
  {
    fact: "Sound travels almost five times faster underwater than through air.",
    whyItMatters: "Acoustic and optical sensors race each other to characterize the same event from different angles.",
    concept: "Acoustic Oceanography",
    relevance: "Cross-modal arbitration exists because every sensor tells a slightly different, equally true story."
  }
];

interface OceanStat {
  value: number;
  suffix: string;
  label: string;
}

const OCEAN_STATS: OceanStat[] = [
  { value: 50, suffix: '%', label: "of the oxygen we breathe comes from ocean phytoplankton" },
  { value: 71, suffix: '%', label: "of Earth's surface is covered by ocean" },
  { value: 1000000, suffix: '+', label: "phytoplankton cells live in a single teaspoon of healthy seawater" },
  { value: 5, suffix: '×', label: "faster sound travels underwater than through open air" },
];

/** Scroll-linked parallax: element lags behind normal scroll by (1 - speed). */
function useParallax<T extends HTMLElement>(speed: number) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    let ticking = false;
    const apply = () => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`;
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(apply);
        ticking = true;
      }
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [speed]);
  return ref;
}

/** Counts up from 0 to `value` once it scrolls into view, then holds. */
const StatCounter: React.FC<OceanStat> = ({ value, suffix, label }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const duration = 1300;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setDisplay(Math.round(value * eased));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="p-5 text-center">
      <div className="font-display text-4xl md:text-5xl text-[var(--foam)]">
        {display.toLocaleString()}{suffix}
      </div>
      <p className="text-[12px] text-[var(--text-secondary)] mt-2 leading-relaxed max-w-[220px] mx-auto">
        {label}
      </p>
    </div>
  );
};

const severityStyles: Record<SeverityLevel, string> = {
  critical: 'bg-[#3a1b16] text-[#f0a98c] border-[#7a3e2c]',
  high: 'bg-[#3a2c14] text-[#e8c589] border-[#7a5c2c]',
  moderate: 'bg-[#33321a] text-[#dccf8f] border-[#6c6532]',
  normal: 'bg-[#123028] text-[#8fceb0] border-[#2c5f47]',
};

export const App: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [customQuery, setCustomQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [investigation, setInvestigation] = useState<InvestigationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Marine Fact Explorer state
  const [factIndex, setFactIndex] = useState<number>(0);
  const [showFactDetails, setShowFactDetails] = useState<boolean>(false);

  // Parallax wave layers for the scrolling sections below the dashboard
  const waveLayerBack = useParallax<HTMLDivElement>(0.7);
  const waveLayerMid = useParallax<HTMLDivElement>(0.5);
  const waveLayerFront = useParallax<HTMLDivElement>(0.3);

  // Simple hash-based page routing: '#/explain' shows the explanation page
  const [showExplain, setShowExplain] = useState<boolean>(window.location.hash === '#/explain');
  useEffect(() => {
    const onHashChange = () => setShowExplain(window.location.hash === '#/explain');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const openExplain = () => {
    window.location.hash = '#/explain';
  };
  const closeExplain = () => {
    window.location.hash = '';
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [zonesData, scenariosData] = await Promise.all([
          fetchZones(),
          fetchScenarios()
        ]);
        setZones(zonesData);
        setScenarios(scenariosData);
        if (zonesData.length > 0) {
          setSelectedZone(zonesData[0]);
        }
        if (scenariosData.length > 0) {
          setSelectedScenarioId(scenariosData[0].scenario_id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize ocean telemetry network');
      }
    }
    loadInitialData();
  }, []);

  const handleExecuteSynthesis = async () => {
    if (!selectedZone) return;
    setLoading(true);
    setError(null);
    try {
      const result = await runInvestigation(
        selectedZone.id,
        selectedScenarioId || '',
        customQuery.trim() || ''
      );
      setInvestigation(result);
    } catch (err: any) {
      setError(err.message || 'Telemetry synthesis arbitration error');
    } finally {
      setLoading(false);
    }
  };

  const nextFact = () => {
    setShowFactDetails(false);
    setFactIndex((prev) => (prev + 1) % SCIENTIFIC_FACTS.length);
  };

  const getSeverityBadge = (level: SeverityLevel) => severityStyles[level] ?? severityStyles.normal;

  if (showExplain && investigation) {
    const investigatedZone = zones.find((z) => z.id === investigation.zone_id) ?? null;
    return <ExplainPage investigation={investigation} zone={investigatedZone} onBack={closeExplain} />;
  }

  return (
    <div className="relative text-[var(--text-primary)]">
      <div className="ocean-backdrop" />

      {/* Parallax wave layers, spanning the scrollable sections below the dashboard */}
      <div className="absolute inset-x-0 top-[88vh] h-[220vh] overflow-hidden pointer-events-none z-0">
        <div ref={waveLayerBack} className="absolute inset-x-0 top-0 opacity-40">
          <svg viewBox="0 0 1440 320" className="w-full" preserveAspectRatio="none">
            <path fill="#0f4552" d="M0,160 C240,220 480,100 720,140 C960,180 1200,80 1440,140 L1440,320 L0,320 Z" />
          </svg>
        </div>
        <div ref={waveLayerMid} className="absolute inset-x-0 top-[35vh] opacity-30">
          <svg viewBox="0 0 1440 320" className="w-full" preserveAspectRatio="none">
            <path fill="#15697a" d="M0,120 C320,60 640,200 960,140 C1200,100 1320,160 1440,120 L1440,320 L0,320 Z" />
          </svg>
        </div>
        <div ref={waveLayerFront} className="absolute inset-x-0 top-[75vh] opacity-25">
          <svg viewBox="0 0 1440 320" className="w-full" preserveAspectRatio="none">
            <path fill="#3f7d5c" d="M0,180 C300,120 600,240 900,160 C1140,100 1300,180 1440,150 L1440,320 L0,320 Z" />
          </svg>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[var(--deep)]/90 backdrop-blur-sm border-b border-[#123a45] px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--mid-water)] border border-[#1e5a68] flex items-center justify-center animate-bob">
            <Waves className="w-4.5 h-4.5 text-[var(--current)]" />
          </div>
          <div>
            <h1 className="font-display text-lg text-[var(--foam)] leading-tight">
              Marine Ecosystem Intelligence
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Reading the ocean's signals across satellite and buoy, side by side
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--mid-water)]/50 border border-[#1e5a68] text-[var(--sea-mist)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--kelp)]"></span>
            Telemetry online
          </span>
        </div>
      </header>

      {/* Wave divider */}
      <svg className="relative z-10 block w-full h-3 -mb-px" viewBox="0 0 1200 24" preserveAspectRatio="none">
        <path d="M0,12 C150,24 350,0 600,12 C850,24 1050,0 1200,12 L1200,24 L0,24 Z" fill="#0a2e3a" opacity="0.8" />
      </svg>

      {/* Main layout — the working dashboard, sized to roughly one screen */}
      <main className="relative z-10 min-h-[88vh] grid grid-cols-12 gap-3 p-3">
        {/* Left: sector & mission controls */}
        <section className="col-span-12 lg:col-span-3 bg-[var(--deep)]/70 backdrop-blur-sm border border-[#123a45] rounded-2xl p-4 flex flex-col overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-2 font-medium">
              <Anchor className="w-3.5 h-3.5 text-[var(--current)]" />
              Monitoring sector
            </div>
            <div className="space-y-1.5">
              {zones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(zone)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-[var(--mid-water)] border-[var(--current)] text-white shadow-[0_0_0_1px_rgba(31,143,163,0.35)]'
                        : 'bg-[#0a222b] border-[#153e48] text-[var(--sea-mist)] hover:bg-[#0d2a34] hover:border-[#1e5a68]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>{zone.name}</span>
                      <span className="font-mono text-[10px] text-[var(--text-dim)]">{zone.id}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                      {zone.region} · {zone.depth_meters}m depth
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected zone baseline indicators */}
          {selectedZone && (
            <div className="p-3 bg-[#0a222b] border border-[#153e48] rounded-xl text-xs space-y-2">
              <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
                <Gauge className="w-3 h-3 text-[var(--kelp)]" />
                Baseline conditions
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-1.5 bg-[var(--abyss)] border border-[#123540] rounded-lg">
                  <span className="text-[var(--text-dim)] block text-[10px]">Sea temp.</span>
                  <span className="font-mono text-[var(--foam)]">{selectedZone.baseline_sst_celsius}°C</span>
                </div>
                <div className="p-1.5 bg-[var(--abyss)] border border-[#123540] rounded-lg">
                  <span className="text-[var(--text-dim)] block text-[10px]">Oxygen</span>
                  <span className="font-mono text-[var(--foam)]">{selectedZone.baseline_do_mg_l} mg/L</span>
                </div>
                <div className="p-1.5 bg-[var(--abyss)] border border-[#123540] rounded-lg">
                  <span className="text-[var(--text-dim)] block text-[10px]">Chlorophyll-a</span>
                  <span className="font-mono text-[var(--foam)]">{selectedZone.baseline_chl_a} mg/m³</span>
                </div>
                <div className="p-1.5 bg-[var(--abyss)] border border-[#123540] rounded-lg">
                  <span className="text-[var(--text-dim)] block text-[10px]">Watching for</span>
                  <span className="font-mono text-[var(--sand)] capitalize text-[10px]">{selectedZone.primary_risk}</span>
                </div>
              </div>
            </div>
          )}

          {/* Scenario selector & custom query */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
                Telemetry scenario
              </label>
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="w-full bg-[#0a222b] border border-[#153e48] text-xs text-[var(--sea-mist)] rounded-lg p-2 focus:outline-none focus:border-[var(--current)]"
              >
                {scenarios.map((sc) => (
                  <option key={sc.scenario_id} value={sc.scenario_id}>
                    {sc.name} ({sc.scenario_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
                Ask something specific (optional)
              </label>
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="e.g., Investigate optical bloom signatures vs benthic dissolved oxygen lag..."
                rows={2}
                className="w-full bg-[#0a222b] border border-[#153e48] text-xs text-[var(--sea-mist)] rounded-lg p-2 focus:outline-none focus:border-[var(--current)] placeholder-[var(--text-dim)]"
              />
            </div>

            <button
              onClick={handleExecuteSynthesis}
              disabled={loading || !selectedZone}
              className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-water)] hover:bg-[var(--current)] disabled:bg-[#123540] disabled:text-[var(--text-dim)] text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors duration-200"
            >
              {loading ? (
                <>
                  <span className="relative w-3.5 h-3.5 flex items-center justify-center">
                    <span className="ripple-ring" />
                    <Waves className="w-3 h-3 relative" />
                  </span>
                  Reading the currents...
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  Run investigation
                </>
              )}
            </button>
          </div>

          {/* Fun facts card */}
          <div className="mt-auto pt-3 border-t border-[#123a45]">
            <div className="bg-gradient-to-br from-[#0d3540] to-[#0a222b] border border-[#1e5a68] p-3 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--current)] flex items-center gap-1.5 font-medium">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Did you know?
                </span>
                <button
                  onClick={nextFact}
                  className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--foam)] flex items-center gap-0.5 transition-colors"
                >
                  Next fact
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <p className="text-[12px] text-[var(--foam)] leading-relaxed font-display italic">
                {SCIENTIFIC_FACTS[factIndex].fact}
              </p>

              {showFactDetails ? (
                <div className="pt-2 border-t border-[#153e48] space-y-1.5 text-[10px] text-[var(--text-secondary)]">
                  <div>
                    <span className="text-[var(--sea-mist)] font-medium block">Why it matters</span>
                    <span>{SCIENTIFIC_FACTS[factIndex].whyItMatters}</span>
                  </div>
                  <div>
                    <span className="text-[var(--sea-mist)] font-medium block">How we use it here</span>
                    <span>{SCIENTIFIC_FACTS[factIndex].relevance}</span>
                  </div>
                  <button
                    onClick={() => setShowFactDetails(false)}
                    className="text-[10px] text-[var(--current)] hover:underline pt-0.5 block"
                  >
                    Hide details
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowFactDetails(true)}
                  className="text-[10px] text-[var(--current)] hover:underline flex items-center gap-1 pt-0.5"
                >
                  <Sparkles className="w-3 h-3" />
                  Tell me more
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Center: map */}
        <section className="col-span-12 lg:col-span-5 flex flex-col min-h-[460px]">
          <div className="flex-1 w-full h-full">
            <MarineMap
              zones={zones}
              selectedZone={selectedZone}
              onSelectZone={(zone) => setSelectedZone(zone)}
            />
          </div>
        </section>

        {/* Right: synthesis & arbitration results */}
        <section className="col-span-12 lg:col-span-4 bg-[var(--deep)]/70 backdrop-blur-sm border border-[#123a45] rounded-2xl p-4 flex flex-col overflow-y-auto space-y-4">
          <div className="flex items-center justify-between border-b border-[#123a45] pb-2">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
              <Activity className="w-3.5 h-3.5 text-[var(--kelp)]" />
              Investigation results
            </div>
            {investigation?.assessment && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${getSeverityBadge(investigation.assessment.risk_level)}`}>
                {investigation.assessment.risk_level} risk
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 bg-[#3a1b16]/60 border border-[#7a3e2c] rounded-xl text-xs text-[#f0a98c] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!investigation && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--text-secondary)] space-y-3">
              <Fish className="w-8 h-8 text-[#1e5a68] animate-bob" />
              <div className="text-xs font-medium text-[var(--sea-mist)]">Nothing surfaced yet</div>
              <p className="text-[11px] leading-relaxed max-w-[260px]">
                Pick a sector and a scenario on the left, then run an investigation to compare what the satellite and the buoy each saw.
              </p>
            </div>
          )}

          {investigation && (
            <div className="space-y-4 text-xs">
              {/* Synthesized assessment */}
              {investigation.assessment && (
                <div className="p-3 bg-[#0a222b] border border-[#153e48] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--current)] font-medium">
                      Overall assessment
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                      {Math.round(investigation.assessment.confidence_score * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--foam)] leading-relaxed">
                    {investigation.assessment.assessment_summary}
                  </p>

                  {investigation.assessment.human_review_required && (
                    <div className="mt-2 p-2 bg-[#3a2c14]/60 border border-[#7a5c2c] rounded-lg text-[11px] text-[#e8c589] flex items-center gap-1.5">
                      <LifeBuoy className="w-3.5 h-3.5 shrink-0" />
                      <span>{investigation.assessment.escalation_reason || 'A human reviewer should double check this one.'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Conflicts */}
              {investigation.conflicts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[var(--tide-yellow)] font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Where the sensors disagreed
                  </div>
                  {investigation.conflicts.map((conflict, idx) => (
                    <div key={idx} className="p-2.5 bg-[#1a1808] border border-[#3a3418] rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-[var(--tide-yellow)] capitalize">{conflict.parameter}</span>
                        <span className="text-[var(--text-secondary)]">{conflict.resolution_status}</span>
                      </div>
                      <div className="text-[var(--text-secondary)] space-y-0.5 text-[10px]">
                        <div><strong className="text-[var(--sea-mist)]">{conflict.agent_a}:</strong> {conflict.agent_a_claim}</div>
                        <div><strong className="text-[var(--sea-mist)]">{conflict.agent_b}:</strong> {conflict.agent_b_claim}</div>
                      </div>
                      <div className="pt-1.5 border-t border-[#2a2510] text-[var(--sea-mist)] text-[11px] italic font-display">
                        "{conflict.arbitration_note}"
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Findings by sensor */}
              <div className="space-y-2">
                <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                  What each sensor saw
                </div>
                {investigation.findings.map((finding, idx) => (
                  <div key={idx} className="p-2.5 bg-[#0a222b] border border-[#153e48] rounded-xl space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--foam)]">{finding.agent}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border capitalize ${getSeverityBadge(finding.severity)}`}>
                        {finding.severity}
                      </span>
                    </div>
                    <div className="text-[var(--sea-mist)] font-medium">{finding.headline}</div>
                    <ul className="list-disc list-inside text-[var(--text-secondary)] text-[10px] space-y-0.5">
                      {finding.evidence.map((ev, evIdx) => (
                        <li key={evIdx}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Recommended actions */}
              {investigation.assessment && investigation.assessment.recommended_actions.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#123a45]">
                  <div className="text-[11px] text-[var(--current)] font-medium flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    Suggested next steps
                  </div>
                  <ul className="space-y-1 text-[11px] text-[var(--foam)]">
                    {investigation.assessment.recommended_actions.map((act, actIdx) => (
                      <li key={actIdx} className="p-1.5 bg-[#0a222b] border border-[#153e48] rounded-lg flex items-start gap-1.5">
                        <span className="text-[var(--current)] font-mono text-[10px]">{actIdx + 1}.</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Explain button */}
              <button
                onClick={openExplain}
                className="w-full py-2.5 px-3 rounded-xl border border-[var(--current)] text-[var(--sea-mist)] hover:bg-[var(--mid-water)] hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors duration-200"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Explain these results
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Ocean by the numbers */}
      <section className="relative z-10 px-5 pt-24 pb-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--current)] font-medium mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Why the ocean matters
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-[var(--foam)]">
            The ocean by the numbers
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xl mx-auto">
            A few reasons every sensor reading in the dashboard above is worth getting right.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {OCEAN_STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--deep)]/70 backdrop-blur-sm border border-[#123a45] rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[var(--current)]"
            >
              <StatCounter {...stat} />
            </div>
          ))}
        </div>
      </section>

      {/* Fact gallery */}
      <section className="relative z-10 px-5 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--current)] font-medium mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            Field notebook
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-[var(--foam)]">
            Ocean science, one fact at a time
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xl mx-auto">
            Every fact below ties back to how the satellite and buoy readings get interpreted.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCIENTIFIC_FACTS.map((item, idx) => (
            <article
              key={idx}
              className="group bg-[var(--deep)]/70 backdrop-blur-sm border border-[#123a45] rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--current)] hover:bg-[var(--mid-water)]/60"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--current)] font-medium flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5" />
                  {item.concept}
                </span>
                <span className="font-mono text-[10px] text-[var(--text-dim)]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <p className="font-display italic text-[15px] text-[var(--foam)] leading-relaxed">
                {item.fact}
              </p>
              <div className="pt-3 border-t border-[#153e48] space-y-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                <div>
                  <span className="block text-[var(--sea-mist)] font-medium">Why it matters</span>
                  {item.whyItMatters}
                </div>
                <div>
                  <span className="block text-[var(--sea-mist)] font-medium">How we use it here</span>
                  {item.relevance}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-[var(--deep)]/90 backdrop-blur-sm border-t border-[#123a45] px-5 py-2 flex items-center justify-between text-[11px] text-[var(--text-secondary)] shrink-0">
        <div className="flex items-center gap-3">
          <Waves className="w-3 h-3 text-[var(--current)]" />
          <span>Coastal telemetry, arbitrated across satellite and buoy</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] text-[var(--text-dim)]">
          <span>Buoys calibrated</span>
          <span>Optics nominal</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
