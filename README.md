# Node Services

Welcome to the VivaDoc node services. There are 2 node services on top of a shared mongo database which together run
everything needed for the backend of VivaDoc.

### Overview

One of the service is the API, and the other is the GitHub app. Both connect to the same MongoDB database. Both are
written in TypeScript and share a bunch of common utilities. Code specific to the GitHub service is put in `github-app`
and code specific to the `api` in `api/`.

##### API

The API serves up the data needed by the web client. It is a simple API that does not perform much calculation beyond
basic CRUD operations and authentication. It fetches all required data from the shared mongo database.

##### GitHub App

The GitHub app is what actually performs the VivaDoc documentation calculations. It gets pinged from GitHub (through
app listed on the GitHub marketplace) on the relevant webhooks. Once pinged, it parses the relevant git diffs and
webhooks to figure out what documentation needs approval and by whom. It puts this data in the shared mongo database
for the API to serve up. It also sets pull request statuses on GitHub.

### Contributing

If you want to join the project and become a core contributor, the first thing you should do is email me at
`arie@vivadoc.io` - this way we can line up your interests and give you the things you would like most to work on.

##### Install

You will need a few local dependencies first:

- Mongo ~ 3.x
  - When the drivers get updated for 4.x I'll upgrade.
- Node ~ 11.x
- NPM ~ 6.x
- [Antlr4](https://www.antlr.org/)
  - If you're going to write parsers/lexers, you'll want to install antlr4 so you can test out your parsers/lexers
    locally.


```bash
# Installs dependencies for both services.
npm install
```

##### Development

```bash
# Builds the project for both services
npm run build

# Run unit test suite
npm test

# Run the API
# Note the API requires certain environment variables to be set.
#   - refer to src/api/config/index.ts
npm run api-start

# Run the Github app
# Note the GitHub app requires certain environment variables to be set.
#   - refer to src/github-app/config.ts
npm run github-app-start
```

You are going to need to [create a GitHub app](https://github.com/settings/apps) to test your changes in staging, use
the variables from that app (found in the GitHub app settings) to set the environment variables. You will also need to
set the variables in the GitHub app, importantly:
  - User authorization callback URL: http://localhost:8080/oauth_redirect
  - Webhook URL: You can use smee.io to deliver github payloads to your localhost. Generate a url and set it in the
                 GitHub app settings and in your environment variables.
  - Webhook Secret: You choose this, doesn't matter, just set it in your environment variables to match.
  - At the bottom, generate a private key and place it in a location reflected by the `PRIVATE_KEY_PATH` environment
    variable.

##### Production

Currently code is run in production using the `forever` package, you can use the following scripts:


```bash
# Start the API forever.
npm run forever-api-start

# Start the GitHub app forever.
npm run forever-github-app-start
```
