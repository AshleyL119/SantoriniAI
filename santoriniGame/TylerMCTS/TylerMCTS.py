import random
import math
from santoriniGame.pieces import Piece
from .DictBoard import *
from collections import defaultdict

ROWS = 5
COLS = 5
RED = (255, 0, 0)

class Node:
    def __init__(self, board):
        self.board = board.copy()
        self.children = []
        self.visits = 0
        self.wins = 0
        self.parent = None
        self.move = None

    def add_child(self, child_node):
        child_node.parent = self
        self.children.append(child_node)

class TylerMCTS:
    def __init__(self, game, own_color: tuple[int, int, int], opp_color: tuple[int, int, int]):
        self.game = game
        self.own_color = own_color
        self.opp_color = opp_color
        self.root = Node(self.board_to_dict(game.board))

    def board_to_dict(self, old_board):
        dict_board = DictBoard()
        # key is coordinate tuple (0,0) or (2,3) etc
        # value is tuple of (tile level, piece) example: (1, None) or (2, "RED")
        for row in range(ROWS):
            for col in range(COLS):
                tile_level = old_board.get_tile_level(row, col)
                piece = old_board.get_piece(row, col)
                if piece:
                    if piece.color == RED:
                        piece_info = 'RED'
                        dict_board.pieces['RED'].append((row, col))
                    else:
                        piece_info = 'BLUE'
                        dict_board.pieces['BLUE'].append((row, col))
                else:
                    piece_info = None

                dict_board.tiles[(row, col)] = (tile_level, piece_info)

        return dict_board

    def select(self, node):
        # Select node with highest UCT value
        best_child = max(node.children, key=lambda x: (x.wins / x.visits) + (2 * (2 * node.visits) ** 0.5 / x.visits))
        return best_child

    def simulate_move(self, board, move):
        board_copy = board.copy()

        starting_pos, move_pos, build_pos = move

        color = board.tiles[starting_pos][1]  # Second value is the color

        # Update the piece's position in the pieces dict
        board_copy.pieces[color].remove(starting_pos)
        board_copy.pieces[color].append(move_pos)

        # Update the tile states
        board_copy.tiles[starting_pos] = (board.tiles[starting_pos][0], None)  # Clear color from starting position
        board_copy.tiles[move_pos] = (board.tiles[move_pos][0], color)  # Set color to the move position
        board_copy.tiles[build_pos] = (
        board.tiles[build_pos][0] + 1, board.tiles[build_pos][1])  # Increment build level
        if board.tiles[move_pos][0] == 3:
            return board_copy, True
        elif board.tiles[move_pos][0] == 1 or board.tiles[move_pos][0] == 0:
            return board_copy, False
        return board_copy, False

    def expand(self, node):
        # Create children for each possible move and build
        pieces = node.board.pieces[self.own_color]
        for piece in pieces:
            moves = node.board.get_all_moves(piece)
            for move in moves:
                new_board, winner = self.simulate_move(node.board, move)
                if winner:
                    node.wins += 1
                child_node = Node(new_board)
                child_node.move = move
                node.add_append(child_node)

    def simulate(self, node):
        # Simulate by playing random moves until the game ends
        board_copy = node.board.copy()
        while not board_copy.is_game_over(board_copy.pieces[self.own_color], board_copy.pieces[self.opp_color]):
            pieces = board_copy.pieces[self.own_color]
            # Choosing random move
            piece = random.choice(pieces)
            move = random.choice(board_copy.get_all_moves(piece))
            board_copy, winner = self.simulate_move(board_copy, move)
            if winner:
                return 1
        return board_copy.result(board_copy.pieces[self.own_color], board_copy.pieces[self.opp_color])

    def backpropagate(self, node, result):
        # Backpropagate results up the tree
        while node:
            node.visits += 1
            node.wins += result
            result = -result  # Alternate result for opponent
            node = node.parent

    def run_simulation(self):
        # Run one iteration of MCTS
        node = self.root

        # Selection
        while node.children:
            node = self.select(node)

        # Expansion
        if node.visits > 0 and not node.children:
            self.expand(node)

        # Simulation
        if node.children:
            node = random.choice(node.children)
        result = self.simulate(node)

        # Backpropagation
        self.backpropagate(node, result)

    def make_move(self, num_simulations=100):
        # Run MCTS simulations
        for _ in range(num_simulations):
            self.run_simulation()

        # No moves
        if not self.root.children:
            return
        # Select the child with the best win rate and highest visit count
        best_child = max(self.root.children, key=lambda child: (child.wins / child.visits, child.visits))

        action = best_child.move
        if action is None:
            return

        # Unpack the move information
        move_x, move_y = action[1]
        build_x, build_y = action[2]

        # Execute the move on the game board
        piece_row, piece_col = action[0]  # Starting position of the piece
        if self.game.select(piece_row, piece_col):  # Select piece
            self.game._move(move_x, move_y)  # Move piece
            self.game._build(build_x, build_y)  # Build after move

        self.game.selected = None  # Deselect after move and build
