const net = require("net");
const HTTP = require("./http");

const formatHeaders = (headers) => {
  let formattedHeader = "";
  for (const [headerKey, headerValue] of Object.entries(headers)) {
    formattedHeader += `${headerKey}: ${headerValue}\r\n`;
  }
  return formattedHeader;
};

const registeredPaths = ["/", "/echo/:text"];
const matchRegisteredPath = (path) => {
  return registeredPaths.find((currentPath) => currentPath === path);
};

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const path = data.toString().split(" ")[1];
    let responseBody = "";

    const headers = {
      "Content-Type": "text/plain",
      "Content-Length": 3,
    };

    const isPathRegistered = matchRegisteredPath(path);
    const statusCode = isPathRegistered ? HTTP.HTTP_OK : HTTP.HTTP_NOT_FOUND;
    const responseStatus = HTTP.getResponseStatus(statusCode);

    if (path.indexOf("/echo/") === 0) {
      const text = path.split("/")[2];
      responseBody += text;
    }

    const formattedHeaders = formatHeaders(headers);
    socket.write(
      `HTTP/1.1 ${responseStatus}\r\n${formattedHeaders}\r\n\r\n${responseBody}`
    );
  });

  socket.on("close", () => {
    socket.end();
    server.close();
  });
});

server.listen(4221, "localhost");
