import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type TData = {
    sdp: RTCSessionDescription;
};

const servers = {
    iceServers: [
        {
            urls: ["stun:stun.l.google.com:19302"],
        },
    ],
};

export function App() {
    const [callObj, setCallObj] = useState<TData | null>(null);
    const [answerObj, setAnswerObj] = useState<TData | null>(null);

    const [typeOfCall, setTypeOfCall] = useState<"call" | "answer" | null>(
        null
    );
    const [gumAccepted, setGumAccepted] = useState<boolean>(false);

    const [pc, setPc] = useState<RTCPeerConnection | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const localVideo = useRef<HTMLVideoElement>(null);
    const remoteVideo = useRef<HTMLVideoElement>(null);

    function call() {
        setTypeOfCall("call");
    }

    function answer() {
        setTypeOfCall("answer");
    }

    useEffect(() => {
        const currentSocket = socket ? socket : io("http://localhost:3000");
        setSocket(currentSocket);
        currentSocket.on("call", (data) => {
            setCallObj(data);
        });
        currentSocket.on("answer", (data) => {
            setAnswerObj(data);
        });
        currentSocket.on("candidate", (data) => {
            if (pc) {
                pc.addIceCandidate(data);
            }
        });
    }, [pc]);

    useEffect(() => {
        if (typeOfCall) {
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    setLocalStream(stream);
                    setGumAccepted(true);
                });
        }
    }, [typeOfCall]);

    useEffect(() => {
        if (pc && localStream) {
            localStream.getTracks().forEach((track) => {
                pc.addTrack(track, localStream);
            });
        }
    }, [pc, localStream]);

    useEffect(() => {
        if (gumAccepted && !pc) {
            const pc = new RTCPeerConnection(servers);
            setPc(pc);
        }
    }, [pc, gumAccepted]);

    useEffect(() => {
        if (pc && socket) {
            if (typeOfCall === "call") {
                pc.createOffer().then((offer) => {
                    pc.setLocalDescription(offer);
                    socket.emit("call", { sdp: offer });
                });
            }

            if (typeOfCall === "answer" && callObj) {
                pc.setRemoteDescription(callObj.sdp);
                pc.createAnswer().then((answer) => {
                    pc.setLocalDescription(answer);
                    socket.emit("answer", { sdp: answer });
                });
            }
        }
    }, [pc, socket, typeOfCall, callObj]);

    useEffect(() => {
        if (pc && answerObj) {
            pc.setRemoteDescription(answerObj.sdp);
        }
    }, [pc, answerObj]);

    useEffect(() => {
        if (pc) {
            pc.onicecandidate = (event) => {
                if (event.candidate && socket) {
                    socket.emit("candidate", event.candidate);
                }
            };
            pc.ontrack = (event) => {
                if (event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };
        }
    }, [pc, socket]);

    useEffect(() => {
        if (localStream && localVideo.current) {
            localVideo.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteStream && remoteVideo.current) {
            remoteVideo.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <main>
            <button onClick={call}>call</button>
            {callObj && <button onClick={answer}>answer</button>}

            <video ref={localVideo} muted autoPlay />
            <video ref={remoteVideo} muted autoPlay />
        </main>
    );
}
