import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

type Status = "Submitted" | "Approved" | "In Progress" | "Completed" | "Rejected";
type RequesterDept =
  | "Portfolio Management"
  | "Marketing"
  | "Strategic Partnerships"
  | "TUI Source Market";
type RequestType =
  | "Destination Expansion"
  | "Specific Product Expansion"
  | "City Page Optimisation"
  | "Venue Page Optimisation";
type ReasonForRequest =
  | "Strategic Partner Requirement"
  | "Google Analytics Trend"
  | "Unsuitable for Marketing Campaign in current state";
type PriorityTier = "High" | "Medium" | "Low";
type ActiveView = "submit" | "portfolio" | "supply";

type RequestItem = {
  id: string;
  requesterName: string;
  requesterDept: RequesterDept;
  country: string;
  destination: string;
  requestType: RequestType;
  reasonForRequest: ReasonForRequest;
  description: string;
  deadline: string;
  status: Status;
  priorityScore: number;
  priorityTier: PriorityTier;
  createdAt: string;
  updatedAt: string;
};

type RequestRow = {
  id: string;
  requester_name: string;
  requester_dept: string;
  country: string;
  destination: string;
  request_type: string;
  reason_for_request: string;
  description: string | null;
  deadline: string | null;
  status: string;
  priority_score: number;
  priority_tier: string;
  created_at: string | null;
  updated_at: string | null;
};

type CommentItem = {
  id: string;
  requestId: string;
  commentText: string;
  commentAuthor: string;
  commentAuthorRole: string;
  createdAt: string;
};

type CommentRow = {
  id: string;
  request_id: string;
  comment_text: string;
  comment_author: string;
  comment_author_role: string;
  created_at: string | null;
};

type FormState = {
  requesterName: string;
  requesterDept: RequesterDept;
  country: string;
  destination: string;
  requestType: RequestType;
  reasonForRequest: ReasonForRequest;
  description: string;
  deadline: string;
};

type DestinationGroup = {
  key: string;
  country: string;
  destination: string;
  openTickets: number;
  approvedCount: number;
  inProgressCount: number;
  completedCount: number;
  totalVisibleRequests: number;
  internalScore: number;
  priorityTier: PriorityTier;
  latestDeadline: string;
  lastUpdated: string;
};

const REQUESTER_DEPTS: RequesterDept[] = [
  "Portfolio Management",
  "Marketing",
  "Strategic Partnerships",
  "TUI Source Market",
];

const REQUEST_TYPES: RequestType[] = [
  "Destination Expansion",
  "Specific Product Expansion",
  "City Page Optimisation",
  "Venue Page Optimisation",
];

const REASONS: ReasonForRequest[] = [
  "Strategic Partner Requirement",
  "Google Analytics Trend",
  "Unsuitable for Marketing Campaign in current state",
];

const PORTFOLIO_STATUSES: Status[] = ["Submitted", "Approved", "In Progress", "Completed", "Rejected"];

const EMPTY_FORM: FormState = {
  requesterName: "",
  requesterDept: "Portfolio Management",
  country: "",
  destination: "",
  requestType: "Destination Expansion",
  reasonForRequest: "Strategic Partner Requirement",
  description: "",
  deadline: "",
};

const EMPTY_COMMENT = {
  commentAuthor: "",
  commentAuthorRole: "Supply",
  commentText: "",
};

function reasonScore(reason: ReasonForRequest): number {
  if (reason === "Strategic Partner Requirement") return 10;
  if (reason === "Unsuitable for Marketing Campaign in current state") return 8;
  return 7;
}

function requestTypeScore(type: RequestType): number {
  if (type === "Destination Expansion") return 10;
  if (type === "Specific Product Expansion") return 8;
  if (type === "City Page Optimisation") return 6;
  return 5;
}

function requesterDeptScore(dept: RequesterDept): number {
  if (dept === "Strategic Partnerships") return 4;
  if (dept === "Marketing") return 3;
  if (dept === "TUI Source Market") return 3;
  return 2;
}

function deadlineScore(deadline: string): number {
  if (!deadline) return 0;

  const today = new Date();
  const due = new Date(deadline);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / msPerDay);

  if (diffDays <= 7) return 8;
  if (diffDays <= 21) return 5;
  if (diffDays <= 45) return 2;
  return 0;
}

function computePriorityScore(form: FormState): number {
  return (
    reasonScore(form.reasonForRequest) +
    requestTypeScore(form.requestType) +
    requesterDeptScore(form.requesterDept) +
    deadlineScore(form.deadline)
  );
}

function tierFromScore(score: number): PriorityTier {
  if (score >= 20) return "High";
  if (score >= 12) return "Medium";
  return "Low";
}

function formatDate(dateValue: string): string {
  if (!dateValue) return "—";
  return new Date(dateValue).toLocaleDateString("en-GB");
}

function formatDateTime(dateValue: string): string {
  if (!dateValue) return "—";
  return new Date(dateValue).toLocaleString("en-GB");
}

function requestRowToItem(row: RequestRow): RequestItem {
  return {
    id: row.id,
    requesterName: row.requester_name,
    requesterDept: row.requester_dept as RequesterDept,
    country: row.country,
    destination: row.destination,
    requestType: row.request_type as RequestType,
    reasonForRequest: row.reason_for_request as ReasonForRequest,
    description: row.description ?? "",
    deadline: row.deadline ?? "",
    status: row.status as Status,
    priorityScore: row.priority_score,
    priorityTier: row.priority_tier as PriorityTier,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function commentRowToItem(row: CommentRow): CommentItem {
  return {
    id: row.id,
    requestId: row.request_id,
    commentText: row.comment_text,
    commentAuthor: row.comment_author,
    commentAuthorRole: row.comment_author_role,
    createdAt: row.created_at ?? "",
  };
}

function makeDestinationKey(country: string, destination: string): string {
  return `${country.trim().toLowerCase()}__${destination.trim().toLowerCase()}`;
}

function isSupplyVisible(status: Status): boolean {
  return status === "Approved" || status === "In Progress" || status === "Completed";
}

function isOpenSupplyTicket(status: Status): boolean {
  return status === "Approved" || status === "In Progress";
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>("submit");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [portfolioSearch, setPortfolioSearch] = useState<string>("");
  const [supplySearch, setSupplySearch] = useState<string>("");

  const [selectedDestinationKey, setSelectedDestinationKey] = useState<string>("");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");

  const [commentForm, setCommentForm] = useState(EMPTY_COMMENT);

  useEffect(() => {
    void fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedRequestId) {
      void fetchComments(selectedRequestId);
    } else {
      setComments([]);
    }
  }, [selectedRequestId]);

  async function fetchRequests(): Promise<void> {
    setLoadingRequests(true);

    const { data, error } = await supabase
      .from("requests_v2")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      setLoadingRequests(false);
      return;
    }

    const mapped = ((data as RequestRow[] | null) ?? []).map(requestRowToItem);
    setRequests(mapped);

    setLoadingRequests(false);
  }

  async function fetchComments(requestId: string): Promise<void> {
    setLoadingComments(true);

    const { data, error } = await supabase
      .from("request_comments_v2")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
      setLoadingComments(false);
      return;
    }

    const mapped = ((data as CommentRow[] | null) ?? []).map(commentRowToItem);
    setComments(mapped);
    setLoadingComments(false);
  }

  const submittedRequests = useMemo(() => {
    const filtered = requests.filter((r) => r.status === "Submitted");

    if (!portfolioSearch.trim()) return filtered;

    const needle = portfolioSearch.toLowerCase();
    return filtered.filter((r) =>
      `${r.requesterName} ${r.requesterDept} ${r.country} ${r.destination} ${r.requestType} ${r.reasonForRequest}`
        .toLowerCase()
        .includes(needle)
    );
  }, [requests, portfolioSearch]);

  const destinationGroups = useMemo(() => {
    const visible = requests.filter((r) => isSupplyVisible(r.status));

    const grouped: Record<string, DestinationGroup> = {};

    visible.forEach((request) => {
      const key = makeDestinationKey(request.country, request.destination);

      if (!grouped[key]) {
        grouped[key] = {
          key,
          country: request.country,
          destination: request.destination,
          openTickets: 0,
          approvedCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          totalVisibleRequests: 0,
          internalScore: 0,
          priorityTier: "Low",
          latestDeadline: "",
          lastUpdated: request.updatedAt || request.createdAt,
        };
      }

      const group = grouped[key];
      group.totalVisibleRequests += 1;

      if (request.status === "Approved") group.approvedCount += 1;
      if (request.status === "In Progress") group.inProgressCount += 1;
      if (request.status === "Completed") group.completedCount += 1;

      if (isOpenSupplyTicket(request.status)) {
        group.openTickets += 1;
        group.internalScore += request.priorityScore;

        if (!group.latestDeadline || (request.deadline && request.deadline < group.latestDeadline)) {
          group.latestDeadline = request.deadline;
        }
      }

      const requestUpdated = request.updatedAt || request.createdAt;
      if (requestUpdated > group.lastUpdated) {
        group.lastUpdated = requestUpdated;
      }
    });

    return Object.values(grouped)
      .map((group) => ({
        ...group,
        priorityTier: tierFromScore(group.internalScore),
      }))
      .filter((group) => {
        if (!supplySearch.trim()) return true;
        const needle = supplySearch.toLowerCase();
        return `${group.country} ${group.destination}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        if (b.internalScore !== a.internalScore) return b.internalScore - a.internalScore;
        return b.openTickets - a.openTickets;
      });
  }, [requests, supplySearch]);

  const selectedDestination = destinationGroups.find((d) => d.key === selectedDestinationKey) ?? null;

  const selectedDestinationRequests = useMemo(() => {
    if (!selectedDestination) return [];

    return requests
      .filter(
        (r) =>
          makeDestinationKey(r.country, r.destination) === selectedDestination.key &&
          isSupplyVisible(r.status)
      )
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [requests, selectedDestination]);

  const selectedRequest =
    selectedDestinationRequests.find((r) => r.id === selectedRequestId) ?? selectedDestinationRequests[0] ?? null;

  useEffect(() => {
    if (selectedDestinationRequests.length > 0) {
      const exists = selectedDestinationRequests.some((r) => r.id === selectedRequestId);
      if (!exists) {
        setSelectedRequestId(selectedDestinationRequests[0].id);
      }
    } else {
      setSelectedRequestId("");
    }
  }, [selectedDestinationRequests, selectedRequestId]);

  async function submitRequest(): Promise<void> {
    if (
      !form.requesterName.trim() ||
      !form.country.trim() ||
      !form.destination.trim() ||
      !form.deadline.trim()
    ) {
      window.alert("Please complete requester name, country, destination and deadline.");
      return;
    }

    const priorityScore = computePriorityScore(form);
    const priorityTier = tierFromScore(priorityScore);
    const timestamp = new Date().toISOString();
    const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

    const payload = {
      id: requestId,
      requester_name: form.requesterName,
      requester_dept: form.requesterDept,
      country: form.country.trim(),
      destination: form.destination.trim(),
      request_type: form.requestType,
      reason_for_request: form.reasonForRequest,
      description: form.description,
      deadline: form.deadline,
      status: "Submitted",
      priority_score: priorityScore,
      priority_tier: priorityTier,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const { error } = await supabase.from("requests_v2").insert([payload]);

    if (error) {
      console.error("Error submitting request:", error);
      window.alert("Could not submit request.");
      return;
    }

    setForm(EMPTY_FORM);
    await fetchRequests();
    setActiveView("portfolio");
  }

  async function updateRequestStatus(requestId: string, nextStatus: Status): Promise<void> {
    const { error } = await supabase
      .from("requests_v2")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      console.error("Error updating request status:", error);
      window.alert("Could not update status.");
      return;
    }

    await fetchRequests();
  }

  async function addComment(): Promise<void> {
    if (!selectedRequest) return;

    if (!commentForm.commentAuthor.trim() || !commentForm.commentText.trim()) {
      window.alert("Please complete comment author and comment text.");
      return;
    }

    const payload = {
      request_id: selectedRequest.id,
      comment_text: commentForm.commentText.trim(),
      comment_author: commentForm.commentAuthor.trim(),
      comment_author_role: commentForm.commentAuthorRole.trim(),
    };

    const { error } = await supabase.from("request_comments_v2").insert([payload]);

    if (error) {
      console.error("Error adding comment:", error);
      window.alert("Could not save comment.");
      return;
    }

    setCommentForm(EMPTY_COMMENT);

    await supabase
      .from("requests_v2")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedRequest.id);

    await fetchRequests();
    await fetchComments(selectedRequest.id);
  }

  function supplyStatusOptions(request: RequestItem): Status[] {
    if (request.status === "Approved") return ["Approved", "In Progress", "Completed"];
    if (request.status === "In Progress") return ["Approved", "In Progress", "Completed"];
    if (request.status === "Completed") return ["Approved", "In Progress", "Completed"];
    return PORTFOLIO_STATUSES;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-title">Supply Pipeline</div>
          <div className="brand-subtitle">One front door. One approval layer. One supply view.</div>
        </div>

        <nav className="nav">
          <button
            className={`nav-button ${activeView === "submit" ? "active" : ""}`}
            onClick={() => setActiveView("submit")}
          >
            Submit Request
          </button>
          <button
            className={`nav-button ${activeView === "portfolio" ? "active" : ""}`}
            onClick={() => setActiveView("portfolio")}
          >
            Portfolio Review
          </button>
          <button
            className={`nav-button ${activeView === "supply" ? "active" : ""}`}
            onClick={() => setActiveView("supply")}
          >
            Supply Dashboard
          </button>
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-card-title">Pilot logic</div>
          <p>
            Supply sees destinations as the work view. Portfolio controls approval. Ticket count only reflects
            open cases.
          </p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Supply Request Pipeline</h1>
            <p>TUI-style pilot for shared intake, portfolio approval, and destination-led supply prioritisation.</p>
          </div>
        </header>

        {loadingRequests && (
          <section className="page-section">
            <div className="panel">
              <h2>Loading data</h2>
              <p>Fetching requests from Supabase.</p>
            </div>
          </section>
        )}

        {!loadingRequests && activeView === "submit" && (
          <section className="page-section page-grid two-col">
            <div className="panel">
              <div className="section-title-row">
                <h2>Submit Request</h2>
                <span className="pill neutral">New intake</span>
              </div>

              <div className="form-grid">
                <label>
                  Requester Name
                  <input
                    value={form.requesterName}
                    onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                  />
                </label>

                <label>
                  Requester Dept
                  <select
                    value={form.requesterDept}
                    onChange={(e) =>
                      setForm({ ...form, requesterDept: e.target.value as RequesterDept })
                    }
                  >
                    {REQUESTER_DEPTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Country
                  <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </label>

                <label>
                  Destination
                  <input
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  />
                </label>

                <label>
                  Request Type
                  <select
                    value={form.requestType}
                    onChange={(e) => setForm({ ...form, requestType: e.target.value as RequestType })}
                  >
                    {REQUEST_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Reason for Request
                  <select
                    value={form.reasonForRequest}
                    onChange={(e) =>
                      setForm({ ...form, reasonForRequest: e.target.value as ReasonForRequest })
                    }
                  >
                    {REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="full-width">
                  Description
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>

                <label>
                  Deadline
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  />
                </label>
              </div>

              <div className="button-row">
                <button className="secondary-button" onClick={() => setForm(EMPTY_FORM)}>
                  Clear
                </button>
                <button className="primary-button" onClick={() => void submitRequest()}>
                  Submit
                </button>
              </div>
            </div>

            <div className="panel light-panel">
              <div className="section-title-row">
                <h2>Scoring Preview</h2>
                <span className={`pill ${tierFromScore(computePriorityScore(form)).toLowerCase()}`}>
                  {tierFromScore(computePriorityScore(form))}
                </span>
              </div>

              <div className="score-card">
                <div className="score-number">{computePriorityScore(form)}</div>
                <div className="score-label">Internal priority score</div>
              </div>

              <div className="info-list">
                <div className="info-item">
                  <strong>Reason</strong>
                  <span>{reasonScore(form.reasonForRequest)}</span>
                </div>
                <div className="info-item">
                  <strong>Request Type</strong>
                  <span>{requestTypeScore(form.requestType)}</span>
                </div>
                <div className="info-item">
                  <strong>Requester Dept</strong>
                  <span>{requesterDeptScore(form.requesterDept)}</span>
                </div>
                <div className="info-item">
                  <strong>Deadline Urgency</strong>
                  <span>{deadlineScore(form.deadline)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {!loadingRequests && activeView === "portfolio" && (
          <section className="page-section">
            <div className="panel">
              <div className="section-title-row stacked-mobile">
                <div>
                  <h2>Portfolio Review</h2>
                  <p className="muted">Approve or reject submitted requests before they enter the supply dashboard.</p>
                </div>

                <div className="toolbar">
                  <input
                    className="search-input"
                    placeholder="Search submitted requests"
                    value={portfolioSearch}
                    onChange={(e) => setPortfolioSearch(e.target.value)}
                  />
                  <span className="pill neutral">{submittedRequests.length} submitted</span>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Dept</th>
                      <th>Country</th>
                      <th>Destination</th>
                      <th>Type</th>
                      <th>Reason</th>
                      <th>Deadline</th>
                      <th>Tier</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittedRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.requesterName}</td>
                        <td>{request.requesterDept}</td>
                        <td>{request.country}</td>
                        <td>{request.destination}</td>
                        <td>{request.requestType}</td>
                        <td>{request.reasonForRequest}</td>
                        <td>{formatDate(request.deadline)}</td>
                        <td>
                          <span className={`pill ${request.priorityTier.toLowerCase()}`}>{request.priorityTier}</span>
                        </td>
                        <td>{request.priorityScore}</td>
                        <td>{request.status}</td>
                        <td>
                          <div className="inline-actions">
                            <button
                              className="primary-button small-button"
                              onClick={() => void updateRequestStatus(request.id, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              className="danger-button small-button"
                              onClick={() => void updateRequestStatus(request.id, "Rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {submittedRequests.length === 0 && (
                      <tr>
                        <td colSpan={11} className="empty-cell">
                          No submitted requests waiting for review.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {!loadingRequests && activeView === "supply" && (
          <section className="page-section page-grid supply-layout">
            <div className="panel">
              <div className="section-title-row stacked-mobile">
                <div>
                  <h2>Supply Dashboard</h2>
                  <p className="muted">
                    Destination-led view of approved work. Open ticket count falls as requests move to completed.
                  </p>
                </div>

                <div className="toolbar">
                  <input
                    className="search-input"
                    placeholder="Search destination or country"
                    value={supplySearch}
                    onChange={(e) => setSupplySearch(e.target.value)}
                  />
                  <span className="pill neutral">{destinationGroups.length} destinations</span>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Country</th>
                      <th>Destination</th>
                      <th>Open Tickets</th>
                      <th>Approved</th>
                      <th>In Progress</th>
                      <th>Completed</th>
                      <th>Tier</th>
                      <th>Internal Score</th>
                      <th>Latest Deadline</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {destinationGroups.map((group) => (
                      <tr
                        key={group.key}
                        className={selectedDestinationKey === group.key ? "selected-row" : ""}
                        onClick={() => setSelectedDestinationKey(group.key)}
                      >
                        <td>{group.country}</td>
                        <td>{group.destination}</td>
                        <td>{group.openTickets}</td>
                        <td>{group.approvedCount}</td>
                        <td>{group.inProgressCount}</td>
                        <td>{group.completedCount}</td>
                        <td>
                          <span className={`pill ${group.priorityTier.toLowerCase()}`}>{group.priorityTier}</span>
                        </td>
                        <td>{group.internalScore}</td>
                        <td>{formatDate(group.latestDeadline)}</td>
                        <td>{formatDateTime(group.lastUpdated)}</td>
                      </tr>
                    ))}

                    {destinationGroups.length === 0 && (
                      <tr>
                        <td colSpan={10} className="empty-cell">
                          No approved supply destinations yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel detail-panel">
              {!selectedDestination && (
                <div className="empty-detail">
                  <h3>Select a destination</h3>
                  <p>Choose a destination from the supply dashboard to view underlying requests and comments.</p>
                </div>
              )}

              {selectedDestination && (
                <>
                  <div className="detail-header">
                    <div>
                      <h2>
                        {selectedDestination.destination}, {selectedDestination.country}
                      </h2>
                      <p className="muted">
                        {selectedDestination.openTickets} open tickets · {selectedDestination.totalVisibleRequests} total supply-visible requests
                      </p>
                    </div>

                    <div className="detail-badges">
                      <span className={`pill ${selectedDestination.priorityTier.toLowerCase()}`}>
                        {selectedDestination.priorityTier}
                      </span>
                      <span className="pill neutral">Score {selectedDestination.internalScore}</span>
                    </div>
                  </div>

                  <div className="request-card-list">
                    {selectedDestinationRequests.map((request) => (
                      <button
                        key={request.id}
                        className={`request-card ${selectedRequest?.id === request.id ? "active" : ""}`}
                        onClick={() => setSelectedRequestId(request.id)}
                      >
                        <div className="request-card-top">
                          <strong>{request.requestType}</strong>
                          <span className={`pill ${request.priorityTier.toLowerCase()}`}>{request.priorityTier}</span>
                        </div>
                        <div className="request-card-body">
                          <div>{request.reasonForRequest}</div>
                          <div className="muted-small">
                            {request.requesterDept} · {request.requesterName}
                          </div>
                        </div>
                        <div className="request-card-meta">
                          <span>{request.status}</span>
                          <span>Deadline {formatDate(request.deadline)}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedRequest && (
                    <div className="request-detail-block">
                      <div className="section-title-row">
                        <h3>Request Detail</h3>
                        <span className="pill neutral">{selectedRequest.id}</span>
                      </div>

                      <div className="detail-grid">
                        <div className="detail-box">
                          <span>Requester</span>
                          <strong>{selectedRequest.requesterName}</strong>
                        </div>
                        <div className="detail-box">
                          <span>Dept</span>
                          <strong>{selectedRequest.requesterDept}</strong>
                        </div>
                        <div className="detail-box">
                          <span>Type</span>
                          <strong>{selectedRequest.requestType}</strong>
                        </div>
                        <div className="detail-box">
                          <span>Reason</span>
                          <strong>{selectedRequest.reasonForRequest}</strong>
                        </div>
                        <div className="detail-box">
                          <span>Deadline</span>
                          <strong>{formatDate(selectedRequest.deadline)}</strong>
                        </div>
                        <div className="detail-box">
                          <span>Status</span>
                          <strong>{selectedRequest.status}</strong>
                        </div>
                      </div>

                      <div className="description-box">
                        <span>Description</span>
                        <p>{selectedRequest.description || "No description provided."}</p>
                      </div>

                      <div className="status-update-row">
                        <label>
                          Supply status
                          <select
                            value={selectedRequest.status}
                            onChange={(e) =>
                              void updateRequestStatus(selectedRequest.id, e.target.value as Status)
                            }
                          >
                            {supplyStatusOptions(selectedRequest).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="comments-block">
                        <div className="section-title-row">
                          <h3>Comments & Updates</h3>
                          <span className="pill neutral">{comments.length} entries</span>
                        </div>

                        <div className="comment-form">
                          <label>
                            Author
                            <input
                              value={commentForm.commentAuthor}
                              onChange={(e) =>
                                setCommentForm({ ...commentForm, commentAuthor: e.target.value })
                              }
                            />
                          </label>

                          <label>
                            Role
                            <select
                              value={commentForm.commentAuthorRole}
                              onChange={(e) =>
                                setCommentForm({ ...commentForm, commentAuthorRole: e.target.value })
                              }
                            >
                              <option value="Supply">Supply</option>
                              <option value="Portfolio Management">Portfolio Management</option>
                              <option value="Marketing">Marketing</option>
                              <option value="Strategic Partnerships">Strategic Partnerships</option>
                              <option value="TUI Source Market">TUI Source Market</option>
                            </select>
                          </label>

                          <label className="full-width">
                            Comment
                            <textarea
                              rows={4}
                              value={commentForm.commentText}
                              onChange={(e) =>
                                setCommentForm({ ...commentForm, commentText: e.target.value })
                              }
                            />
                          </label>

                          <div className="button-row">
                            <button className="primary-button" onClick={() => void addComment()}>
                              Add Comment
                            </button>
                          </div>
                        </div>

                        <div className="comment-log">
                          {loadingComments && <p className="muted">Loading comments...</p>}

                          {!loadingComments && comments.length === 0 && (
                            <p className="muted">No comments added yet.</p>
                          )}

                          {!loadingComments &&
                            comments.map((comment) => (
                              <div key={comment.id} className="comment-entry">
                                <div className="comment-entry-top">
                                  <strong>{comment.commentAuthor}</strong>
                                  <span className="pill neutral small-pill">{comment.commentAuthorRole}</span>
                                </div>
                                <p>{comment.commentText}</p>
                                <div className="comment-time">{formatDateTime(comment.createdAt)}</div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
