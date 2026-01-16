1. Product Overview

flowOPS AI is a streamlined web platform that allows businesses to capture client leads, summarize their needs using AI, and suggest the most suitable available team member. The platform automates the understanding of client requirements while keeping the assignment process simple, manual, and actionable.

 
2. Target Goal (3-Week MVP)

Week 1: Core CRUD for Clients, Teams, and Opportunities, plus the Kanban Dashboard skeleton.
Week 2: LLM Integration for text analysis and summarization.
Week 3: Basic skill-based recommendation logic and interactive dashboard UI.

 
3. Success Metrics

Speed: Reduce time to understand a client request from minutes to seconds.
Centralization: All client leads and assignments are in a single source of truth.
Adoption: Users successfully assign leads using AI suggestions at least 70% of the time.

 
4. Scope Definition

In-Scope: Manual lead entry via text or email copy-paste, AI summarization of needs, urgency, and skill tags, manual skill-to-user matching, and a basic Kanban pipeline with columns New, Assigned, and Done.
Out-of-Scope: Live call transcription, calendar or Outlook integration, auto-email drafting, and complex weighted assignment algorithms.
Assumptions and Constraints: Team skill database is maintained manually. AI recommendations are advisory, not mandatory. Users provide input as text only.

 
5. Core Features / Functional Requirements

Simplified Client Management: Form to register a client and opportunity, including a text area for client communication.

AI Opportunity Parsing: AI analyzes the raw client text and returns a structured summary including a one-sentence description, the required skill, and urgency (high, medium, low).

Manual Skill-Based Team Recommendation: Each team member has a list of skill tags. The system filters users by the required skill identified by AI. The manager manually assigns the opportunity from the filtered list.

Basic Kanban Pipeline Dashboard: Visual overview of client opportunities with columns New, Assigned, and Done. Each card shows the client name, AI summary, required skill, assigned team member, and status. Users can filter by urgency, skill, or assigned team member.

 
6. User Flow

The manager pastes client text into the “New Opportunity” screen. AI generates a structured summary with skill and urgency. The system displays a list of employees with matching skills. The manager assigns the lead to a team member, moving the card to “Assigned.” The card progresses to “Done” when work is completed.
 Error handling: If skill data is missing, the system alerts the admin. If no suitable team member is available, the system suggests alternative matches. AI misclassifications can be corrected manually by the manager.

 
7. Technical Requirements (MVP Stack)

Frontend: React or Next.js.
Backend: Node.js or Python for APIs.
AI: OpenAI API (GPT-4o-mini) for text summarization.
Database: PostgreSQL or Supabase.
Deployment: Dockerized with CI/CD pipelines.

 
8. 3-Week Execution Plan

Week 1: Build database, CRUD operations, and Kanban skeleton.
Week 2: Integrate AI for text analysis and summarization.
Week 3: Implement basic skill-matching logic and interactive dashboard UI.

 
9. Metrics & KPIs

Time to parse client text (target: under 10 seconds).
Percentage of opportunities successfully assigned using AI recommendations.
Pipeline completion rate.
Number of opportunities created versus completed.

 
10. Risks & Assumptions

AI latency requires loading indicators in the UI.
AI may misclassify client needs; manual editing is possible.
Scope creep must be avoided; only core MVP features are implemented.
Dependencies include OpenAI API availability and response reliability.

 
11. UX / UI Guidelines

Minimal, modern, and responsive design.
Color palette: Primary Blue (#2D6CDF), Soft White (#F5F6FA), Accent Orange (#FF7A3E), Gray (#B0B3BC).
Kanban cards display client summary, required skill, and assigned user.
Loading indicators during AI processing provide feedback.

 
12. Future Phases

Phase 2: Multi-channel ingestion including email, chat, and call transcripts; automated reminders and notifications; enhanced reporting.
Phase 3: Weighted scoring for team assignments, automatic assignment based on history and performance, predictive opportunity scoring.