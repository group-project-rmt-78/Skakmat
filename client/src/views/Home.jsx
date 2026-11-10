
import socket from "../constant/socket";
import { useEffect } from "react";

export default function Home() {
    function startGame(){
        socket.emit("startGame")
    }

    useEffect(() => {
        socket.connect()
        socket.on("gameStarted", (data) => {
            console.log("Chessboard received:", data.board);
            console.log("FEN:", data.fen);
        })

        return () => {
            socket.off("gameStarted")
            
        }
    }, [])

    return (
        <>

            <div className="flex justify-center items-center">
                <button onClick={startGame} className=" bg-red-400 hover:bg-blue-400">Start game</button>
            </div>

        </>
    )
}