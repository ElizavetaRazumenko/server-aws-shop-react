###########################
# LOCAL DEVELOPMENT SETUP
FROM --platform=linux/amd64 node:18-alpine As development

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files to the container
# The wildcard ensures both files are copied, if they exist
# This helps avoid redundant npm installs on every code modification
COPY --chown=node:node package*.json ./

# Install the necessary dependencies using `npm ci` for a clean setup
RUN npm ci

# Copy the rest of the application code to the working directory
COPY --chown=node:node . .

# Switch to a non-root user for improved security
USER node

##########################
# PRODUCTION BUILD STAGE
FROM --platform=linux/amd64 node:18-alpine As build

# Set the working directory for the build process
WORKDIR /usr/src/app

# Copy package.json and package-lock.json for installing dependencies
COPY --chown=node:node package*.json ./

# Leverage the `node_modules` from the previous development stage
# This allows us to run the build process with all required dependencies
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

# Copy the entire application code to the working directory
COPY --chown=node:node . .

# Execute the build process to create the production bundle
RUN npm run build

# Define the environment as production
ENV NODE_ENV production

# Install only production dependencies and clean the npm cache
RUN npm ci --only=production && npm cache clean --force

# Continue using a non-root user
USER node

################
# FINAL PRODUCTION IMAGE
FROM --platform=linux/amd64 node:18-alpine As production

# Copy the built application from the build stage
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 4000

# Run the production server
CMD [ "node", "dist/main.js" ]
