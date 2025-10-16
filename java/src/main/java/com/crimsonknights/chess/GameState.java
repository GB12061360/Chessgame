package com.crimsonknights.chess;

import java.util.EnumMap;
import java.util.Map;

/**
 * Represents a snapshot of the chess game state.
 */
public final class GameState {
    private Piece[][] board;
    private PieceColor turn;
    private Map<PieceColor, CastlingRights> castling;
    private String enPassant;
    private int halfmoveClock;
    private int fullmoveNumber;

    public GameState(Piece[][] board, PieceColor turn, Map<PieceColor, CastlingRights> castling,
                     String enPassant, int halfmoveClock, int fullmoveNumber) {
        this.board = board;
        this.turn = turn;
        this.castling = castling;
        this.enPassant = enPassant;
        this.halfmoveClock = halfmoveClock;
        this.fullmoveNumber = fullmoveNumber;
    }

    public Piece[][] getBoard() {
        return board;
    }

    public void setBoard(Piece[][] board) {
        this.board = board;
    }

    public PieceColor getTurn() {
        return turn;
    }

    public void setTurn(PieceColor turn) {
        this.turn = turn;
    }

    public Map<PieceColor, CastlingRights> getCastling() {
        return castling;
    }

    public void setCastling(Map<PieceColor, CastlingRights> castling) {
        this.castling = castling;
    }

    public String getEnPassant() {
        return enPassant;
    }

    public void setEnPassant(String enPassant) {
        this.enPassant = enPassant;
    }

    public int getHalfmoveClock() {
        return halfmoveClock;
    }

    public void setHalfmoveClock(int halfmoveClock) {
        this.halfmoveClock = halfmoveClock;
    }

    public int getFullmoveNumber() {
        return fullmoveNumber;
    }

    public void setFullmoveNumber(int fullmoveNumber) {
        this.fullmoveNumber = fullmoveNumber;
    }

    public GameState copy() {
        Piece[][] boardCopy = new Piece[8][8];
        for (int rank = 0; rank < 8; rank++) {
            for (int file = 0; file < 8; file++) {
                Piece piece = board[rank][file];
                boardCopy[rank][file] = piece == null ? null : piece.copy();
            }
        }
        Map<PieceColor, CastlingRights> castlingCopy = new EnumMap<>(PieceColor.class);
        for (Map.Entry<PieceColor, CastlingRights> entry : castling.entrySet()) {
            castlingCopy.put(entry.getKey(), entry.getValue().copy());
        }
        return new GameState(boardCopy, turn, castlingCopy, enPassant, halfmoveClock, fullmoveNumber);
    }
}
