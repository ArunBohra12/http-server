const net = require("net");

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    // console.log(data.toString().split("\r\n")[0]);
    const path = data.toString().split(" ")[1];
    const responseStatus = path === "/" ? "200 OK" : "404 NOT Found";
    socket.write(`HTTP/1.1 ${responseStatus}\r\n\r\n`);
  });

  socket.on("close", () => {
    socket.end();
    server.close();
  });
});

server.listen(4221, "localhost");
