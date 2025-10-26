# Bulk QR Code Generator
Multifunctional QR code generator that you can self host using Docker or just run it from a folder


# Docker
To use this setup, place the four files (Dockerfile, index.html, style.css, app.js) in the same folder. Then, use these two commands in your terminal:

1. Build the Image:
`docker build -t QR-image .`

2. Run the Container: (This maps the container's port 80 to your host machine's port 5555 (or change to your liking))
`docker run -d -p 5555:80 --name QR-Generator-Container QR-image`

You can then open your browser and navigate to http://localhost:5555 to see your QR website!
