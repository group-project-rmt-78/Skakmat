import socket from "../constant/socket";
import { useEffect, useState } from "react";

export default function Home() {

    const [difficulty, setDifficulty] = useState("beginner");

    function startGame() {
        if (!socket.connected) {
            console.log("Socket is not connected");
            return;
        }

        socket.emit("startGame", {
            difficulty: difficulty
        });
    }

    useEffect(() => {

        socket.connect();

        socket.on("connect", () => {
            console.log("Connected:", socket.id);
        });

        socket.on("gameStarted", (data) => {
            console.log("Game started!");
            console.log("Difficulty:", data.difficulty);
            console.log("Chessboard:", data.board);
            console.log("FEN:", data.fen);

        });

        socket.on("gameError", (data) => {
            console.log("Error:", data.message);
        });

        return () => {
            socket.off("connect");
            socket.off("gameStarted");
            socket.off("gameError");
        };

    }, []);

    return (
        // hanya untuk test jalan atau tidak
        <div className="flex flex-col justify-center items-center gap-4">

            <h1>Chess Game</h1>

            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
            </select>

            <button onClick={startGame}>
                Start Game
            </button>
        </div>
    );
}