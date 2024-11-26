from typing import Tuple
from typing import List
from uuid import uuid4, UUID
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Response, HTTPException
from pydantic import BaseModel
from santoriniGame.ColbysMiniMax.ColbysMiniMax import ColbysMiniMax
from santoriniGame.TylerMiniMax.TylerMiniMax import TylerMiniMax
from santoriniGame.YaseminsMiniMax.YaseminsMiniMax import YaseminsMiniMax
from santoriniGame.constants import RED, BLUE
from santoriniGame.randombot import RandomBot
from santoriniGame.remotegame import RemoteGame

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Allow your React app to connect
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods like GET, POST, PUT, DELETE
    allow_headers=["*"],  # Allow all headers
)

games: dict[UUID, RemoteGame] = {}
bots = {
    "colby": ColbysMiniMax,
    "random": RandomBot,
    "yasemin": YaseminsMiniMax,
    "tyler": TylerMiniMax
}

class CreateGameRequest(BaseModel):
    bot: str

class GameResponse(BaseModel):
    gameId: str

class Move(BaseModel):
    # the location of the piece that is being acted upon
    piece: Tuple[int, int]
    # where to move the piece (x, y)
    to: Tuple[int, int]
    # where to build
    build: Tuple[int, int]

@app.get("/bots", response_model=List[str])
async def get_bots():
    return ["random", "colby", "tyler", "yasemin"]  

@app.get("/")
async def read_root():
    return {"message": "Welcome to the backend"}

@app.put("/game/create")
async def create_game(request: CreateGameRequest):
    bot_name = request.bot.lower()
    game_id = uuid4()
    bot_type = bots.get(bot_name)
    if bot_type is None:
        raise HTTPException(status_code=404, detail=f"Bot '{bot_name}' not found")
    
    game = RemoteGame()
    bot = bot_type(game, RED, BLUE)
    games[game_id] = game

    game.bot = bot
    game_state = {
        "gameId": game_id,
        "bot": request.bot,  
        "state": "waiting",  
    }
    
    games[game_id] = game_state
    
    return GameResponse(gameId=game_id)

@app.post("/game/{game_id}/move")
async def make_piece_move(game_id: UUID, move: Move):
    game = games.get(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")
    game.select(move.piece[1], move.piece[0])
    game.select(move.to[1], move.to[0])
    game._build(move.build[1], move.build[0])
    game.bot.make_move()
    move = Move(
        piece = (game.last_move_selected.col, game.last_move_selected.row),
        to = (game.last_move_x, game.last_move_y),
        build = (game.last_build_x, game.last_build_y)
    )
    return move

@app.delete("/game/{game_id}")
async def delete_game_board(game_id: UUID):
    games.pop(game_id)
    # return a 204 No Content
    return Response(status_code=204)