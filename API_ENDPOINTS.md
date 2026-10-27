# ONS API access map (read-only backend review)

Reviewed from `/Users/thikra/IdeaProjects/ONS/src/main/java/org/example/ons/Config/Configuration.java` and the corresponding Spring controllers. No backend files were changed.

## Endpoints used by the admin page

| Method | Path | Access in Security / controller | UI use |
|---|---|---|---|
| GET | `/api/v1/dashboard/summary` | `ADMIN` | Counts returned by `DashboardService` |
| GET | `/api/v1/dashboard/reports-by-status` | `ADMIN` | Backend report status distribution |
| GET | `/api/v1/dashboard/reports-trend` | `ADMIN` | Available for a later trend chart |
| GET | `/api/v1/dashboard/response-time` | `ADMIN` | Average response minutes |
| GET | `/api/v1/dashboard/resolution-time` | `ADMIN` | Average resolution minutes |
| GET | `/api/v1/campaigns/get` | `ADMIN` | Campaign directory |
| DELETE | `/api/v1/campaigns/delete/{id}` | `ADMIN` | Confirmed campaign deletion |
| GET | `/api/v1/auth/get/all` | `ADMIN` | Accounts and backend-provided roles |
| GET | `/api/v1/pilgrims/get` | `ADMIN` | Pilgrim directory |
| GET | `/report/get` | `ADMIN` in controller | Report directory |

The dashboard response fields are `totalReports`, `openReports`, `assignedReports`, `inProgressReports`, `resolvedReports`, and `cancelledReports`. The report status enum includes `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, and `CANCELLED`; the backend does not use `COMPLETED`.

## Relevant role and endpoint rules

- `ADMIN`: explicit access to dashboard metrics, campaign listing/deletion, all users, pilgrims listing, and admin report operations.
- `AuthorizedStaff`: `/api/v1/authorized-staff/**`; campaign self-profile/update/analytics; accommodation `my-campaign`; pilgrim add/update/delete and search; route access. The staff report list is `GET /api/v1/authorized-staff/staff` and is scoped to the authenticated staff ID. Status-filtered reports use `GET /api/v1/authorized-staff/staff/status/{status}`.
- `FIELDـSTAFF`: route access and report URLs at the Security layer. The report controller further limits report reads/actions to reports assigned to that exact field-staff user. There is no field-staff “my reports” list controller in the reviewed code.
- `ADMIN` and `AuthorizedStaff` can use `GET /api/v1/pilgrims/search?visaNumber=...&fullName=...`; `ADMIN` alone can use `GET /api/v1/pilgrims/get`.
- `GET /api/v1/authorized-staff/get/employees` returns employees for the authenticated supervisor. Employee create/update/delete use `/add/employee`, `/update/employee/{employeeId}`, and `/delete/employee/{employeeId}`; these requests use the current authenticated supervisor and do not take a supervisor ID in the path.
- Staff report actions use `PUT /api/v1/authorized-staff/pilgrims/{pilgrimId}/reports/{reportId}/accept` and `PUT /api/v1/authorized-staff/reports/{reportId}/advance-status`.
- General report URLs are additionally checked inside `AssistanceReportController`: list and administrative operations require `ADMIN`; report detail/history/assignees/notifications are limited to admin, same-campaign staff, or the assigned field-staff user; accept/start/resolve require the assigned staff member (or admin as coded).

## Current backend gaps that constrain the requested pages

- There is no login endpoint in `AuthController`. The frontend now authenticates existing `User` accounts using the backend's configured HTTP Basic mechanism and detects supported roles through their protected endpoints; the credentials stay in memory and are not written to browser storage. Vite's dev proxy removes only the `WWW-Authenticate` challenge header so rejected credentials appear in the app form instead of opening a browser dialog.
- Campaign registration is `POST /api/v1/campaigns/register`; it creates a `Campaign` and opens a registration session, then attempts to create the Moyasar invoice. Campaign is not a `User`, its password is `@JsonIgnore`, and the backend has no campaign login endpoint. Registration and payment can be connected, but the campaign owner cannot sign in until the backend provides that capability.
- There is no `CAMPAIGN_ADMIN` backend authority or campaign-owner-only page API. `GET /api/v1/campaigns/me`, campaign analytics and update require an active `AuthorizedStaff` supervisor. Campaign registration (`POST /api/v1/campaigns/register`) is public, but does not grant a campaign owner authenticated access afterwards.
- No campaign-scoped report-list or pilgrim-list endpoint is available for a campaign-owner account. `get-all` authorized staff is not campaign-scoped and should not be used to populate a campaign page.
- Supervisors can list their own assigned reports and their direct employees, but there is no endpoint to list all reports assigned to their representatives or campaign-wide reports.
- Field staff has no current-user report-list endpoint in the reviewed controller, so the UI cannot safely discover its assignments without adding backend functionality (which is out of scope).
- User activation/deactivation routes exist, but they are not explicitly restricted to `ADMIN` in the reviewed Security matchers; the frontend does not expose them.

## Paths deliberately not called

The frontend previously referenced paths absent from the Controllers, including campaign `GET /get/{id}`, campaign `PUT /update/{id}`, pilgrim `/add/{campaignId}` and `/campaign/{campaignId}`, staff `/get/employees/{supervisorId}` and ID-bearing report paths. Service calls were aligned to actual controller mappings where applicable; unsupported campaign-scoped operations remain unavailable rather than being emulated.
