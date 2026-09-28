import React, { useEffect } from 'react';
import type { InvestigationRecord, SeverityLevel, Zone, Finding } from '../types/api';
import {
  ArrowLeft,
  BookOpen,
  Gauge,
  LifeBuoy,
  ListChecks,
  Radio,
  Satellite,
  Scale,
  ShieldCheck,
  Waves,
} from 'lucide-react';

interface ExplainPageProps {
  investigation: InvestigationRecord;
  zone: Zone | null;
  onBack: () => void;
}

const severityStyles: Record<SeverityLevel, string> = {
  critical: 'bg-[#3a1b16] text-[#f0a98c] border-[#7a3e2c]',
  high: 'bg-[#3a2c14] text-[#e8c589] border-[#7a5c2c]',
  moderate: 'bg-[#33321a] text-[#dccf8f] border-[#6c6532]',
  normal: 'bg-[#123028] text-[#8fceb0] border-[#2c5f47]',
};

const severityMeaning: Record<SeverityLevel, string> = {
  normal:
    'Readings sit inside the range we would expect for this area. Nothing here needs action right now.',
  moderate:
    'Some readings have drifted from normal. It is worth keeping an eye on, but it is not an emergency.',
  high:
    'Readings are clearly outside the expected range. This deserves attention soon and, ideally, a second look.',
  critical:
    'Readings are far outside the expected range and point to a serious problem. This is the level that calls for prompt action.',
};

const GLOSSARY: { term: string; meaning: string }[] = [
  {
    term: 'Chlorophyll-a',
    meaning:
      'The green pigment in phytoplankton. A satellite can see it from space, so it is used as a stand-in for how much algae is in the water. A sudden jump can mean a bloom.',
  },
  {
    term: 'Dissolved oxygen (DO)',
    meaning:
      'How much oxygen is dissolved in the water, in milligrams per litre. Fish and other sea life need it. When it drops too low, the area becomes a dead zone.',
  },
  {
    term: 'Sea surface temperature (SST)',
    meaning:
      'The temperature of the top layer of the water. Sudden drops can point to cold deep water rising up, while warm spells can speed up algae growth.',
  },
  {
    term: 'Bloom',
    meaning:
      'A fast rise in algae. Some blooms are natural and harmless, but big ones can use up oxygen when they die and rot.',
  },
  {
    term: 'Arbitration',
    meaning:
      'What happens when two sensors tell different stories. Instead of just picking one, the system weighs both against what is known about ocean behaviour and writes down its reasoning.',
  },
  {
    term: 'Corroboration',
    meaning:
      'A second, independent source agreeing with a reading. A finding that needs corroboration is one the system does not want to trust on its own.',
  },
  {
    term: 'Confidence',
    meaning:
      'How sure the system is about its conclusion given the evidence it has. It is not the chance that the event will happen.',
  },
];

function describeAgent(name: string): { icon: React.ReactNode; text: string } {
  const n = name.toLowerCase();
  if (n.includes('satellite') || n.includes('optic') || n.includes('remote')) {
    return {
      icon: <Satellite className="w-4 h-4 text-[var(--current)]" />,
      text: 'Looks at the ocean from above. It covers a wide area and is good at spotting surface changes like algae, but it cannot see below the surface and clouds can get in the way.',
    };
  }
  if (n.includes('buoy') || n.includes('sensor') || n.includes('in-situ') || n.includes('insitu')) {
    return {
      icon: <Radio className="w-4 h-4 text-[var(--current)]" />,
      text: 'Measures the water directly at one spot, including oxygen and temperature. It is very accurate for that place, but it only covers the small area around the buoy.',
    };
  }
  return {
    icon: <Waves className="w-4 h-4 text-[var(--current)]" />,
    text: 'One of the analysis sources that looked at this zone.',
  };
}

function confidenceWord(score: number): string {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'moderate';
  return 'low';
}

function confidenceAdverb(score: number): string {
  if (score >= 0.8) return 'highly sure';
  if (score >= 0.5) return 'moderately sure';
  return 'only weakly sure';
}

function formatKey(key: string): string {
  const spaced = key.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-[var(--deep)]/70 backdrop-blur-sm border border-[#123a45] rounded-2xl p-5 ${className}`}>
    {children}
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; sub?: string }> = ({ icon, title, sub }) => (
  <div className="mb-4">
    <div className="flex items-center gap-2 text-[var(--current)]">
      {icon}
      <h2 className="font-display text-xl text-[var(--foam)]">{title}</h2>
    </div>
    {sub && <p className="text-[12px] text-[var(--text-secondary)] mt-1 ml-6">{sub}</p>}
  </div>
);

const FindingExplained: React.FC<{ finding: Finding }> = ({ finding }) => {
  const agent = describeAgent(finding.agent);
  const metricEntries = Object.entries(finding.metrics ?? {});
  return (
    <div className="p-4 bg-[#0a222b] border border-[#153e48] rounded-xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {agent.icon}
          <span className="font-semibold text-[var(--foam)] text-sm">{finding.agent}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${severityStyles[finding.severity] ?? severityStyles.normal}`}>
          {finding.severity}
        </span>
      </div>

      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{agent.text}</p>

      <div>
        <span className="block text-[11px] text-[var(--sea-mist)] font-medium mb-0.5">What it concluded</span>
        <p className="text-[13px] text-[var(--foam)]">{finding.headline}</p>
      </div>

      <div>
        <span className="block text-[11px] text-[var(--sea-mist)] font-medium mb-0.5">
          What that severity means
        </span>
        <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
          {severityMeaning[finding.severity] ?? severityMeaning.normal}
        </p>
      </div>

      <div>
        <span className="block text-[11px] text-[var(--sea-mist)] font-medium mb-1">
          Confidence: {Math.round(finding.confidence * 100)}% ({confidenceWord(finding.confidence)})
        </span>
        <div className="h-1.5 rounded-full bg-[var(--abyss)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--current)]"
            style={{ width: `${Math.min(100, Math.max(0, finding.confidence * 100))}%` }}
          />
        </div>
      </div>

      {finding.evidence.length > 0 && (
        <div>
          <span className="block text-[11px] text-[var(--sea-mist)] font-medium mb-1">Evidence it pointed to</span>
          <ul className="list-disc list-inside text-[12px] text-[var(--text-secondary)] space-y-0.5">
            {finding.evidence.map((ev, i) => (
              <li key={i}>{ev}</li>
            ))}
          </ul>
        </div>
      )}

      {metricEntries.length > 0 && (
        <div>
          <span className="block text-[11px] text-[var(--sea-mist)] font-medium mb-1">Raw numbers behind it</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {metricEntries.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-2 py-1 bg-[var(--abyss)] border border-[#123540] rounded-lg text-[11px]">
                <span className="text-[var(--text-secondary)]">{formatKey(k)}</span>
                <span className="font-mono text-[var(--foam)] ml-2 text-right break-all">{formatValue(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {finding.needs_corroboration && (
        <div className="p-2 bg-[#33321a]/50 border border-[#6c6532] rounded-lg text-[11px] text-[#dccf8f]">
          This finding is marked as needing corroboration, meaning the system does not want to rely on this source alone
          and looks for another sensor to back it up.
        </div>
      )}
    </div>
  );
};

export const ExplainPage: React.FC<ExplainPageProps> = ({ investigation, zone, onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const a = investigation.assessment;
  const agentBreakdown = a ? Object.entries(a.agent_breakdown ?? {}) : [];

  return (
    <div className="relative min-h-screen text-[var(--text-primary)]">
      <div className="ocean-backdrop" />

      <header className="sticky top-0 z-20 bg-[var(--deep)]/90 backdrop-blur-sm border-b border-[#123a45] px-5 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs text-[var(--sea-mist)] hover:text-[var(--foam)] px-3 py-1.5 rounded-full border border-[#1e5a68] hover:bg-[var(--mid-water)]/60 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </button>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <BookOpen className="w-3.5 h-3.5 text-[var(--current)]" />
          Results explained
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-5 py-10 space-y-6">
        {/* Intro */}
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-[var(--foam)] leading-tight">
            What these results actually mean
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
            This page walks through everything the investigation reported
            {zone ? <> for <span className="text-[var(--sea-mist)]">{zone.name}</span> ({zone.region})</> : null}, in plain
            language, and shows the numbers underneath it.
          </p>
          {investigation.question && (
            <p className="text-[12px] text-[var(--text-dim)] mt-3 italic font-display">
              Question asked: "{investigation.question}"
            </p>
          )}
        </div>

        {/* Overall */}
        {a && (
          <Card>
            <SectionTitle
              icon={<ShieldCheck className="w-4 h-4" />}
              title="The overall picture"
              sub="The final conclusion after combining every source."
            />
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className={`text-xs px-3 py-1 rounded-full border capitalize ${severityStyles[a.risk_level] ?? severityStyles.normal}`}>
                {a.risk_level} risk
              </span>
              <span className="font-mono text-xs text-[var(--text-secondary)]">
                {Math.round(a.confidence_score * 100)}% confidence ({confidenceWord(a.confidence_score)})
              </span>
            </div>
            <p className="text-[14px] text-[var(--foam)] leading-relaxed mb-3">{a.assessment_summary}</p>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-2">
              <span className="text-[var(--sea-mist)] font-medium">What "{a.risk_level}" means: </span>
              {severityMeaning[a.risk_level] ?? severityMeaning.normal}
            </p>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              <span className="text-[var(--sea-mist)] font-medium">What the confidence means: </span>
              The system is {confidenceAdverb(a.confidence_score)} of this conclusion, based on how much of the evidence
              lines up. It describes how well the evidence supports the answer, not how likely the event is.
            </p>

            {agentBreakdown.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#153e48]">
                <span className="block text-[11px] text-[var(--sea-mist)] font-medium mb-2">
                  Per-source scores used to build this conclusion
                </span>
                <div className="space-y-2">
                  {agentBreakdown.map(([name, val]) => {
                    const pct = val <= 1 ? val * 100 : val;
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between text-[11px] mb-0.5">
                          <span className="text-[var(--text-secondary)]">{name}</span>
                          <span className="font-mono text-[var(--foam)]">{formatValue(val)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--abyss)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--surface-water)]"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Findings */}
        <Card>
          <SectionTitle
            icon={<Gauge className="w-4 h-4" />}
            title="What each sensor saw"
            sub="Each source looks at the same zone from a different angle."
          />
          <div className="space-y-4">
            {investigation.findings.map((f, i) => (
              <FindingExplained key={i} finding={f} />
            ))}
          </div>
        </Card>

        {/* Conflicts */}
        <Card>
          <SectionTitle
            icon={<Scale className="w-4 h-4" />}
            title="Where the sensors disagreed"
            sub="Disagreement is normal. It is how the system decides who to trust that matters."
          />
          {investigation.conflicts.length === 0 ? (
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              No conflicts this time. The sources did not contradict each other, which usually makes the conclusion
              easier to trust.
            </p>
          ) : (
            <div className="space-y-4">
              {investigation.conflicts.map((c, i) => (
                <div key={i} className="p-4 bg-[#0a222b] border border-[#153e48] rounded-xl space-y-3 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--tide-yellow)] font-medium capitalize">The disagreement was about: {c.parameter}</span>
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">{c.resolution_status}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className="p-2 bg-[var(--abyss)] border border-[#123540] rounded-lg">
                      <span className="block text-[10px] text-[var(--text-dim)] mb-0.5">{c.agent_a} said</span>
                      <span className="text-[var(--foam)]">{c.agent_a_claim}</span>
                    </div>
                    <div className="p-2 bg-[var(--abyss)] border border-[#123540] rounded-lg">
                      <span className="block text-[10px] text-[var(--text-dim)] mb-0.5">{c.agent_b} said</span>
                      <span className="text-[var(--foam)]">{c.agent_b_claim}</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[11px] text-[var(--sea-mist)] font-medium mb-0.5">How it was settled</span>
                    <p className="text-[var(--text-secondary)] italic font-display leading-relaxed">"{c.arbitration_note}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Evidence for / against / limits */}
        {a && (a.supporting_evidence.length > 0 || a.contradicting_evidence.length > 0 || a.scientific_limitations.length > 0) && (
          <Card>
            <SectionTitle
              icon={<Scale className="w-4 h-4" />}
              title="The case for, the case against, and the fine print"
              sub="A fair conclusion shows both sides and admits what it cannot know."
            />
            <div className="grid md:grid-cols-3 gap-3 text-[12px]">
              {[
                { title: 'Points supporting it', items: a.supporting_evidence },
                { title: 'Points against it', items: a.contradicting_evidence },
                { title: 'Limits of the science', items: a.scientific_limitations },
              ].map((col) => (
                <div key={col.title} className="p-3 bg-[#0a222b] border border-[#153e48] rounded-xl">
                  <span className="block text-[11px] text-[var(--sea-mist)] font-medium mb-1.5">{col.title}</span>
                  {col.items.length === 0 ? (
                    <span className="text-[var(--text-dim)]">Nothing listed.</span>
                  ) : (
                    <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-1">
                      {col.items.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Human review */}
        {a && (
          <Card>
            <SectionTitle icon={<LifeBuoy className="w-4 h-4" />} title="Does a person need to check this?" />
            {a.human_review_required ? (
              <div className="p-3 bg-[#3a2c14]/60 border border-[#7a5c2c] rounded-xl text-[13px] text-[#e8c589] leading-relaxed">
                Yes. {a.escalation_reason || 'The system is asking for a human to double check this result.'}
                <p className="text-[12px] text-[var(--text-secondary)] mt-2">
                  The system flags a result for review when the situation is serious, the sensors disagree, or it is not
                  confident enough to act on its own.
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Not this time. The system is comfortable with its conclusion without a manual review, though a person can
                always look closer.
              </p>
            )}
          </Card>
        )}

        {/* Actions */}
        {a && a.recommended_actions.length > 0 && (
          <Card>
            <SectionTitle
              icon={<ListChecks className="w-4 h-4" />}
              title="What to do next"
              sub="The suggested steps, in order."
            />
            <ol className="space-y-2">
              {a.recommended_actions.map((act, i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-[#0a222b] border border-[#153e48] rounded-xl text-[13px] text-[var(--foam)]">
                  <span className="font-mono text-[var(--current)] text-xs mt-0.5">{i + 1}.</span>
                  <span>{act}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* Glossary */}
        <Card>
          <SectionTitle
            icon={<BookOpen className="w-4 h-4" />}
            title="Plain-language glossary"
            sub="The terms you will see above."
          />
          <dl className="grid md:grid-cols-2 gap-3">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="p-3 bg-[#0a222b] border border-[#153e48] rounded-xl">
                <dt className="text-[12px] text-[var(--sea-mist)] font-medium">{g.term}</dt>
                <dd className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="pt-2 pb-8 text-center">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs text-white bg-[var(--surface-water)] hover:bg-[var(--current)] px-4 py-2.5 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </button>
        </div>
      </main>
    </div>
  );
};

export default ExplainPage;
