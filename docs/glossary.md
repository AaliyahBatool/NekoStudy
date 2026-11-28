# UI glossary

NekoStudy uses a friendly study-space vocabulary in user-facing text.

| Technical concept | UI wording  |
| ----------------- | ----------- |
| room              | cottage     |
| member            | neighbour   |
| invite link       | door key    |
| scene             | window view |
| break             | tea break   |

## Implementation rules

- These mappings apply to UI wording only.
- Code identifiers, API routes, database tables, and socket events retain their technical names.
- Room routes remain `/rooms/:id`; socket events remain `room:*`.
- All user-facing UI copy should be centralized in `apps/web/src/copy.ts`.
- Use plain wording for validation errors, Save, Cancel, Delete, and accessibility labels where clarity requires it.
- Other terms such as host, agenda, chat, notes, streak, and stats retain their ordinary wording.
