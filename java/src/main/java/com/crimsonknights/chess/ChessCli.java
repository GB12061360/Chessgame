package com.crimsonknights.chess;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Locale;

/**
 * Simple command line interface for playing chess with the {@link CrimsonChess} engine.
 */
public final class ChessCli {
    private ChessCli() {
    }

    public static void main(String[] args) throws IOException {
        CrimsonChess game = new CrimsonChess();
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        System.out.println("Crimson Knights Chess (Java Edition)");
        System.out.println("Enter moves in coordinate notation (e2e4). Type 'reset' or 'exit'.");

        while (true) {
            printBoard(game);
            System.out.print(game.getTurn().name().toLowerCase(Locale.ROOT) + " to move > ");
            String line = reader.readLine();
            if (line == null) {
                break;
            }
            line = line.trim().toLowerCase(Locale.ROOT);
            if (line.isEmpty()) {
                continue;
            }
            if ("exit".equals(line) || "quit".equals(line)) {
                break;
            }
            if ("reset".equals(line)) {
                game.reset();
                continue;
            }
            if ("undo".equals(line)) {
                if (game.undo() == null) {
                    System.out.println("Nothing to undo.");
                }
                continue;
            }
            if (line.length() < 4) {
                System.out.println("Please enter moves like e2e4 or g7g8q for promotion.");
                continue;
            }
            String from = line.substring(0, 2);
            String to = line.substring(2, 4);
            Character promotion = line.length() >= 5 ? line.charAt(4) : null;
            MoveRecord result = game.makeMove(from, to, promotion);
            if (result == null) {
                System.out.println("Illegal move, try again.");
                continue;
            }
            System.out.println(result.getNotation());
            if (result.isCheckmate()) {
                System.out.println("Checkmate! " + result.getColor().name().toLowerCase(Locale.ROOT) + " wins.");
                game.reset();
            } else if (result.isDraw()) {
                System.out.println("Draw by " + result.getDrawReason() + ".");
                game.reset();
            }
        }
        System.out.println("Goodbye.");
    }

    private static void printBoard(CrimsonChess game) {
        Piece[][] board = game.exportBoard();
        System.out.println("  +------------------------+");
        for (int rank = 0; rank < 8; rank++) {
            StringBuilder line = new StringBuilder();
            line.append(8 - rank).append(' ').append('|');
            for (int file = 0; file < 8; file++) {
                Piece piece = board[rank][file];
                if (piece == null) {
                    line.append(" . ");
                } else {
                    line.append(' ').append(game.getPieceSymbol(piece.getType(), piece.getColor())).append(' ');
                }
            }
            line.append('|');
            System.out.println(line);
        }
        System.out.println("  +------------------------+");
        System.out.println("    a  b  c  d  e  f  g  h");
    }
}
