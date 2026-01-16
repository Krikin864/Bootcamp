# AI Opportunity and Team Manager

This project is a centralized platform to manage business opportunities and team skills using AI. It is designed to be industry-agnostic, allowing it to adapt to any business model, from software development to local gastronomy services.

## Installation and Setup

Follow these steps in order to set up the development environment:

### 1. Clone the project
~~~
git clone https://github.com/Krikin864/FlowOPS-AI.git
cd FlowOPS-AI


~~~
### 2. Install Dependencies (Two-Step Process)
This project is structured with a clear separation between the data layer and the user interface.

**Step A: Root Directory (Database & Core)**
The root contains the Supabase SDK and core configurations required for database communication.
~~~
npm install
~~~
**Step B: Frontend Directory (User Interface)**
The frontend folder contains the React/Next.js components, icons, and styling.
~~~
cd frontend
npm install
cd ..
~~~
### 3. Environment Variables
Create a file named .env.local in the root of the project. This file is essential for the Supabase connection to work. It must contain:
~~~
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anonymous_key
OPENAI_API_KEY=your_openai_api_key
~~~
## Project Execution

To start the application, you must run the development command from within the frontend folder:
~~~
cd frontend
npm run dev
~~~
The application will be available at: http://localhost:3000

## Architecture Overview

- **Root (Backend/DB Layer)**: Manages the Supabase client singleton, API routes, and OpenAI integration. This ensures secure and centralized data handling.
- **Frontend (UI Layer)**: Handles the Kanban board, the Skill Management modals, and real-time state updates.

## Core Features

### Pipeline Management
- Kanban Board: Visual interface for moving opportunities through workflow stages.
- Opportunities View: A management list for bulk administration and tracking.
- AI Integration: Automated skill extraction from opportunity descriptions.

### Safety and Data Integrity
- Strict Skill Dictionary: AI only maps skills that exist in your database to ensure operational reality.
- Protected Danger Zone: Destructive actions like 'Cancel' or 'Delete' are hidden behind a toggle menu within the opportunity details to prevent accidental data loss.
- Cascade Deletion: Deleting an opportunity automatically removes its associated skill references in the database.

## QA and Maintenance Notes
- Input Normalization: All skills are trimmed and normalized to avoid duplicates.
- Centralized Client: Supabase is initialized in a single root library to be shared across the entire project.
- Sync Safety: Always perform a 'git pull' before pushing if changes were made via the GitHub web interface.
