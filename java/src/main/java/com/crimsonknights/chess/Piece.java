package com.crimsonknights.chess;

import java.util.Objects;

/**
 * Represents a chess piece.
 */
public final class Piece {
    private final PieceType type;
    private final PieceColor color;

    public Piece(PieceType type, PieceColor color) {
        this.type = Objects.requireNonNull(type, "type");
        this.color = Objects.requireNonNull(color, "color");
    }

    public PieceType getType() {
        return type;
    }

    public PieceColor getColor() {
        return color;
    }

    public Piece copy() {
        return new Piece(type, color);
    }
}
