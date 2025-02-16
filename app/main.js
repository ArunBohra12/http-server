const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const HTTP = require("./http");

const getArgValue = (arg) => {
  const args = process.argv;

  let val = "";
  for (let i = 2; i < args.length; i++) {
    if (args[i] === arg) {
      val = args[i + 1];
      break;
    }
  }

  return val;
};

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

const registeredPaths = ["/", "/echo/:text", "/user-agent", "/files/:filename"];
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
  const matchedHeaderLine = headers.find(
    (header) => header.split(":")[0].toLowerCase() === headerToGet.toLowerCase()
  );

  return matchedHeaderLine.split(":")[1].trim();
};

const getFile = (fileName) => {
  const dir = getArgValue("--directory");
  console.log(dir);
  if (!dir || !fileName) return;
  const filePath = path.join(dir, fileName);

  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
  } catch (error) {
    console.error(error);
  }
};

const createFile = (fileName, content) => {
  const dir = getArgValue("--directory");
  if (!dir || !fileName) return;
  const filePath = path.join(dir, fileName);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) console.log(err);
      });
    }
    fs.writeFileSync(filePath, content);

    return true;
  } catch (error) {
    console.log(error);
  }
};

const supportedCompressionSchemes = ["gzip"];

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const reqData = data.toString().split("\r\n");
    const path = reqData[0].split(" ")[1];
    const method = reqData[0].split(" ")[0];
    const reqHeaders = reqData.slice(1, reqData.length - 2);
    const requestBody = reqData.at(-1);
    let responseBody = "";

    const isPathRegistered = matchRegisteredPath(path);
    let statusCode = isPathRegistered ? HTTP.HTTP_OK : HTTP.HTTP_NOT_FOUND;

    const headers = {
      "Content-Type": "text/plain",
      "Content-Length": responseBody.length,
    };

    if (path.indexOf("/echo/") === 0) {
      const text = path.split("/")[2];
      const compressionHeader = getHeader("Accept-Encoding", reqHeaders);

      if (supportedCompressionSchemes.includes(compressionHeader)) {
        setHeader("Content-Encoding", compressionHeader, headers);
      }

      responseBody += text;
    }

    if (path === "/user-agent") {
      const userAgentHeader = getHeader("User-Agent", reqHeaders);
      responseBody += userAgentHeader;
      setHeader("User-Agent", userAgentHeader, headers);
    }

    if (path.indexOf("/files") === 0) {
      const fileName = path.split("/")[2];
      if (method === "GET") {
        const file = getFile(fileName);
        if (!file) {
          statusCode = HTTP.HTTP_NOT_FOUND;
        } else {
          statusCode = HTTP.HTTP_OK;
          responseBody += file.toString();
          setHeader("Content-Type", "application/octet-stream", headers);
        }
      } else if (method === "POST") {
        try {
          createFile(fileName, requestBody);
          statusCode = HTTP.HTTP_CREATED;
          setHeader("Content-Type", "application/octet-stream", headers);
          responseBody = requestBody;
        } catch (error) {
          statusCode = HTTP.HTTP_INTERNAL_SERVER_ERROR;
          console.error(error);
        }
      }
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
