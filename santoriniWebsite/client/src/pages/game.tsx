import { useLocation } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import '../fonts.css';
import {Game} from "../game/game.ts";
import {COLS, ROWS} from "../game/constants.ts";
import {createContext, ReactElement, useContext, useState, useEffect } from "react";
import "./game.css";
import axios from "axios";

const GameContext = createContext<Game>(new Game());

export default function GamePage() {
    const location = useLocation();
    // these are the React buttons for individual spaces in [row][col] indexing
    const { gameId: paramGameId } = useParams<{ gameId: string }>();
    const spaces: ReactElement[][] = [];
    // this is a hack to update the board, since we reuse the same context over, React doesn't push updates
    const [update, forceUpdate] = useState(1);
    
    const game = useContext(GameContext);
    // this is a bounded queue of size 5
    const [instructionHistory, setInstructionHistory] = useState<string[]>([]);
    const [isAI, setIsAI] = useState(false);
    const [bots, setBots] = useState<string[]>([]);
    const [selectedBot, setSelectedBot] = useState<string>("");
    const [_error, setError] = useState<string | null>(null);
    const [gameId, setGameId] = useState<string | null>(paramGameId || null);

    // Fetch bots when the page loads
    useEffect(() => {
        const fetchBots = async () => {
          try {
            const response = await axios.get("http://127.0.0.1:8000/bots");
            setBots(response.data);
            setSelectedBot(response.data[0]);
          } catch (err) {
            console.error("Failed to fetch bots", err);
            setError("Failed to fetch bots. Please try again later.");
          }
        };
        fetchBots();
      }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const mode = params.get("mode");
        const bot = params.get("bot");

        if (mode === "ai" && bot) {
            setIsAI(true);
            setSelectedBot(bot);
            createAIGame(bot).then((id) => id && setGameId(id));
        } 
        else if (mode === "friend") {
            setIsAI(false);
        }
    }, [location]);

    // Fetch game data
    useEffect(() => {
        if (gameId) {
        fetch(`http://127.0.0.1:8000/game/${gameId}`)
            .then((response) => {
            if (!response.ok) throw new Error("Failed to fetch game data");
                return response.json();
            })
            .then((data) => {
                console.log("Fetched game data:", data);
            })
            .catch((error) => console.error("Error fetching game:", error));
        }
    }, [gameId]);

    // Create AI game
    async function createAIGame(botName: string): Promise<string | null> {
        try {
        const response = await axios.put("http://127.0.0.1:8000/game/create", {
            bot: botName,
        });
        if (response.data.gameId) {
            console.log("AI game created:", response.data.gameId);
            return response.data.gameId;
        }
        } catch (err) {
            console.error("Failed to start game", err);
            setError("Failed to start game. Please try again.");
        }
        return null;
    }

  // Update instructions history
  useEffect(() => {
    const newInstruction = game.gameOver
      ? `${game.gameOver} wins!`
      : `${game.turn[0].toUpperCase() + game.turn.substring(1)}'s turn to ${
          game.move ? "move" : "build"
        }`;
    setInstructionHistory((prev) => [newInstruction, ...prev.slice(0, 4)]);
  }, [game.turn, game.move]);

  function InstructionsHistory() {
    return (
      <div className="instructions-history">
        {instructionHistory.map((instruction, index) => (
          <div key={index} className={`instruction ${index === 0 ? "current" : "old"}`}>
            {instruction}
          </div>
        ))}
        <div className="instructions-tip">
          Tip: For each turn, you must click on a tiny square of your color before clicking on the surrounding squares
        </div>
      </div>
    );
  }

  
  function BotSelection() {
    return isAI ? (
        <div>
            <label htmlFor="bot-select">Select Bot:</label>
            <select
                id="bot-select"
                value={selectedBot}
                onChange={(e) => setSelectedBot(e.target.value)}
            >
                {bots.map((bot) => (
                    <option key={bot} value={bot}>
                        {bot}
                    </option>
                ))}
            </select>
            <button
                onClick={() => createAIGame(selectedBot).then((id) => id && setGameId(id))}
            >
                Start Game
            </button>
        </div>
    ) : null;
    }
    <BotSelection />

    function Space({row, col}: {row: number, col: number}) {
        function Piece({row, col}: { row: number, col: number}) {
            const piece = game.board.getPiece(row, col);
            return (
                <div className={`piece ${piece?.color} ${update}`} 
                     style={piece?.color ? {color: piece.color} : {display: "none"}
                     }>&#9632;
                </div>
            );
        }

        return (
            <button className={`game-space game-space-built-${game.board.getTileLevel(row, col)} ${`${row}-${col}` in game.validMoves ? "game-space-valid" : ""} ${update}`} onClick={()=>{
                if (!game.gameOver) {
                     if (!game.select(row, col)) {
                        game.selected = null;
                    }
                    forceUpdate(update+1);
                }
            }}><Piece row={row} col={col}></Piece></button>
        );
    }

    // create the Space elements for each spot in the grid
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            if (!spaces[i]) spaces.push([]);
            spaces[i][j] = <Space key={`${i}-${j}`} row={i} col={j}/>
        }
    }

    // put all the spaces in the same row in a shared div
    const gridded = spaces.map((row, i) => 
    <div className={"game-row"} key={`row-${i}`}>{row}
    </div>);

    return (
        <div className="game-container">
            <div className="game-board">{gridded}</div>
            <div className="instructions-container">
                
                <InstructionsHistory />
                <br />
                <button className="reset-button" onClick={() => {
                    setInstructionHistory([]);
                    game.reset();
                    forceUpdate(update+1)
                }}>Reset</button>
            </div>
        </div>
    );
}
