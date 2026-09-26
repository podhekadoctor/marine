import { useEffect, useState } from 'react';
import { fetchZones, fetchScenarios, runInvestigation } from './services/api';
import type { Zone, ScenarioMeta, InvestigationRecord, SeverityLevel } from './types/api';
import { MarineMap } from './components/MarineMap';
import { AlertCircle, CheckCircle2, ShieldAlert, Activity, RefreshCw } from 'lucide-react';

export default function App() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('conflicting_evidence');
  const [investigation, setInvestigation] = useState<InvestigationRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [queryText, setQueryText] = useState<string>(
    'Synthesize cross-sensor discrepancy between surface optical bloom and benthic dissolved oxygen sensor.'
  );

  useEffect(() => {
    async function init() {
      try {
        const [zonesData, scenariosData] = await Promise.all([fetchZones(), fetchScenarios()]);
        setZones(zonesData);
        setScenarios(scenariosData);
        if (zonesData.length > 0) setSelectedZone(zonesData[0]);
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  const handleExecute = async () => {
    if (!selectedZone) return;
    setLoading(true);
    try {
      const res = await runInvestigation(selectedZone.id, selectedScenario, queryText);
      setInvestigation(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'high':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'moderate':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-800';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-200 text-xs antialiased overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-teal-400" />
          <span className="font-mono text-sm tracking-wider font-semibold text-slate-100 uppercase">
            Marine Ecosystem Intelligence <span className="text-teal-400 font-normal">| Mission Control</span>
          </span>
        </div>
        <div className="flex items-center gap-6 font-mono text-[11px] text-slate-400">
          <div>TELEMETRY: <span className="text-teal-400 font-medium">LIVE</span></div>
          <div>INFERENCE: <span className="text-slate-200">DETERMINISTIC / ARBITRATED</span></div>
          <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Control Panel */}
        <div className="col-span-3 border-r border-slate-800 flex flex-col bg-slate-900/30 overflow-y-auto p-3 space-y-4">
          <div>
            <label className="font-mono text-[11px] uppercase text-slate-400 block mb-1">Target Coastal Sector</label>
            <div className="space-y-1">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z)}
                  className={`w-full text-left p-2 border transition font-mono ${
                    selectedZone?.id === z.id
                      ? 'bg-teal-950/40 border-teal-500 text-teal-200'
                      : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-[11px]">{z.name}</div>
                  <div className="text-[10px] text-slate-400">{z.region} • {z.depth_meters}m depth</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase text-slate-400 block mb-1">Telemetry Dataset Scenario</label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-2 font-mono text-slate-200 focus:border-teal-500 outline-none"
            >
              {scenarios.map((s) => (
                <option key={s.scenario_id} value={s.scenario_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase text-slate-400 block mb-1">Mission Query Directive</label>
            <textarea
              rows={3}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-2 font-mono text-slate-200 focus:border-teal-500 outline-none resize-none"
            />
          </div>

          <button
            onClick={handleExecute}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 text-slate-950 font-mono font-semibold py-2 px-3 border border-teal-400 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'EXECUTE MISSION SYNTHESIS'}
          </button>

          {selectedZone && (
            <div className="border border-slate-800 p-2.5 bg-slate-950/60 font-mono space-y-1">
              <div className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold">Sector Baseline Thresholds</div>
              <div className="text-slate-300">Base Chlorophyll: {selectedZone.baseline_chl_a} mg/m³</div>
              <div className="text-slate-300">Base SST: {selectedZone.baseline_sst_celsius}°C</div>
              <div className="text-slate-300">Base Dissolved O₂: {selectedZone.baseline_do_mg_l} mg/L</div>
            </div>
          )}
        </div>

        {/* Center Leaflet Map */}
        <div className="col-span-5 h-full relative">
          <MarineMap
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={(z) => setSelectedZone(z)}
          />
        </div>

        {/* Right Assessment Output Panel */}
        <div className="col-span-4 border-l border-slate-800 flex flex-col bg-slate-900/20 overflow-y-auto p-4 space-y-4">
          <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 flex justify-between items-center">
            <span>Synthesis Assessment Log</span>
            {investigation && (
              <span className="text-[10px] text-teal-400 font-normal">ID: {investigation.id}</span>
            )}
          </div>

          {!investigation && !loading && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center font-mono">
              <ShieldAlert className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
              <p>NO ACTIVE SYNTHESIS</p>
              <p className="text-[10px] mt-1 text-slate-600">Select parameters and trigger an investigation.</p>
            </div>
          )}

          {investigation?.assessment && (
            <div className="space-y-4">
              <div className="border border-slate-800 bg-slate-900/50 p-3 space-y-2">
                <div className="flex justify-between items-center font-mono">
                  <span className={`px-2 py-0.5 border text-[10px] font-semibold uppercase ${getSeverityBadge(investigation.assessment.risk_level)}`}>
                    RISK LEVEL: {investigation.assessment.risk_level}
                  </span>
                  <span className="text-slate-400">
                    CONFIDENCE: <strong className="text-slate-100 font-mono">{(investigation.assessment.confidence_score * 100).toFixed(0)}%</strong>
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed font-sans">{investigation.assessment.assessment_summary}</p>
                {investigation.assessment.human_review_required && (
                  <div className="p-2 border border-rose-800 bg-rose-950/40 text-rose-300 font-mono text-[10px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>HUMAN ARBITRATION REQUIRED: {investigation.assessment.escalation_reason}</span>
                  </div>
                )}
              </div>

              {investigation.conflicts.length > 0 && (
                <div className="border border-amber-900/50 bg-amber-950/20 p-3 space-y-2">
                  <div className="font-mono text-[10px] text-amber-400 uppercase font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Cross-Agent Divergence Arbitrated</span>
                  </div>
                  {investigation.conflicts.map((c, i) => (
                    <div key={i} className="font-mono text-[11px] space-y-1">
                      <div className="text-slate-300 font-medium">{c.parameter} ({c.resolution_status.toUpperCase()})</div>
                      <div className="text-slate-400 pl-2 border-l border-amber-800/60">{c.arbitration_note}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Telemetry Stream Findings</div>
                {investigation.findings.map((f, i) => (
                  <div key={i} className="border border-slate-800 bg-slate-950/60 p-2.5 font-mono space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-teal-400 font-semibold">{f.agent}</span>
                      <span className={`px-1.5 py-0.2 border text-[9px] uppercase ${getSeverityBadge(f.severity)}`}>
                        {f.severity}
                      </span>
                    </div>
                    <div className="text-slate-200 font-medium">{f.headline}</div>
                    <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5 mt-1">
                      {f.evidence.map((ev, eIdx) => (
                        <li key={eIdx}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="border border-slate-800 bg-slate-900/30 p-3">
                <div className="font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Recommended Interventions</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 font-sans">
                  {investigation.assessment.recommended_actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}