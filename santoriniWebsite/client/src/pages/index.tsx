import { Link, useNavigate} from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../fonts.css';
import './index.css';

export default function IndexPage() {
    const navigate = useNavigate();
    const [botOptions, setBotOptions] = useState<string[]>([]);
    const [selectedBot, setSelectedBot] = useState<string>("");

     // Fetch bot options from the backend on component mount

    useEffect(() => {
        async function fetchBotOptions() {
            try {
                const response = await fetch("http://127.0.0.1:8000/bots");
                if (!response.ok) {
                    throw new Error("Failed to fetch bot options");
                }
                const data: string[] = await response.json();
                console.log("Fetched bot options:", data);
                setBotOptions(data);
                setSelectedBot(data[0] || ""); 
            } catch (error) {
                console.error("Error fetching bot options:", error);
            } 
        }

        fetchBotOptions();
    }, []);


    async function startAIGame(botName: string) {
        console.log("Selected bot:", botName);
        try {
            const response = await fetch("http://127.0.0.1:8000/game/create", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ bot: botName }), 
            });
    
    
          if (!response.ok) {
            throw new Error("Failed to create game");
          }
    
          const data = await response.json();
    
          if (data.gameId) {
            // Navigate to the Game Page with the gameId in the URL
            navigate(`/game/${data.gameId}`);
          }
        } catch (error) {
          console.error("Error starting AI game:", error);
          alert("Failed to start game. Please try again.");
        }
      }
      
    return (
        
        <div className="index-app">
            <header className="index-app-header">
                <h1>
                    <span className="welcome">Welcome to </span>
                    <span className="santorini">SantoriniAI</span>
                    <span className="welcome"> Board Game!</span>
                </h1>
            </header>

            <div className="game-overview">
                <div className="game-overview-left">
                    <div>
                        <h2><b>Game Overview</b></h2>
                        <p>Santorini is a strategic board game where players to move their workers and construct
                            buildings
                            across the evolving board.
                            The goal is to maneuver your workers to the top of a three-tiered structure. Players can
                            also harness
                            the power of Greek gods,
                            adding unique abilities that influence the flow of the game.
                        </p>
                        <p><Link to="/rules" className="custom-link">Click here to view Rules</Link></p>
                    </div>
                    
                    <div className="button-container">
                        <button onClick={() => navigate("/game?mode=friend")}>Play Against Friend</button>
                        <div className="ai-selection">
                        <label htmlFor="bot-select">Select Bot:</label>
                            <select
                                id="bot-select"
                                value={selectedBot}
                                onChange={(e) => setSelectedBot(e.target.value)} 
                            >
                                {botOptions.map((bot) => (
                                    <option key={bot} value={bot}>
                                        {bot}
                                    </option>
                                ))}
                            </select>
                            <button onClick={() => startAIGame(selectedBot)}>
                                Play Against AI
                            </button>
                        </div>
                    </div>
                </div>
                <div className="game-overview-img">
                    <img src="/board.png" alt="Santorini Game"/>
                </div>
            </div>
        </div>
    );
}