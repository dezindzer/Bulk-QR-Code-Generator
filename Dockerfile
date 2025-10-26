# 1. Use an official lightweight Nginx image as the base
# Nginx is an excellent, high-performance web server for static content.
# We use 'alpine' for a smaller, more secure image footprint.
FROM nginx:alpine

# 2. Copy the static files into the default Nginx web root directory
# IMPORTANT: Ensure your index.html, style.css, and app.js are in the same directory as this Dockerfile.
# The default path where Nginx looks for files is /usr/share/nginx/html
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# 3. Expose the port
# Nginx runs on port 80 by default inside the container
EXPOSE 80