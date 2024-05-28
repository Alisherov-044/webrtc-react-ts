import http from "http";
import express from "express";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
    },
});

io.on("connect", (socket) => {
    console.log(socket.id);

    socket.on("call", (data) => {
        socket.broadcast.emit("call", data);
    });

    socket.on("answer", (data) => {
        socket.broadcast.emit("answer", data);
    });

    socket.on("candidate", (data) => {
        socket.broadcast.emit("candidate", data);
    });
});

server.listen(3000, () =>
    console.log("Server started on http://localhost:3000")
);
