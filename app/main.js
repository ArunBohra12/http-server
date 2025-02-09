const net = require("net");
const HTTP = require("./http");

const formatHeaders = (headers) => {
  let formattedHeader = "";
  for (const [headerKey, headerValue] of Object.entries(headers)) {
    formattedHeader += `${headerKey}: ${headerValue}\r\n`;
  }
  return formattedHeader;
};

const setHeader = (headerKey, headerValue, headerObj) => {
  headerObj[headerKey] = headerValue;
};

const registeredPaths = ["/", "/echo/:text", "/user-agent"];
const matchRegisteredPath = (pathToMatch) => {
  return registeredPaths.find((currentPath, i) => {
    const currentPathSplits = currentPath.split("/");
    const pathToMatchSplits = pathToMatch.split("/");

    if (currentPathSplits.length !== pathToMatchSplits.length) return false;

    for (let i = 0; i < pathToMatchSplits.length; i++) {
      if (currentPathSplits[i][0] === ":") continue;
      if (currentPathSplits[i] !== pathToMatchSplits[i]) return false;
    }

    return true;
  });
};

const getHeader = (headerToGet, headers) => {
  return headers.find(
    (header) => header.split(":")[0].toLowerCase() === headerToGet.toLowerCase()
  );
};

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const reqData = data.toString().split("\r\n");
    const path = reqData[0].split(" ")[1];
    const reqHeaders = reqData.slice(1, reqData.length - 2);
    let responseBody = "";

    const isPathRegistered = matchRegisteredPath(path);
    let statusCode = isPathRegistered ? HTTP.HTTP_OK : HTTP.HTTP_NOT_FOUND;

    const headers = {
      "Content-Type": "text/plain",
      "Content-Length": responseBody.length,
    };

    if (path.indexOf("/echo/") === 0) {
      const text = path.split("/")[2];
      responseBody += text;
    }

    if (path === "/user-agent") {
      const userAgentHeader = getHeader("User-Agent", reqHeaders);
      responseBody += userAgentHeader;
      setHeader("User-Agent", userAgentHeader, headers);
    }

    setHeader("Content-Length", responseBody.length, headers);

    const responseStatus = HTTP.getResponseStatus(statusCode);
    const formattedHeaders = formatHeaders(headers);
    socket.write(
      `HTTP/1.1 ${responseStatus}\r\n${formattedHeaders}\r\n${responseBody}`
    );
  });

  socket.on("close", () => socket.end());
  socket.on("error", (err) => console.log(err.message));
});

server.listen(4221, "localhost");
