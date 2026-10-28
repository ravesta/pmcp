# Prompt Awal Pemilik (sumber mentah, bukan requirement)

Diterima 2026-10-26 dari pemilik, disimpan apa adanya. Status: sumber mentah. Isi di bawah
belum dikonfirmasi sebagai requirement; semua yang belum jelas dicatat di
`../clarification-log.md`. Instruksi implementasi langsung di dalamnya tidak mengesampingkan
alur Warrior Team (BA → PM → UX/UI → DEV → QA) dan persetujuan pemilik (lihat R-02).

---

# PROJECT: Project Monitoring & Capacity Planning System — BA & QA

## 1. ROLE AND OBJECTIVE

Act as a Senior Business Analyst, Solution Architect, UI/UX Designer, Database Engineer, and Full-Stack Developer.

Your task is to design and implement a functional web application for monitoring projects, managing BA and QA workloads, planning team capacity, tracking project stage deadlines, recording daily activities, and generating management reports.

The application will be used by a Head/Manager responsible for the Business Analyst (BA) and Quality Assurance (QA) teams.

The main business objective is to enable the manager to:

1. Monitor project progress and delivery timelines.
2. Perform workload and capacity planning across BA and QA team members.
3. Identify current assignments, upcoming deadlines, overdue work, and future workload.
4. View the individual history of completed projects and ongoing assignments.
5. Track daily project activities and non-project activities.
6. Identify team members who are overloaded or have available capacity.
7. Generate project, workload, activity, and team performance reports.
8. Make resource allocation decisions based on reliable project and activity data.

Build this as an integrated application with a consistent data model, working business logic, and role-based access control.

Do not build a static prototype. All core features must work end-to-end, including data entry, validation, persistence, filtering, calculations, and reporting.

---

## 2. DEVELOPMENT APPROACH

Before writing code, inspect the existing repository and understand its current state.

### 2.1 Repository inspection

Identify:

- Existing technology stack and framework.
- Project structure and architectural patterns.
- Existing database, ORM, and migration approach.
- Existing authentication and authorization mechanisms.
- Existing UI component library and styling conventions.
- Existing reusable components, utilities, and tests.
- Current implementation status and any incomplete features.

If the repository already contains an application, preserve and extend its existing architecture wherever practical.

Do not replace the existing technology stack, delete existing functionality, or recreate the project from scratch without a clear technical justification.

If the repository is empty, evaluate an appropriate technology stack based on maintainability, security, development effort, deployment requirements, scalability, and compatibility with the team's capabilities. Explain the selected approach briefly before implementing it.

Use established libraries where appropriate. Avoid unnecessary dependencies and premature microservice architecture.

### 2.2 Execution rules

Work as an implementation agent, not merely as an adviser.

After inspecting the repository:

1. Summarize the current state and proposed implementation approach.
2. Define the application architecture and initial data model.
3. Break implementation into manageable phases.
4. Implement the application incrementally.
5. Run relevant tests and checks after each phase.
6. Fix implementation errors rather than leaving known failures unresolved.
7. Update documentation as the implementation progresses.

Do not stop after producing an architecture document or development plan. Continue implementing the application.

Make reasonable decisions when details are unspecified. Document assumptions that materially affect business rules. Do not repeatedly request confirmation for routine implementation decisions.

Do not claim that a feature is complete unless it has been implemented and verified.

---

## 3. USER ROLES AND ACCESS CONTROL

Implement role-based access control.

### 3.1 Manager / Head of BA

The manager can:

- View all BA and QA members.
- View all projects and project stages.
- Create, edit, prioritize, and close projects.
- Assign BA and QA members to projects and work items.
- Set planned dates, deadlines, effort estimates, priorities, and dependencies.
- Monitor project-level and individual-level workloads.
- View Gantt charts, dashboards, queues, and historical records.
- Review and approve submissions where an approval workflow is configured.
- View and report project activity and non-project activity.
- Configure work categories, workflow templates, working hours, holidays, and capacity settings.
- Reallocate assignments when workload exceeds available capacity.
- Export authorized reports.

### 3.2 BA Team Member

A BA can:

- View projects assigned to them.
- View their current assignments, work queue, stage deadlines, and dependencies.
- View their completed project history.
- View their own workload and capacity.
- Record daily activities against projects and stages.
- Record non-project activities.
- Update the status and progress of authorized assignments.
- Maintain activity logs and submit work for review where required.
- View relevant project information and deliverables.

### 3.3 QA Team Member

A QA member has equivalent access for QA-related responsibilities.

They can view their assignments, track test activities, record daily work, update authorized task progress, and review their completed project history.

### 3.4 Authorization requirements

- Team members must not modify another member's work logs or assignments unless explicitly authorized.
- Only authorized users can change project-level settings and team assignments.
- Enforce access rules on the backend, not only by hiding frontend buttons.
- Prevent unauthorized access to restricted data through direct API requests.
- Record important changes in an audit log.

A user may have one or more roles only if the authorization model supports this explicitly and securely.

---

## 4. CORE MODULES

Build the application using the following modules.

### Module A — Dashboard

Provide different dashboards for managers and individual team members.

#### A1. Manager dashboard

Display the following information for a selectable date range:

**Project overview**
- Total active projects.
- Projects completed during the selected period.
- Projects that are overdue.
- Projects approaching their target completion dates.
- Projects that are blocked or at risk.
- Overall progress of active projects.

**Team workload**
- Number of active assignments per BA and QA member.
- Planned workload versus available capacity.
- Actual work hours recorded.
- Remaining estimated effort.
- Members with excessive workload.
- Members with available capacity.
- Distribution of workload between BA and QA.

**Delivery and deadline monitoring**
- Work items due today.
- Work items due within the next 7 days.
- Overdue work items.
- Upcoming project milestones.
- Tasks blocked by dependencies.
- Projects with stages that may threaten the overall delivery date.

**Activity monitoring**
- Recent daily activity records.
- Members who have not recorded activities for a selected working date.
- Planned versus actual effort.
- Project activities versus non-project activities.

Allow the manager to click a dashboard metric to open the corresponding filtered project, task, or activity list.

#### A2. Individual dashboard

Each team member should see:

- My active projects.
- My assigned work items.
- My current queue.
- My upcoming deadlines.
- My overdue work.
- My completed projects.
- My workload for the current week and month.
- My available capacity, where capacity settings are configured.
- My daily activity summary.
- My planned effort versus actual effort.

Use charts and tables where they improve comprehension. Avoid filling the screen with decorative charts that do not support decisions.

### Module B — Project Management

Implement complete project lifecycle management.

Each project should support the following information:

- Project ID, generated uniquely.
- Project name.
- Project description and business objective.
- Requester or business owner.
- Project manager or responsible person, if applicable.
- Project category or type.
- Project priority.
- Project status.
- Planned start date.
- Planned completion date.
- Actual start date.
- Actual completion date.
- Assigned BA members.
- Assigned QA members.
- Estimated effort.
- Actual recorded effort.
- Progress percentage.
- Key milestones.
- Project risks, blockers, and remarks.
- Links or references to relevant documents.
- Created by, created date, last updated by, and last updated date.

Support the following project statuses:

- Draft
- Ready for Planning
- Active
- On Hold
- Completed
- Cancelled

Adapt the list if the existing business context requires additional statuses.

The system must distinguish between a project being completed and individual stages or assignments being completed.

Projects that have been completed or cancelled should remain available in the historical records. Do not permanently delete completed projects merely to remove them from the active dashboard.

Provide search, sorting, filtering, and pagination.

### Module C — Workflow and Project Stage Management

Each project must have a sequence of stages or work items with their own owners, planned dates, deadlines, estimated effort, progress, and status.

The workflow must be configurable. Do not hardcode a single workflow into the application logic.

Provide default workflow templates for BA and QA activities.

#### C1. Example BA workflow template

1. Requirements Intake and Initial Assessment
2. Requirement Analysis
3. Business Rule Definition
4. Requirement Documentation
5. Review and Validation
6. Business/User Confirmation, where applicable
7. Handover to Development or Related Teams
8. Clarification and Implementation Support
9. BA Closure

#### C2. Example QA workflow template

1. Test Scope and Requirement Review
2. Test Planning
3. Test Scenario and Test Case Preparation
4. Test Data and Environment Readiness
5. Test Execution
6. Defect Documentation and Follow-up
7. Retesting and Regression Testing
8. Test Result Review
9. Test Sign-off and Closure

These are default templates, not mandatory workflows. The manager must be able to add, rename, reorder, activate, deactivate, or configure stages according to the actual process.

A project may use multiple workflow templates because BA and QA work may occur in parallel.

#### C3. Stage-level fields

Each stage or work item should support:

- Work item ID.
- Project reference.
- Stage name.
- Team or workstream.
- Assigned member.
- Planned start date.
- Planned end date or due date.
- Actual start date.
- Actual completion date.
- Estimated effort in hours.
- Actual effort in hours, derived from activity logs where appropriate.
- Progress percentage.
- Priority.
- Status.
- Dependencies on other work items.
- Deliverables or completion criteria.
- Notes and blockers.
- Review or approval status, if applicable.

Each stage must have its own due date. The project due date must not be the only deadline available.

The application must identify work items that cannot start because their dependencies have not been completed.

When a due date changes, preserve the change history and the identity of the person making the change.

#### C4. Work item status

Support at least:

- Queued
- Ready
- In Progress
- Blocked
- Under Review
- Completed
- Cancelled

Ensure status transitions are validated and consistent with the configured workflow.

### Module D — Gantt Chart

Gantt visualization is a core feature and must be implemented as a functional project planning tool.

Support two primary views:

**Project Gantt**
- Project timeline.
- Project stages and work items.
- Planned start and finish dates.
- Stage dependencies.
- Completion percentage.
- Milestones.
- Current date marker.
- Overdue work items.
- Blocked stages.

**Team Gantt / Resource Schedule**
- Work items displayed against time.
- Grouping by team member, team, project, or workstream.
- Concurrent assignments for each member.
- Planned assignment periods.
- Upcoming workload conflicts.
- Gaps where no work is planned, without automatically assuming that all such time is available.

Provide:

- Day, week, and month zoom levels.
- Date range filters.
- Project filters.
- BA/QA filters.
- Member filters.
- Status filters.
- Visual indication of overdue and blocked items.
- Navigation to the detailed work item.
- Clear display of overlapping assignments.

The Gantt chart must use persisted project and work item dates. It must not be an illustrative chart with hardcoded bars.

If an approved Gantt library is appropriate, use it rather than manually building a complex chart from scratch.

If the selected library does not support a required feature, document the limitation and implement a practical alternative.

The initial version may use controlled date editing forms rather than drag-and-drop editing. However, all date changes must be saved to the database and validated.

### Module E — Work Queue and Deadline Monitoring

Create a dedicated queue view for each member and a consolidated view for the manager.

The queue must include:

- Queued assignments.
- Ready-to-start assignments.
- Work in progress.
- Work approaching its deadline.
- Overdue work.
- Blocked work.
- Items waiting for review or approval.

Display the following fields:

- Work item.
- Project.
- Stage.
- Assigned member.
- Priority.
- Planned start.
- Due date.
- Remaining estimated effort.
- Current status.
- Dependency or blocker.
- Days remaining or days overdue.

Provide filters by team, member, project, priority, and status.

Default sorting should make overdue and urgent items easy to identify.

For work items with dependencies, clearly distinguish between items that are late and items that cannot yet start because they are waiting for another item.

### Module F — Team Capacity Planning

This module is one of the most important features.

The manager must be able to evaluate whether BA and QA members have enough capacity for current and incoming work.

#### F1. Capacity configuration

Allow the manager to configure:

- Standard working days.
- Working hours per day.
- Holidays.
- Individual leave or absence periods, where authorized.
- Member availability or part-time allocation.
- Planning period.
- Capacity thresholds.

Avoid hardcoding working hours or utilization thresholds.

#### F2. Capacity calculation

For each team member and planning period, calculate:

**Available Capacity**

Available Capacity = Scheduled Working Hours - Non-working Hours and Approved Absences

The implementation must avoid subtracting the same non-working period twice.

**Planned Project Load**

Planned Project Load = Sum of Estimated Hours Allocated to the Member in the Period

**Planned Non-project Load**

Planned Non-project Load = Sum of Planned Hours for Non-project Responsibilities in the Period

**Remaining Capacity**

Remaining Capacity = Available Capacity - Planned Project Load - Planned Non-project Load

**Planned Utilization**

Planned Utilization = Total Planned Work Hours / Available Capacity × 100%

**Actual Utilization**

Actual Utilization = Actual Recorded Work Hours / Available Capacity × 100%

Handle periods with zero available capacity without dividing by zero. Display the result as not applicable or unavailable where appropriate.

Actual activity logs and estimated effort must not be added together as though they represent separate work. They are different measurements of the same work: planned effort versus actual effort.

#### F3. Capacity views

Provide:

- Weekly capacity per team member.
- Monthly capacity per team member.
- Capacity by team: BA and QA.
- Workload by project.
- Planned versus actual hours.
- Remaining capacity.
- Overloaded resources.
- Resources with available capacity.
- Incoming work compared with available capacity.

Use visual indicators for workload states, such as:

- Available Capacity
- Near Capacity
- Over Capacity

Thresholds must be configurable by the manager.

If a member is overloaded, show which assignments and date ranges are causing the overload.

Do not rely exclusively on the number of active assignments. Capacity calculations must consider estimated work hours and their planned time periods.

If hours or dates have not been estimated, flag the assignment as having incomplete planning data. Do not silently treat missing estimates as zero effort.

The manager must be able to compare alternative resource allocations before saving changes where practical.

### Module G — Daily Activity and Work Log

Implement a daily activity entry module that records actual work performed.

Members must be able to record multiple activities on the same day.

Each activity record must support:

- Activity ID.
- Activity date.
- User/member.
- Activity type.
- Related project, if applicable.
- Related work item or stage, if applicable.
- Activity category.
- Description of work performed.
- Start time and end time, where the tracking model uses time intervals.
- Duration in hours.
- Output or deliverable.
- Remarks or blockers.
- Submission status.
- Created and updated timestamps.

Provide two main activity types:

1. Project Activity
2. Non-project Activity

For project activities, require a valid project reference and optionally a work item reference. When applicable, populate the project and work item from the member's active assignments.

For non-project activities, require an appropriate non-project category.

Examples of non-project activities include:

- Department meetings.
- BA/QA governance.
- Documentation and SOP improvement.
- Administrative activities.
- Training and knowledge sharing.
- Production support.
- Internal coordination.
- Other approved departmental responsibilities.

Make the non-project categories configurable.

Members must be able to create, edit, and review their daily activity history according to access rules.

Provide a calendar or daily entry interface to simplify recording activities.

Show a daily summary that separates project hours from non-project hours.

Prevent invalid durations. Detect overlapping time intervals if start and end times are used.

Where daily hours exceed the configured working hours, show a validation warning or require an authorized exception rather than silently accepting inconsistent data.

Allow the manager to view activities across the team, with filters for date, member, project, team, and activity type.

Where useful, support a configurable submission and review process. Submitted or approved records should not be silently overwritten; subsequent corrections must be auditable.

### Module H — Non-project Work Planning

Actual non-project activity logging is not sufficient for capacity planning because unplanned work would otherwise remain invisible until after it happens.

Allow the manager and authorized members to record planned non-project responsibilities.

Each planned responsibility should include:

- Responsibility name.
- Category.
- Assigned member or team.
- Planning period.
- Planned hours.
- Priority.
- Due date, where applicable.
- Status.
- Description.

Examples include recurring department meetings, governance documentation, process improvement, internal assignments, and production support allocations.

Support recurring allocations if appropriate for the selected implementation.

The capacity module must consider planned non-project responsibilities when calculating availability.

When actual non-project work is logged, allow it to be associated with a planned responsibility where applicable. Do not count the planned allocation and its actual realization twice in the same actual-hours calculation.

Keep the concepts distinct:

- Planned responsibility: intended workload used in capacity planning.
- Actual activity: work that has really been performed and recorded.

### Module I — Individual Project History

Every member must have an individual work history page.

Display:

**Current assignments**
- Active projects.
- Assigned stages.
- Work in progress.
- Upcoming deadlines.
- Current blockers.
- Planned effort and actual effort.

**Completed history**
- Completed projects.
- Project role and contribution.
- Stages or work items completed.
- Project start and completion dates.
- Planned and actual effort.
- Key deliverables.
- Relevant completion status.

**Activity history**
- Daily project activities.
- Daily non-project activities.
- Work hours by date and project.
- Historical workload summaries.

A member's history should be based on actual assignment, project participation, and activity records rather than solely on who created the project.

The manager must be able to open the same history for any authorized member.

Historical records must remain accessible when a project is completed, archived, or when a team member is no longer assigned to it.

Support date and project filters.

### Module J — Reports and Export

Implement a report center with filterable reports.

At minimum, provide:

**1. Project Status Report**
- Project list.
- Project owner or responsible person.
- BA and QA assignments.
- Planned and actual dates.
- Current status.
- Progress.
- Overdue stages.
- Delivery risks and blockers.

**2. Workload and Capacity Report**
- Member.
- Team.
- Available capacity.
- Planned project hours.
- Planned non-project hours.
- Actual recorded hours.
- Remaining capacity.
- Utilization.
- Over-capacity indicators.

**3. Daily/Weekly Activity Report**
- Activity date.
- Member.
- Project.
- Work item.
- Activity type.
- Description.
- Hours.
- Deliverable.

**4. Project Effort Report**
- Estimated effort versus actual effort.
- Breakdown by project.
- Breakdown by BA/QA team.
- Breakdown by work item and team member.

**5. Deadline and Overdue Report**
- Overdue stages.
- Days overdue.
- Responsible member.
- Project.
- Blocker or dependency.
- Revised due date, if any.

**6. Completed Project History**
- Completed projects.
- Project participants.
- Completion dates.
- Actual effort.
- Key delivery information.

**7. Member Work History**
- Individual project history.
- Completed assignments.
- Activity logs.
- Total recorded effort for a selected period.

All reports must support relevant date filters, search, sorting, and team/member/project filters.

Provide export to CSV and Excel where supported by the selected technology stack. PDF export may be added if practical and reliable.

Exported data must reflect the same filters as the report currently displayed.

Do not calculate report totals solely from the rows visible on the current page. Totals must be calculated using the complete filtered dataset.

---

## 5. UI/UX REQUIREMENTS

Create a professional internal business application.

The interface should prioritize clarity, efficient data entry, and fast decision-making.

Suggested navigation:

1. Dashboard
2. Projects
3. Gantt Chart
4. Work Queue
5. Capacity Planning
6. Daily Activities
7. Non-project Work
8. Team
9. Project History
10. Reports
11. Settings

Adapt the navigation based on authorization.

Use a consistent design system, reusable components, readable typography, and responsive layouts.

Desktop usage is the primary target, but the application should remain usable on tablets and mobile browsers.

Use tables for detailed data, charts for aggregated insights, and forms for structured entry.

Include:

- Search and filters.
- Sorting and pagination.
- Empty states.
- Loading states.
- Error messages.
- Success feedback.
- Form validation.
- Confirmation for destructive or consequential actions.
- Breadcrumbs or clear navigation where useful.

Users should be able to navigate from a dashboard metric to the underlying records.

Avoid excessive decorative components, placeholder charts, and unnecessary animations.

---

## 6. DATA MODEL AND BUSINESS RULES

Design a normalized data model appropriate to the existing technology stack.

At minimum, evaluate the need for the following entities:

- User
- Role and Permission
- Team
- Team Membership
- Project
- Project Member / Assignment
- Workflow Template
- Workflow Template Stage
- Project Stage / Work Item
- Work Item Dependency
- Milestone
- Daily Activity / Work Log
- Non-project Category
- Planned Non-project Responsibility
- Capacity Configuration
- Working Calendar
- Holiday
- Leave / Availability Period
- Project Risk or Blocker
- Review / Approval Record, where applicable
- Audit Log

Use stable identifiers and explicit relationships.

Avoid storing derived values redundantly unless there is a documented reason and a reliable synchronization strategy.

### Essential business rules

1. Planned dates and actual dates must be stored separately.

2. A project cannot be considered completed while required work items remain incomplete, unless an authorized exception or configured closure rule permits it.

3. Every project stage must have its own deadline where applicable.

4. A completed project must remain available for historical reporting.

5. An actual work log must reference a valid user and must reference a project when the activity type is Project Activity.

6. Project progress must be calculated consistently. Prefer effort-weighted progress when reliable estimated effort exists. If estimates are unavailable, use a clearly documented alternative and indicate that the progress measure is approximate.

7. All workload calculations must use the correct date period. Do not treat all active assignments as though their effort occurs on the same day.

8. Planned workload and actual work logs must remain distinct.

9. Missing estimates must be visible as incomplete planning data.

10. Capacity calculations must account for the working calendar, individual availability, and applicable planned responsibilities.

11. Dependency relationships must not permit circular dependencies.

12. Date changes, assignment changes, status changes, and important corrections must be auditable.

13. Historical project participation must be retained even when assignments change.

14. Time zone handling must be consistent. Use Asia/Jakarta as the default business time zone unless the existing application specifies another configuration.

15. Date-only business fields such as project due dates must not shift to a different calendar date when displayed in another browser time zone.

16. Do not silently delete important business history when a project, work item, or user is deactivated.

17. Backend validation and authorization must apply to all mutations.

---

## 7. TECHNICAL AND NON-FUNCTIONAL REQUIREMENTS

Follow the conventions and tooling of the existing repository.

Implement:

- A persistent database.
- Database migrations or equivalent schema management.
- Backend validation.
- Server-side authorization.
- Consistent error handling.
- Appropriate loading and empty states.
- Search, filtering, and pagination.
- Audit logging for important business changes.
- Unit and integration tests for business-critical logic.
- Tests for capacity calculations and date-boundary cases.
- Tests for role-based access control.
- Tests for work log validation.
- Tests for workflow and dependency rules.
- Tests for report filtering and aggregation where practical.

Use transactions for operations that must update related records consistently.

Use secure authentication appropriate to the application environment. Do not store plaintext passwords or commit credentials, API keys, or production secrets.

Provide an environment configuration example without real secrets.

Avoid unnecessary complexity. Do not add external services, microservices, or messaging infrastructure unless they have a clear business or technical justification.

Ensure that a new developer can run the application using documented setup instructions.

---

## 8. TEST DATA AND DEMONSTRATION

Provide a development-only seed process that creates realistic sample data.

The sample data should include:

- Several BA team members.
- Several QA team members.
- One manager.
- Multiple active projects.
- At least one completed project.
- At least one project with overdue work.
- Projects with both BA and QA assignments.
- A project containing sequential and parallel stages.
- Members with different utilization levels.
- Planned non-project responsibilities.
- Daily activity logs for different dates.

Use sample data to demonstrate:

- Project monitoring.
- Gantt visualization.
- Team capacity calculation.
- Overdue task detection.
- Historical project tracking.
- Daily activity recording.
- Report generation.

Do not use fake hardcoded dashboard metrics as a replacement for real database queries.

Ensure sample data is clearly identified as demonstration data and cannot accidentally be mixed into a production environment.

---

## 9. ACCEPTANCE CRITERIA

The application is not complete until the following scenarios work.

### Scenario 1 — Create and plan a project

The manager creates a project, assigns BA and QA members, defines project dates, configures stages, specifies effort estimates, and sets dependencies.

Expected result:
- The project is saved.
- Its stages appear in the project detail page.
- The assignments appear in the members' queues.
- The dates appear on the Gantt chart.
- Planned effort is reflected in capacity calculations.

### Scenario 2 — Update project progress

A BA or QA member updates an authorized work item, records progress, and completes the work.

Expected result:
- The work item's status and completion data are saved.
- Project progress is recalculated.
- The dashboard and queue reflect the change.
- Actual work history is retained.

### Scenario 3 — Monitor stage deadlines

A stage becomes overdue or approaches its deadline.

Expected result:
- The stage is clearly identified.
- The responsible member and project are visible.
- The item appears in relevant dashboard metrics and overdue reports.
- The manager can navigate directly to the work item.

### Scenario 4 — Evaluate team capacity

The manager assigns estimated work to members across several weeks.

Expected result:
- The application calculates available capacity for each member and period.
- Planned project and non-project work are accounted for.
- Over-capacity periods are highlighted.
- The manager can identify the assignments causing the overload.

### Scenario 5 — Record daily activity

A BA records activity against a project stage. A QA member records a separate non-project activity.

Expected result:
- Both activities are saved with the correct classifications.
- Project and non-project hours are summarized separately.
- Actual effort reports and individual histories are updated.
- The system validates mandatory references and invalid durations.

### Scenario 6 — Review completed project history

A member opens their historical records.

Expected result:
- Completed projects remain visible.
- Project participation, work items, dates, and recorded effort are available.
- Historical data does not disappear when the member is reassigned.

### Scenario 7 — Generate a report

The manager filters the activity report by date range, team, member, and project, then exports it.

Expected result:
- The displayed report contains matching records.
- The exported data uses the same filters.
- Summary totals reflect the complete filtered dataset.

### Scenario 8 — Enforce permissions

A team member attempts to access or modify another member's restricted records.

Expected result:
- Unauthorized operations are rejected by the backend.
- Authorized access continues to work normally.

### Scenario 9 — Preserve history

An authorized user changes a project deadline or assignment.

Expected result:
- The current record reflects the approved change.
- The change is recorded in the audit log.
- Historical information remains accessible according to the audit design.

---

## 10. IMPLEMENTATION PRIORITIES

Implement the application in the following order.

### Phase 1 — Foundation

- Repository inspection.
- Architecture and data model.
- Authentication and authorization.
- Database setup and migrations.
- Team and member management.
- Project CRUD.
- Workflow templates.
- Work items and assignments.

### Phase 2 — Core Monitoring

- Work queue.
- Stage-level due dates.
- Project detail pages.
- Gantt charts.
- Status and progress tracking.
- Dependency and overdue detection.

### Phase 3 — Capacity Planning

- Working calendar.
- Availability and capacity settings.
- Planned non-project responsibilities.
- Capacity calculations.
- Weekly and monthly capacity views.
- Over-capacity alerts.

### Phase 4 — Daily Activities

- Project activity entry.
- Non-project activity entry.
- Daily and weekly summaries.
- Activity history.
- Planned versus actual effort.

### Phase 5 — Dashboard and Reporting

- Manager dashboard.
- Individual dashboard.
- Project history.
- Report center.
- CSV and Excel export.

### Phase 6 — Quality and Production Readiness

- Automated tests.
- Validation and authorization review.
- UI/UX refinement.
- Performance checks.
- Error handling.
- Seed data.
- Setup and user documentation.

You may adjust the implementation sequence to accommodate existing repository dependencies, but preserve the business priorities.

If the entire scope is too large for one implementation pass, deliver a working vertical slice first and continue with the remaining phases. Do not replace unfinished features with non-functional placeholders or mark incomplete modules as complete.

---

## 11. DEFINITION OF DONE

The implementation is considered complete only when:

- The application can be started using documented instructions.
- The database schema and migrations are available.
- Core data can be created, viewed, updated, and retained.
- The main workflows work end-to-end.
- Gantt charts use real persisted records.
- Capacity calculations are based on actual planning inputs and documented rules.
- Daily activity records are connected to the correct users and projects.
- Completed projects remain available in history.
- Reports and exports respect their filters.
- Backend permissions and validations are enforced.
- Automated tests for critical business logic pass.
- No known critical application errors remain unresolved.
- Remaining limitations and incomplete requirements are explicitly documented.

At the end of implementation, provide:

1. A summary of the implemented modules.
2. The final architecture and data model.
3. The files and major components created or modified.
4. Database migration and seed instructions.
5. Application setup and run instructions.
6. Test results.
7. Known limitations or deferred requirements.
8. A clear distinction between features that are implemented, partially implemented, and not yet implemented.

Start by inspecting the repository, then proceed with implementation.
