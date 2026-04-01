import { useMemo, useState } from "react";

type Status =
  | "Intake"
  | "Under Review"
  | "Scored"
  | "Approved"
  | "In Progress"
  | "Blocked"
  | "Done";

type Team = "Portfolio" | "Marketing" | "Strategic Partnerships";

type RequestType =
  | "Domestic Growth"
  | "Venue Optimisation"
  | "Product Expansion"
  | "New Destination"
  | "Campaign Support";

type Objective =
  | "Strategic Priority"
  | "Revenue"
  | "Partner Commitment"
  | "Conversion";

type Impact = "High" | "Medium" | "Low";
type Urgency = "Critical" | "Soon" | "Normal";
type ActiveView = "dashboard" | "submit" | "triage" | "board" | "backlog";

type RequestItem = {
  id: string;
  title: string;
  requester: string;
  team: Team;
  type: RequestType;
  destination: string;
  objective: Objective;
  impact: Impact;
  deadline: string;
  urgency: Urgency;
  strategicPriority: boolean;
  domesticGrowth: boolean;
  ownOffer: boolean;
  conversionIssue: boolean;
  partnerCommitment: boolean;
  aligned: boolean;
  alreadyInPipeline: boolean;
  contentRequired: boolean;
  supplyRequired: boolean;
  notes: string;
  status: Status;
  score: number;
  createdAt: string;
};

const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: "REQ-1001",
    title: "Add Mallorca coastal venues for domestic growth",
    requester: "Rob Peace",
    team: "Portfolio",
    type: "Domestic Growth",
    destination: "Mallorca",
    objective: "Strategic Priority",
    impact: "High",
    deadline: "2026-04-12",
    urgency: "Soon",
    strategicPriority: true,
    domesticGrowth: true,
    ownOffer: true,
    conversionIssue: false,
    partnerCommitment: false,
    aligned: true,
    alreadyInPipeline: false,
    contentRequired: true,
    supplyRequired: true,
    notes: "Needs supply and content alignment so curation is not delayed.",
    status: "Approved",
    score: 25,
    createdAt: "2026-04-01",
  },
  {
    id: "REQ-1002",
    title: "Optimise Colosseum venue page for spring campaign",
    requester: "Campaign Manager",
    team: "Marketing",
    type: "Venue Optimisation",
    destination: "Rome",
    objective: "Conversion",
    impact: "High",
    deadline: "2026-04-05",
    urgency: "Critical",
    strategicPriority: false,
    domesticGrowth: false,
    ownOffer: false,
    conversionIssue: true,
    partnerCommitment: false,
    aligned: true,
    alreadyInPipeline: false,
    contentRequired: true,
    supplyRequired: false,
    notes: "Time-sensitive campaign support request.",
    status: "In Progress",
    score: 13,
    createdAt: "2026-04-01",
  },
  {
    id: "REQ-1003",
    title: "Partner request for Porto day trips",
    requester: "Partnerships Team",
    team: "Strategic Partnerships",
    type: "New Destination",
    destination: "Porto",
    objective: "Partner Commitment",
    impact: "Medium",
    deadline: "2026-04-20",
    urgency: "Normal",
    strategicPriority: false,
    domesticGrowth: false,
    ownOffer: false,
    conversionIssue: false,
    partnerCommitment: true,
    aligned: true,
    alreadyInPipeline: false,
    contentRequired: true,
    supplyRequired: true,
    notes: "Requested by partner for launch readiness.",
    status: "Under Review",
    score: 8,
    createdAt: "2026-04-01",
  },
  {
    id: "REQ-1004",
    title: "Expand family attractions in Krakow",
    requester: "Portfolio Team",
    team: "Portfolio",
    type: "Product Expansion",
    destination: "Krakow",
    objective: "Revenue",
    impact: "Medium",
    deadline: "2026-04-18",
    urgency: "Soon",
    strategicPriority: true,
    domesticGrowth: false,
    ownOffer: true,
    conversionIssue: false,
    partnerCommitment: false,
    aligned: true,
    alreadyInPipeline: false,
    contentRequired: false,
    supplyRequired: true,
    notes: "Fits family demand gap and own-offer expansion priorities.",
    status: "Scored",
    score: 17,
    createdAt: "2026-04-01",
  },
];

const STATUSES: Status[] = [
  "Intake",
  "Under Review",
  "Scored",
  "Approved",
  "In Progress",
  "Blocked",
  "Done",
];

type FormState = Omit<RequestItem, "id" | "status" | "score" | "createdAt">;

const EMPTY_FORM: FormState = {
  title: "",
  requester: "",
  team: "Portfolio",
  type: "Domestic Growth",
  destination: "",
  objective: "Strategic Priority",
  impact: "Medium",
  deadline: "",
  urgency: "Soon",
  strategicPriority: true,
  domesticGrowth: false,
  ownOffer: false,
  conversionIssue: false,
  partnerCommitment: false,
  aligned: true,
  alreadyInPipeline: false,
  contentRequired: true,
  supplyRequired: true,
  notes: "",
};

function computeScore(item: FormState): number {
  let score = 0;

  if (item.strategicPriority || item.objective === "Strategic Priority") score += 10;
  if (item.objective === "Revenue") score += 5;
  if (item.objective === "Partner Commitment" || item.partnerCommitment) score += 5;
  if (item.objective === "Conversion" || item.conversionIssue) score += 5;

  if (item.impact === "High") score += 5;
  if (item.impact === "Medium") score += 3;
  if (item.impact === "Low") score += 1;

  if (item.urgency === "Critical") score += 3;
  if (item.urgency === "Soon") score += 2;

  if (item.domesticGrowth) score += 2;
  if (item.ownOffer) score += 2;

  if (!item.aligned) score -= 5;
  if (item.alreadyInPipeline) score -= 5;

  return Math.max(score, 0);
}

function laneForType(type: RequestType): string {
  if (type === "Domestic Growth" || type === "Product Expansion") {
    return "Strategic Growth";
  }
  if (type === "Venue Optimisation") {
    return "Performance Optimisation";
  }
  return "Reactive / External";
}

function statusClass(status: Status): string {
  return "status-pill " + status.toLowerCase().replace(/ /g, "-");
}

export default function App() {
  const [requests, setRequests] = useState<RequestItem[]>(INITIAL_REQUESTS);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedId, setSelectedId] = useState<string>(INITIAL_REQUESTS[0]?.id ?? "");
  const [search, setSearch] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<"All" | Team>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const selected = requests.find((r) => r.id === selectedId) ?? requests[0] ?? null;

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const haystack = `${r.title} ${r.destination} ${r.team} ${r.type} ${r.objective}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesTeam = teamFilter === "All" || r.team === teamFilter;
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      return matchesSearch && matchesTeam && matchesStatus;
    });
  }, [requests, search, teamFilter, statusFilter]);

  const metrics = useMemo(() => {
    const total = requests.length;
    const approved = requests.filter((r) => r.status === "Approved").length;
    const inProgress = requests.filter((r) => r.status === "In Progress").length;
    const highPriority = requests.filter((r) => r.score >= 15).length;
    const blocked = requests.filter((r) => r.status === "Blocked").length;
    return { total, approved, inProgress, highPriority, blocked };
  }, [requests]);

  const laneMix = useMemo(() => {
    const strategic = requests.filter((r) => laneForType(r.type) === "Strategic Growth").length;
    const performance = requests.filter((r) => laneForType(r.type) === "Performance Optimisation").length;
    const reactive = requests.filter((r) => laneForType(r.type) === "Reactive / External").length;
    const total = strategic + performance + reactive || 1;

    return {
      strategic: Math.round((strategic / total) * 100),
      performance: Math.round((performance / total) * 100),
      reactive: Math.round((reactive / total) * 100),
    };
  }, [requests]);

  const activity = useMemo(() => {
    return [...requests]
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((r) => `${r.team} submitted or updated "${r.title}"`);
  }, [requests]);

  const submitRequest = (): void => {
    if (!form.title.trim() || !form.requester.trim() || !form.destination.trim()) {
      window.alert("Please complete title, requester, and destination.");
      return;
    }

    const nextNumber = 1000 + requests.length + 1;

    const newRequest: RequestItem = {
      ...form,
      id: `REQ-${nextNumber}`,
      status: "Intake",
      score: computeScore(form),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setRequests((prev) => [newRequest, ...prev]);
    setSelectedId(newRequest.id);
    setForm(EMPTY_FORM);
    setActiveView("triage");
  };

  const updateStatus = (id: string, nextStatus: Status): void => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
  };

  const moveToNextStatus = (request: RequestItem): void => {
    const idx = STATUSES.indexOf(request.status);
    if (idx < STATUSES.length - 1) {
      updateStatus(request.id, STATUSES[idx + 1]);
    }
  };

  const moveToPreviousStatus = (request: RequestItem): void => {
    const idx = STATUSES.indexOf(request.status);
    if (idx > 0) {
      updateStatus(request.id, STATUSES[idx - 1]);
    }
  };

  const approveRequest = (id: string): void => updateStatus(id, "Approved");
  const deferRequest = (id: string): void => updateStatus(id, "Scored");

  const rejectRequest = (id: string): void => {
    setRequests((prev) => {
      const next = prev.filter((r) => r.id !== id);
      setSelectedId(next[0]?.id ?? "");
      return next;
    });
  };

  const navItems: ReadonlyArray<{ key: ActiveView; label: string }> = [
    { key: "dashboard", label: "Dashboard" },
    { key: "submit", label: "Submit Request" },
    { key: "triage", label: "Triage Queue" },
    { key: "board", label: "Pipeline Board" },
    { key: "backlog", label: "Ranked Backlog" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">Supply Pipeline</div>
          <p className="sidebar-subtitle">One intake. One scoring model. One backlog.</p>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-button ${activeView === item.key ? "active" : ""}`}
              onClick={() => setActiveView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="governance-card">
          <strong>Governance rule</strong>
          <p>
            If a request is not logged and approved here, it should not drive supply or content prioritisation.
          </p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Supply Request Pipeline App</h1>
            <p>Internal prioritisation layer for Supply and Content teams.</p>
          </div>

          <div className="topbar-controls">
            <input
              className="search"
              placeholder="Search requests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value as "All" | Team)}>
              <option value="All">All teams</option>
              <option value="Portfolio">Portfolio</option>
              <option value="Marketing">Marketing</option>
              <option value="Strategic Partnerships">Strategic Partnerships</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | Status)}>
              <option value="All">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </header>

        {activeView === "dashboard" && (
          <section className="content">
            <div className="metric-grid">
              <MetricCard label="Total requests" value={metrics.total} />
              <MetricCard label="Approved" value={metrics.approved} />
              <MetricCard label="In progress" value={metrics.inProgress} />
              <MetricCard label="High priority" value={metrics.highPriority} />
              <MetricCard label="Blocked" value={metrics.blocked} />
            </div>

            <div className="two-column">
              <div className="panel">
                <h2>Capacity mix</h2>
                <ProgressRow label="Strategic growth" value={laneMix.strategic} />
                <ProgressRow label="Performance optimisation" value={laneMix.performance} />
                <ProgressRow label="Reactive / external" value={laneMix.reactive} />
              </div>

              <div className="panel">
                <h2>Recent activity</h2>
                <ul className="activity-list">
                  {activity.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="two-column">
              <div className="panel">
                <h2>Requests by team</h2>
                {(["Portfolio", "Marketing", "Strategic Partnerships"] as Team[]).map((team) => {
                  const count = requests.filter((r) => r.team === team).length;
                  const percent = Math.round((count / (requests.length || 1)) * 100);

                  return <ProgressRow key={team} label={team} value={percent} meta={`${count} requests`} />;
                })}
              </div>

              <div className="panel">
                <h2>Top priority items</h2>
                <div className="request-list">
                  {[...requests]
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map((request) => (
                      <button
                        key={request.id}
                        className="request-list-item"
                        onClick={() => {
                          setSelectedId(request.id);
                          setActiveView("backlog");
                        }}
                      >
                        <div>
                          <strong>{request.title}</strong>
                          <p>
                            {request.destination} · {request.team}
                          </p>
                        </div>
                        <span className="score-badge">{request.score}</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeView === "submit" && (
          <section className="content two-column submit-layout">
            <div className="panel form-panel">
              <h2>Submit new request</h2>

              <div className="form-grid">
                <label>
                  Title
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </label>

                <label>
                  Requester
                  <input value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} />
                </label>

                <label>
                  Team
                  <select value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value as Team })}>
                    <option value="Portfolio">Portfolio</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Strategic Partnerships">Strategic Partnerships</option>
                  </select>
                </label>

                <label>
                  Request type
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as RequestType })}
                  >
                    <option value="Domestic Growth">Domestic Growth</option>
                    <option value="Venue Optimisation">Venue Optimisation</option>
                    <option value="Product Expansion">Product Expansion</option>
                    <option value="New Destination">New Destination</option>
                    <option value="Campaign Support">Campaign Support</option>
                  </select>
                </label>

                <label>
                  Destination
                  <input
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  />
                </label>

                <label>
                  Objective
                  <select
                    value={form.objective}
                    onChange={(e) => setForm({ ...form, objective: e.target.value as Objective })}
                  >
                    <option value="Strategic Priority">Strategic Priority</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Partner Commitment">Partner Commitment</option>
                    <option value="Conversion">Conversion</option>
                  </select>
                </label>

                <label>
                  Impact
                  <select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value as Impact })}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>

                <label>
                  Deadline
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  />
                </label>

                <label>
                  Urgency
                  <select
                    value={form.urgency}
                    onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })}
                  >
                    <option value="Critical">Critical</option>
                    <option value="Soon">Soon</option>
                    <option value="Normal">Normal</option>
                  </select>
                </label>
              </div>

              <div className="checkbox-grid">
                <Checkbox
                  label="Strategic priority"
                  checked={form.strategicPriority}
                  onChange={(checked) => setForm({ ...form, strategicPriority: checked })}
                />
                <Checkbox
                  label="Domestic growth"
                  checked={form.domesticGrowth}
                  onChange={(checked) => setForm({ ...form, domesticGrowth: checked })}
                />
                <Checkbox
                  label="Own offer"
                  checked={form.ownOffer}
                  onChange={(checked) => setForm({ ...form, ownOffer: checked })}
                />
                <Checkbox
                  label="Conversion issue"
                  checked={form.conversionIssue}
                  onChange={(checked) => setForm({ ...form, conversionIssue: checked })}
                />
                <Checkbox
                  label="Partner commitment"
                  checked={form.partnerCommitment}
                  onChange={(checked) => setForm({ ...form, partnerCommitment: checked })}
                />
                <Checkbox
                  label="Aligned to model"
                  checked={form.aligned}
                  onChange={(checked) => setForm({ ...form, aligned: checked })}
                />
                <Checkbox
                  label="Already in pipeline"
                  checked={form.alreadyInPipeline}
                  onChange={(checked) => setForm({ ...form, alreadyInPipeline: checked })}
                />
                <Checkbox
                  label="Content required"
                  checked={form.contentRequired}
                  onChange={(checked) => setForm({ ...form, contentRequired: checked })}
                />
                <Checkbox
                  label="Supply required"
                  checked={form.supplyRequired}
                  onChange={(checked) => setForm({ ...form, supplyRequired: checked })}
                />
              </div>

              <label className="notes">
                Notes
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={5} />
              </label>

              <div className="button-row">
                <button className="secondary-button" onClick={() => setForm(EMPTY_FORM)}>
                  Clear
                </button>
                <button className="primary-button" onClick={submitRequest}>
                  Submit request
                </button>
              </div>
            </div>

            <div className="panel sticky-panel">
              <h2>Live scoring preview</h2>
              <div className="score-preview">
                <div className="big-score">{computeScore(form)}</div>
                <p>
                  {computeScore(form) >= 15
                    ? "High priority candidate"
                    : computeScore(form) >= 8
                    ? "Medium priority candidate"
                    : "Lower priority candidate"}
                </p>
              </div>

              <ul className="score-breakdown">
                <li>
                  Strategic priority: {form.strategicPriority || form.objective === "Strategic Priority" ? "+10" : "0"}
                </li>
                <li>
                  Revenue / partner / conversion:{" "}
                  {form.objective === "Revenue" ||
                  form.objective === "Partner Commitment" ||
                  form.objective === "Conversion"
                    ? "+5"
                    : "0"}
                </li>
                <li>
                  Impact: {form.impact === "High" ? "+5" : form.impact === "Medium" ? "+3" : "+1"}
                </li>
                <li>
                  Urgency: {form.urgency === "Critical" ? "+3" : form.urgency === "Soon" ? "+2" : "0"}
                </li>
                <li>Penalties apply if request is not aligned or already duplicated</li>
              </ul>
            </div>
          </section>
        )}

        {activeView === "triage" && (
          <section className="content triage-layout">
            <div className="panel triage-list">
              <h2>Triage queue</h2>
              <div className="request-list">
                {filteredRequests.map((request) => (
                  <button
                    key={request.id}
                    className={`request-list-item ${selectedId === request.id ? "selected" : ""}`}
                    onClick={() => setSelectedId(request.id)}
                  >
                    <div>
                      <strong>{request.title}</strong>
                      <p>
                        {request.destination} · {request.team}
                      </p>
                    </div>
                    <span className="score-badge">{request.score}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel detail-panel">
              {selected ? (
                <>
                  <div className="detail-header">
                    <div>
                      <small>{selected.id}</small>
                      <h2>{selected.title}</h2>
                      <p>
                        {selected.destination} · {selected.type} · {selected.team}
                      </p>
                    </div>
                    <span className={statusClass(selected.status)}>{selected.status}</span>
                  </div>

                  <div className="detail-grid">
                    <DetailField label="Requester" value={selected.requester} />
                    <DetailField label="Objective" value={selected.objective} />
                    <DetailField label="Impact" value={selected.impact} />
                    <DetailField label="Deadline" value={selected.deadline} />
                    <DetailField label="Lane" value={laneForType(selected.type)} />
                    <DetailField label="Score" value={String(selected.score)} />
                  </div>

                  <h3>Request details</h3>
                  <p className="detail-notes">{selected.notes || "No notes added."}</p>

                  <h3>Actions</h3>
                  <div className="button-row wrap">
                    <button className="primary-button" onClick={() => approveRequest(selected.id)}>
                      Approve
                    </button>
                    <button className="secondary-button" onClick={() => deferRequest(selected.id)}>
                      Defer
                    </button>
                    <button className="danger-button" onClick={() => rejectRequest(selected.id)}>
                      Reject
                    </button>
                    <button className="secondary-button" onClick={() => setActiveView("board")}>
                      Open on board
                    </button>
                  </div>
                </>
              ) : (
                <p>No request selected.</p>
              )}
            </div>
          </section>
        )}

        {activeView === "board" && (
          <section className="content">
            <div className="board">
              {STATUSES.map((status) => (
                <div key={status} className="board-column">
                  <div className="board-column-header">
                    <h3>{status}</h3>
                    <span>{filteredRequests.filter((r) => r.status === status).length}</span>
                  </div>

                  <div className="board-cards">
                    {filteredRequests
                      .filter((request) => request.status === status)
                      .map((request) => (
                        <div key={request.id} className="board-card">
                          <div className="board-card-top">
                            <small>{request.id}</small>
                            <span className="score-badge">{request.score}</span>
                          </div>
                          <strong>{request.title}</strong>
                          <p>{request.destination}</p>
                          <div className="tag-row">
                            <span className="tag">{request.team}</span>
                            <span className="tag">{request.type}</span>
                          </div>
                          <div className="button-row wrap compact">
                            <button
                              className="secondary-button"
                              onClick={() => moveToPreviousStatus(request)}
                              disabled={request.status === STATUSES[0]}
                            >
                              Back
                            </button>
                            <button
                              className="primary-button"
                              onClick={() => moveToNextStatus(request)}
                              disabled={request.status === STATUSES[STATUSES.length - 1]}
                            >
                              Next
                            </button>
                            <button
                              className="ghost-button"
                              onClick={() => {
                                setSelectedId(request.id);
                                setActiveView("triage");
                              }}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeView === "backlog" && (
          <section className="content two-column">
            <div className="panel">
              <h2>Ranked backlog</h2>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Request</th>
                      <th>Team</th>
                      <th>Destination</th>
                      <th>Status</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredRequests]
                      .sort((a, b) => b.score - a.score)
                      .map((request, index) => (
                        <tr key={request.id} onClick={() => setSelectedId(request.id)}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{request.title}</strong>
                            <div className="sub-row">{request.type}</div>
                          </td>
                          <td>{request.team}</td>
                          <td>{request.destination}</td>
                          <td>
                            <span className={statusClass(request.status)}>{request.status}</span>
                          </td>
                          <td>
                            <span className="score-badge">{request.score}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel sticky-panel">
              {selected ? (
                <>
                  <h2>Request detail</h2>
                  <div className="detail-header slim">
                    <div>
                      <small>{selected.id}</small>
                      <h3>{selected.title}</h3>
                    </div>
                    <span className="score-badge large">{selected.score}</span>
                  </div>

                  <div className="detail-grid">
                    <DetailField label="Team" value={selected.team} />
                    <DetailField label="Type" value={selected.type} />
                    <DetailField label="Destination" value={selected.destination} />
                    <DetailField label="Lane" value={laneForType(selected.type)} />
                    <DetailField label="Objective" value={selected.objective} />
                    <DetailField label="Status" value={selected.status} />
                  </div>

                  <p className="detail-notes">{selected.notes}</p>

                  <div className="button-row wrap">
                    <button className="primary-button" onClick={() => approveRequest(selected.id)}>
                      Approve
                    </button>
                    <button className="secondary-button" onClick={() => updateStatus(selected.id, "In Progress")}>
                      Start work
                    </button>
                    <button className="secondary-button" onClick={() => updateStatus(selected.id, "Done")}>
                      Mark done
                    </button>
                  </div>
                </>
              ) : (
                <p>Select a request to see detail.</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  meta,
}: {
  label: string;
  value: number;
  meta?: string;
}) {
  return (
    <div className="progress-row">
      <div className="progress-label-row">
        <span>{label}</span>
        <span>{meta ?? `${value}%`}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.max(4, value)}%` }} />
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="checkbox-item">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
