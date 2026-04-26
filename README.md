
# MRSProject API

## Overview
MRSProject_API is a set of tests and worflow to to test a backend service that provides endpoints for managing project data.
The to-be project itself is an application from project to-be from MoroSystems company and I am not to be considered as author of this project.

### Note
The orginal assignment was related to `/users` endpoints, but the application to-be doesn't provide related endpoints. 
As it was not mentioned that it is something that should be mocked (and meaningful context nor API contract was provided by any follow-up communication), I have covered `/tasks` endpoints instead.

## Testing

### Running Tests

Tests are located in the `tests/api` directory and cover:
- API endpoint validation
- Request/response handling
- Error scenarios
- Data validation

### Test Coverage
**Run smoke test**
- creation of new task
- validation that new task was created
- deletion of this task
```bash
npx playwright test --grep "@smoke"
```

**Run all tests expect of smoke**
- GET /tasks Returns all tasks. Slow service, around 3 seconds
- POST /tasks Creates task with given text, then returns created task
- GET /tasks/completed Returns all completed tasks
- POST /tasks/{id} Updates text of given task, then returns modified task
- DELETE /tasks/{id} Deletes given task
- POST /tasks/{id}/complete Completes given task, then returns modified task
- POST /tasks/{id}/incomplete Incompletes given task, then returns modified task
```bash
npx playwright test --grep-invert "@smoke"
```
**Run all tests**
- all of the above
```bash
npx playwright test 
```
## Workflows
**Worflows are currently not working - TBD if time permits**
### CI/CD Pipeline
GitHub Actions workflows automate testing and deployment:

- **Test Workflow** (`.github/workflows/playwright.yml`)
    - Runs on every pull request and push to main
    - Executes integration tests - responses and content of json DB

## Getting Started

```bash
npm install
npm start
```

## Contributing
Ensure all tests pass before submitting pull requests.
