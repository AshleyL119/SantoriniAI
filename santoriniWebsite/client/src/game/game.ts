import React, { useEffect, useState } from 'react';
import { Piece } from './pieces';
import { Board } from './board';
import { Bot } from './bot';
import { BLUE, Color, RED } from './constants';

function GameBoard({ board, handleSquareClick }: { board: Board; handleSquareClick: (row: number, col: number) => void }) {
  const rows = [];

  for (let row = 0; row < board.getRowCount(); row++) {
    const cols = [];
    for (let col = 0; col < board.getColCount(); col++) {
      const tileLevel = board.getTileLevel(row, col);
      const squareElement = React.createElement(
        'div',
        {
          key: `${row}-${col}`,
          className: 'square',
          onClick: () => handleSquareClick(row, col),
        },
        React.createElement('span', {}, `Level ${tileLevel}`)
      );
      cols.push(squareElement);
    }
    rows.push(React.createElement('div', { key: row.toString(), className: 'row' }, ...cols));
  }

  return React.createElement('div', { className: 'board' }, ...rows);
}

const Game: React.FC = () => {
  const [board] = useState(new Board());
  const [instructions, setInstructions] = useState<string[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [currentTurn, setCurrentTurn] = useState<Color>(BLUE);
  const [aiBot] = useState(new Bot(board, RED, BLUE));

  const addInstruction = (instruction: string) => {
    setInstructions((prev) => [instruction, ...prev.slice(0, 9)]);
  };

  const handleSelect = (row: number, col: number) => {
    const piece = board.getPiece(row, col);
    if (piece && piece.color === currentTurn) {
      setSelectedPiece(piece);
      addInstruction(`Selected piece at (${row}, ${col}).`);
    } else {
      setSelectedPiece(null);
      addInstruction(`Invalid selection at (${row}, ${col}).`);
    }
  };

  const handleMove = (row: number, col: number) => {
    if (!selectedPiece) return;

    const validMoves = board.getValidMoves(selectedPiece);
    if (validMoves[`${row}-${col}`]) {
      board.move(selectedPiece, row, col);
      addInstruction(`Moved piece to (${row}, ${col}).`);
      setSelectedPiece(null);
      handleBuildPhase(row, col);
    } else {
      addInstruction(`Invalid move to (${row}, ${col}).`);
    }
  };

  const handleBuildPhase = (row: number, col: number) => {
    const piece = board.getPiece(row, col);
    if (!piece) return;

    const validBuilds = board.getValidBuilds(piece);
    const [firstBuild] = Object.keys(validBuilds);
    if (firstBuild) {
      const [buildRow, buildCol] = firstBuild.split('-').map(Number);
      board.build(buildRow, buildCol);
      addInstruction(`Built at (${buildRow}, ${buildCol}).`);
      setCurrentTurn(currentTurn === BLUE ? RED : BLUE);
    } else {
      addInstruction("No valid builds available.");
    }
  };

  const handleAITurn = () => {
    if (currentTurn === RED) {
      aiBot.makeMove();
      addInstruction("AI has completed its move.");
      setCurrentTurn(BLUE);
    }
  };

  const handleSquareClick = (row: number, col: number) => {
    if (currentTurn === BLUE) {
      if (!selectedPiece) {
        handleSelect(row, col);
      } else {
        handleMove(row, col);
      }
    }
  };

  useEffect(() => {
    if (currentTurn === RED) {
      handleAITurn();
    }
  }, [currentTurn]);

  return React.createElement(
    'div',
    { className: 'game-container' },
    React.createElement(GameBoard, {
      board: board, 
      handleSquareClick: handleSquareClick, 
    }),
    React.createElement('div', null, 'Add any additional components or elements here, such as the instructions history')
  );
}

export default Game;
