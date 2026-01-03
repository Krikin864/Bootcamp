| table_name    | column_name       | data_type                |
| ------------- | ----------------- | ------------------------ |
| Opportunities | required_skill_id | uuid                     |
| user_skills   | user_id           | uuid                     |
| user_skills   | skill_id          | uuid                     |
| user_skills   | created_at        | timestamp with time zone |
| Clients       | id                | uuid                     |
| Clients       | created_at        | timestamp with time zone |
| Opportunities | id                | uuid                     |
| Opportunities | client_id         | uuid                     |
| Opportunities | assigned_user_id  | uuid                     |
| Opportunities | created_at        | timestamp with time zone |
| Profiles      | id                | uuid                     |
| Profiles      | created_at        | timestamp with time zone |
| Skills        | id                | uuid                     |
| Skills        | created_at        | timestamp with time zone |
| user_skills   | id                | uuid                     |
| Profiles      | full_name         | text                     |
| Profiles      | role              | text                     |
| Profiles      | email             | text                     |
| Opportunities | status            | text                     |
| Opportunities | original_message  | text                     |
| Skills        | name              | text                     |
| Clients       | name              | text                     |
| Clients       | company           | text                     |
| Opportunities | ai_summary        | text                     |
| Opportunities | urgency           | text                     |