"""
Agent Reasoning module for GeekBrain AI System (Bonus B).

Implements investigation queries with multi-step reasoning:
1. PLAN — Identify what data is needed
2. GATHER — Collect data from multiple sources (KB, DB, Monitoring API)
3. ANALYZE — Cross-reference and identify issues
4. REPORT — Generate structured investigation report

Usage:
    investigator = InvestigationAgent(orchestrator)
    report = investigator.investigate("Is NotificationSvc in a healthy state?")
"""

import time
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class ReasoningStep:
    """A single reasoning step in the investigation."""
    step_number: int
    action: str  # plan | gather | analyze | report
    description: str
    data_source: str  # KB, Database, Monitoring API, Analysis
    result: str
    duration_ms: float = 0.0


@dataclass
class InvestigationReport:
    """Structured investigation report."""
    query: str
    service_name: str
    current_status: Dict[str, Any] = field(default_factory=dict)
    historical_performance: Dict[str, Any] = field(default_factory=dict)
    issues_found: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    reasoning_steps: List[ReasoningStep] = field(default_factory=list)
    total_time_ms: float = 0.0

    def to_markdown(self) -> str:
        """Format the report as a markdown string for the LLM response."""
        lines = []
        lines.append(f"# 🔍 Investigation Report: {self.service_name}")
        lines.append("")

        # Current Status
        lines.append("## 📊 Current Status")
        if self.current_status:
            for key, val in self.current_status.items():
                lines.append(f"- **{key}**: {val}")
        else:
            lines.append("- No current status data available")
        lines.append("")

        # Historical Performance
        lines.append("## 📈 Historical Performance")
        if self.historical_performance:
            for key, val in self.historical_performance.items():
                lines.append(f"- **{key}**: {val}")
        else:
            lines.append("- No historical data available")
        lines.append("")

        # Issues Found
        lines.append("## ⚠️ Issues Found")
        if self.issues_found:
            for issue in self.issues_found:
                severity = issue.get("severity", "INFO")
                icon = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}.get(severity, "ℹ️")
                lines.append(f"- {icon} **[{severity}]** {issue.get('description', '')}")
                if issue.get("data_source"):
                    lines.append(f"  - *Source: {issue['data_source']}*")
        else:
            lines.append("- ✅ No issues found")
        lines.append("")

        # Recommendations
        lines.append("## 💡 Recommendations")
        if self.recommendations:
            for i, rec in enumerate(self.recommendations, 1):
                lines.append(f"{i}. {rec}")
        else:
            lines.append("- No recommendations at this time")
        lines.append("")

        # Reasoning Steps
        lines.append("## 🧠 Reasoning Steps")
        for step in self.reasoning_steps:
            lines.append(f"**Step {step.step_number} ({step.action.upper()})** — {step.description}")
            lines.append(f"  - Source: {step.data_source} | Time: {step.duration_ms:.0f}ms")
            if step.result:
                result_preview = step.result[:200] + ("..." if len(step.result) > 200 else "")
                lines.append(f"  - Result: {result_preview}")
            lines.append("")

        lines.append(f"---\n*Investigation completed in {self.total_time_ms:.0f}ms*")
        return "\n".join(lines)


class InvestigationAgent:
    """
    Multi-step reasoning agent for investigation queries.

    Given a question like "Is NotificationSvc healthy?", it:
    1. Plans what data to gather
    2. Gathers current metrics, SLA targets, incident history, and KB docs
    3. Analyzes the data for issues
    4. Produces a structured report
    """

    def __init__(self, orchestrator):
        """
        Args:
            orchestrator: Orchestrator instance with rag_pipeline, tool_executor
        """
        self.orchestrator = orchestrator
        self.rag_pipeline = orchestrator.rag_pipeline
        self.tool_executor = orchestrator.tool_executor

    def investigate(self, query: str, service_name: str = None) -> InvestigationReport:
        """
        Run a full investigation for the given query.

        Args:
            query: Investigation question
            service_name: Service to investigate (auto-detected if None)

        Returns:
            InvestigationReport with all findings
        """
        start_time = time.time()
        report = InvestigationReport(query=query, service_name=service_name or "Unknown")

        # Step 1: PLAN — Identify service and data needs
        step_start = time.time()
        if not service_name:
            service_name = self._detect_service(query)
            report.service_name = service_name
        report.reasoning_steps.append(ReasoningStep(
            step_number=1,
            action="plan",
            description=f"Identified service '{service_name}' from query. Planning data collection.",
            data_source="Query Analysis",
            result=f"Will gather: current metrics, SLA targets, incident history, KB documentation",
            duration_ms=(time.time() - step_start) * 1000,
        ))

        # Step 2: GATHER — Collect data from all sources
        # 2a: Current metrics from Monitoring API
        metrics = self._gather_metrics(report, service_name)

        # 2b: SLA targets from Database
        sla_targets = self._gather_sla(report, service_name)

        # 2c: Incident history from Database
        incidents = self._gather_incidents(report, service_name)

        # 2d: KB documentation
        kb_info = self._gather_kb_info(report, service_name)

        # Step 3: ANALYZE — Cross-reference data
        self._analyze(report, service_name, metrics, sla_targets, incidents, kb_info)

        # Step 4: REPORT — Generate recommendations
        self._generate_recommendations(report, metrics, sla_targets, incidents)

        report.total_time_ms = (time.time() - start_time) * 1000
        return report

    # ── Step 2: GATHER methods ─────────────────────────────────────

    def _gather_metrics(self, report: InvestigationReport, service_name: str) -> Dict:
        """Gather current metrics from Monitoring API."""
        step_start = time.time()
        metrics = {}
        try:
            result = self.tool_executor.execute(
                "get_service_metrics", {"service_name": service_name}
            )
            if result.success:
                raw_metrics = result.data or {}
                latency = raw_metrics.get("latency_ms", {})
                p50 = raw_metrics.get("latency_p50_ms", latency.get("p50"))
                p95 = raw_metrics.get("latency_p95_ms", latency.get("p95"))
                p99 = raw_metrics.get("latency_p99_ms", latency.get("p99"))
                error_rate_percent = raw_metrics.get(
                    "error_rate_percent", raw_metrics.get("error_rate")
                )
                metrics = {
                    **raw_metrics,
                    "latency_p50_ms": p50,
                    "latency_p95_ms": p95,
                    "latency_p99_ms": p99,
                    "error_rate_percent": error_rate_percent,
                    "error_rate": (
                        float(error_rate_percent) / 100
                        if error_rate_percent is not None
                        else None
                    ),
                }
                report.current_status = {
                    "Service": service_name,
                    "P50 Latency": f"{p50 if p50 is not None else 'N/A'}ms",
                    "P95 Latency": f"{p95 if p95 is not None else 'N/A'}ms",
                    "P99 Latency": f"{p99 if p99 is not None else 'N/A'}ms",
                    "Error Rate": f"{error_rate_percent if error_rate_percent is not None else 'N/A'}%",
                    "Requests/min": f"{metrics.get('requests_per_minute', 'N/A')}",
                    "Status": metrics.get("status", "unknown"),
                }
            else:
                metrics = {"error": result.error}
        except Exception as e:
            metrics = {"error": str(e)}

        report.reasoning_steps.append(ReasoningStep(
            step_number=2,
            action="gather",
            description=f"Retrieved current metrics for {service_name}",
            data_source="Monitoring API",
            result=json.dumps(metrics, default=str)[:300],
            duration_ms=(time.time() - step_start) * 1000,
        ))
        return metrics

    def _gather_sla(self, report: InvestigationReport, service_name: str) -> Dict:
        """Gather SLA targets from Database."""
        step_start = time.time()
        sla = {}
        try:
            sql = f"SELECT * FROM sla_targets WHERE service='{service_name}'"
            result = self.tool_executor.execute("query_database", {"sql": sql})
            if result.success and isinstance(result.data, list) and len(result.data) > 0:
                sla = result.data[0] if isinstance(result.data[0], dict) else {}
                report.historical_performance["SLA Targets"] = sla
            elif not result.success:
                sla = {"error": result.error}
        except Exception as e:
            sla = {"error": str(e)}

        report.reasoning_steps.append(ReasoningStep(
            step_number=3,
            action="gather",
            description=f"Retrieved SLA targets for {service_name}",
            data_source="Database (sla_targets)",
            result=json.dumps(sla, default=str)[:300],
            duration_ms=(time.time() - step_start) * 1000,
        ))
        return sla

    def _gather_incidents(self, report: InvestigationReport, service_name: str) -> List[Dict]:
        """Gather incident history from Database."""
        step_start = time.time()
        incidents = []
        try:
            result = self.tool_executor.execute(
                "get_incident_history", {"service_name": service_name}
            )
            if result.success and isinstance(result.data, list):
                incidents = result.data
                report.historical_performance["Recent Incidents"] = f"{len(incidents)} incidents found"
                for inc in incidents[:3]:
                    if isinstance(inc, dict):
                        report.historical_performance[f"Incident: {inc.get('date', 'N/A')}"] = (
                            f"{inc.get('severity', 'N/A')} — {inc.get('root_cause', inc.get('description', 'N/A'))}"
                        )
            elif not result.success:
                incidents = [{"error": result.error}]
        except Exception as e:
            incidents = [{"error": str(e)}]

        report.reasoning_steps.append(ReasoningStep(
            step_number=4,
            action="gather",
            description=f"Retrieved incident history for {service_name}",
            data_source="Database (incidents)",
            result=f"{len(incidents)} incidents found",
            duration_ms=(time.time() - step_start) * 1000,
        ))
        return incidents

    def _gather_kb_info(self, report: InvestigationReport, service_name: str) -> str:
        """Gather KB documentation about the service."""
        step_start = time.time()
        kb_info = ""
        try:
            result = self.tool_executor.execute(
                "retrieve_knowledge",
                {
                    "query": f"What is the current status and known issues for {service_name}?",
                    "max_results": 3,
                },
            )
            if result.success:
                chunks = (result.data or {}).get("chunks", [])
                if chunks:
                    kb_info = "\n".join(c.get("text", "") for c in chunks[:3])
                    report.historical_performance["KB Documentation"] = f"{len(chunks)} relevant chunks found"
            else:
                kb_info = f"Error: {result.error}"
        except Exception as e:
            kb_info = f"Error: {e}"

        report.reasoning_steps.append(ReasoningStep(
            step_number=5,
            action="gather",
            description=f"Retrieved KB documentation for {service_name}",
            data_source="Knowledge Base (Bedrock KB)",
            result=kb_info[:200] if kb_info else "No relevant documents found",
            duration_ms=(time.time() - step_start) * 1000,
        ))
        return kb_info

    # ── Step 3: ANALYZE ────────────────────────────────────────────

    def _analyze(self, report: InvestigationReport, service_name: str,
                 metrics: Dict, sla: Dict, incidents: List[Dict], kb_info: str):
        """Analyze gathered data and identify issues."""
        step_start = time.time()
        issues = []

        # Check latency vs SLA
        current_p99 = metrics.get("latency_p99_ms")
        sla_p99 = (
            sla.get("p99_latency_ms")
            or sla.get("latency_p99_target_ms")
            or (sla.get("target") if sla.get("metric") in ("latency_p99_ms", "p99_latency_ms") else None)
        )
        if current_p99 and sla_p99:
            try:
                current_p99 = float(current_p99)
                sla_p99 = float(sla_p99)
                if current_p99 > sla_p99:
                    ratio = current_p99 / sla_p99
                    severity = "CRITICAL" if ratio > 2.0 else "HIGH" if ratio > 1.5 else "MEDIUM"
                    issues.append({
                        "severity": severity,
                        "description": f"P99 latency ({current_p99:.0f}ms) exceeds SLA target ({sla_p99:.0f}ms) by {ratio:.1f}x",
                        "data_source": "Monitoring API vs Database (sla_targets)",
                    })
                else:
                    issues.append({
                        "severity": "LOW",
                        "description": f"P99 latency ({current_p99:.0f}ms) is within SLA target ({sla_p99:.0f}ms) ✅",
                        "data_source": "Monitoring API vs Database (sla_targets)",
                    })
            except (ValueError, TypeError):
                pass

        # Check error rate
        error_rate = metrics.get("error_rate")
        sla_error = sla.get("error_rate_target") or sla.get("max_error_rate")
        if error_rate is not None:
            try:
                error_rate = float(error_rate)
                if error_rate > 0.05:
                    severity = "CRITICAL" if error_rate > 0.15 else "HIGH" if error_rate > 0.10 else "MEDIUM"
                    issues.append({
                        "severity": severity,
                        "description": f"Error rate is {error_rate*100:.1f}% — above acceptable threshold",
                        "data_source": "Monitoring API",
                    })
            except (ValueError, TypeError):
                pass

        # Check service status
        status = metrics.get("status", "unknown")
        if status in ("degraded", "down"):
            issues.append({
                "severity": "CRITICAL" if status == "down" else "HIGH",
                "description": f"Service status is '{status}'",
                "data_source": "Monitoring API",
            })

        # Check recent incidents
        critical_incidents = [i for i in incidents if isinstance(i, dict) and i.get("severity") in ("critical", "high", "P1", "P2")]
        if critical_incidents:
            issues.append({
                "severity": "MEDIUM",
                "description": f"{len(critical_incidents)} critical/high severity incidents in history",
                "data_source": "Database (incidents)",
            })

        report.issues_found = issues

        report.reasoning_steps.append(ReasoningStep(
            step_number=6,
            action="analyze",
            description="Cross-referenced metrics, SLA targets, and incident history",
            data_source="Analysis",
            result=f"Found {len(issues)} items: " + ", ".join(
                f"[{i['severity']}] {i['description'][:50]}" for i in issues
            ),
            duration_ms=(time.time() - step_start) * 1000,
        ))

    # ── Step 4: REPORT ─────────────────────────────────────────────

    def _generate_recommendations(self, report: InvestigationReport,
                                   metrics: Dict, sla: Dict, incidents: List[Dict]):
        """Generate actionable recommendations based on analysis."""
        step_start = time.time()
        recs = []

        critical_issues = [i for i in report.issues_found if i.get("severity") in ("CRITICAL", "HIGH")]

        if critical_issues:
            # Check latency issues
            latency_issues = [i for i in critical_issues if "latency" in i.get("description", "").lower()]
            if latency_issues:
                recs.append("🔧 Investigate root cause of elevated latency — check recent deployments, DB query performance, and downstream dependencies")
                recs.append("📊 Set up latency alerting if not already configured (CloudWatch alarm on P99)")

            # Check error rate issues
            error_issues = [i for i in critical_issues if "error" in i.get("description", "").lower()]
            if error_issues:
                recs.append("🚨 Immediate: Investigate error logs for the service to identify root cause of elevated error rate")
                recs.append("🔄 Consider rolling back the most recent deployment if errors started after a release")

            # Check status issues
            status_issues = [i for i in critical_issues if "status" in i.get("description", "").lower()]
            if status_issues:
                recs.append("🏥 Trigger incident response process — service appears degraded or down")

            recs.append("📋 Schedule postmortem review if issues persist beyond 30 minutes")
        else:
            recs.append("✅ Service appears healthy — continue monitoring")
            recs.append("📈 Consider optimizing latency for better user experience")

        if incidents and len(incidents) > 2:
            recs.append(f"📝 Review {len(incidents)} historical incidents for recurring patterns")

        report.recommendations = recs

        report.reasoning_steps.append(ReasoningStep(
            step_number=7,
            action="report",
            description="Generated recommendations based on analysis",
            data_source="Analysis",
            result=f"{len(recs)} recommendations generated",
            duration_ms=(time.time() - step_start) * 1000,
        ))

    # ── Helpers ─────────────────────────────────────────────────────

    def _detect_service(self, query: str) -> str:
        """Auto-detect service name from query text."""
        known_services = [
            "PaymentGW", "NotificationSvc", "AuthSvc",
            "ReportingSvc", "UserProfileSvc", "TransactionSvc"
        ]
        query_lower = query.lower()
        for svc in known_services:
            if svc.lower() in query_lower:
                return svc
        # Default
        return "NotificationSvc"
