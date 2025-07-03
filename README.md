# A Sharebite Django Playground

## Quickstart guide
- Ensure you have docker on your machine (`brew install --cask docker` will do it on macOS if you use homebrew)
- Clone this repo locally
- Run `docker compose up`
- Run `docker compose run api ./scripts/init.sh`

Now you can view the site at `http://localhost:8080`
And the admin site at `http://localhost:8080/admin` with the username `admin` and the password `Password123!` (or whatever you set in your `.env` file)

![Sharebite LITE Screenshot](screenshots/homepage.png)

## Cleanup
You can remove your containers and networks with `docker compose down --remove-orphans`

You can reset the database by:
- deleting your local volume `rm -rf ~/DockerDB/mysql-playground/8.0`
- running the reset script while the project is running `docker compose run api ./scripts/reinit.sh`