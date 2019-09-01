Slack Gameshow!
==========================================================

A Gameshow app for Slack that allows you to host a gameshow complete with buzzers
for users and a score tracking system for each user.

# Development Environment Setup

* Clone the repository to a location of your choice:

`git clone https://github.com/dinusha-b14/slack-gameshow.git <path/of/your/choice>`

* Ensure you're using the right version of Node (we recommend using `nvm` to manage node versions)

`nvm use`

* Install `npm` modules:

`npm install`

* Copy the `.env.example` file within the root directory of this application and call it `.env` and populate it with values relevant to your environment.

* Setup the `NODE_ENV` environment within your terminal profile by setting it to `development` (i.e. `.bash_profile`, `.profile`, `.zprofile`):

`export NODE_ENV=development`

This ensures that the `dotenv` package identifies your local environment as a development environment instead of a production one.

* Start the server:

`npm start`

* Visit `localhost:<PORT NUMBER SPECIFIED IN .env>` within your browser.
