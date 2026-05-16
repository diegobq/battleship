# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=24.15.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js"

# Next.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ENV CI="true"

# Install pnpm
ARG PNPM_VERSION=11.1.0
RUN npm install -g pnpm@$PNPM_VERSION


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copy entire source and install dependencies
COPY . .

# Remove any existing node_modules and reinstall
RUN rm -rf node_modules apps/web/node_modules packages/core/node_modules && \
    pnpm install --prod=false

# Clean Next.js cache to avoid stale build issues
RUN rm -rf apps/web/.next

# Build application using pnpm workspace filter
RUN pnpm --filter @battleship/web build


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app/ /app/

# Entrypoint sets up the container.
ENTRYPOINT [ "/app/docker-entrypoint.js" ]

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "pnpm", "--filter", "@battleship/web", "start" ]
